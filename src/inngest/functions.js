import { inngest } from "./client";
import Sandbox from "@e2b/code-interpreter";
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "@/prompt";
import { buildFollowUpContext } from "./utils";
import { generateText, runGeminiTurn, textOf } from "./gemini";
import { CODE_AGENT_TOOLS, runTool } from "./tools";
import { closeRunningSteps, describeCall, finishStep, startStep } from "./progress";
import { checkApp, routesToCheck } from "./check-app";

import  db  from "@/lib/db";
import { refundCredits } from "@/lib/usage";

import {
  getLatestFragment,
  getOrCreateChatSandbox,
  getSandboxUrl,
  snapshotFiles,
} from "@/lib/sandbox";

import { MessageRole, MessageType } from "@prisma/client";

// Only the most recent messages are replayed to the agent as context.
const MAX_HISTORY_MESSAGES = 20;
// Upper bound on model turns (each is one model call plus its tool calls).
const MAX_AGENT_TURNS = 25;
// After the agent says it is done, its app is checked for errors; this many fix attempts.
const MAX_FIX_ROUNDS = 2;
// Gemini 3 follows "read the source if unsure" very literally and spends a turn per file.
const EFFICIENCY_NOTE = `
Work efficiently:
- Call several tools in one turn when they are independent (for example, read several files at once).
- The standard shadcn/ui components are installed with their usual API. Only read a component's source when you need a prop or variant you do not know.
- Write the app with createOrUpdateFiles as early as possible, then refine it.`;

/** Stored chat messages as Gemini contents, merging consecutive turns of the same role. */
const toContents = (messages) =>
  messages.reduce((contents, { role, text }) => {
    const last = contents[contents.length - 1];
    if (last?.role === role) last.parts.push({ text });
    else contents.push({ role, parts: [{ text }] });
    return contents;
  }, []);

export const codeAgentFunction = inngest.createFunction(
  {
    id: "code-agent",
    // The Stop button (stopGeneration) sends this; the run ends at its next step.
    cancelOn: [{ event: "code-agent/cancel", if: "async.data.chatId == event.data.chatId" }],
    // Runs once all retries are exhausted: unblock the UI and give the credit back.
    onFailure: async ({ event, step }) => {
      const { chatId, projectId, userId } = event.data.event.data;

      await step.run("write-error-message", async () => {
        if (event.data.run_id) await closeRunningSteps({ runId: event.data.run_id }, "error");
        return await db.message.create({
          data: {
            // Events sent before projects held chats carry projectId; the migration gave
            // each such project a chat with the same id.
            chatId: chatId ?? projectId,
            content: "Generation failed. Your credit has been refunded.",
            role: MessageRole.ASSISTANT,
            type: MessageType.ERROR,
          },
        });
      });

      if (userId) {
        await step.run("refund-credit", async () => {
          return await refundCredits(userId);
        });
      }
    },
  },
  { event: "code-agent/run" },

  async ({ event, step, runId }) => {
    const chatId = event.data.chatId ?? event.data.projectId;

    // The prompt this run answers (the latest message); progress steps hang off it.
    const promptId = await step.run("find-prompt", async () => {
      const last = await db.message.findFirst({ where: { chatId }, orderBy: { createdAt: "desc" }, select: { id: true, role: true } });
      return last?.role === MessageRole.USER ? last.id : null;
    });
    // Progress for the chat UI (skipped for old events whose prompt is not stored).
    const run = { runId, chatId, promptId };
    const start = (key, step) => (promptId ? startStep(run, key, step) : null);
    const finish = (key, status = "done", label) => (promptId ? finishStep(run, key, status, label) : null);

    // When the user pressed Stop, a reply was written after the prompt; save nothing more.
    const wasStopped = async () => {
      const last = await db.message.findFirst({ where: { chatId }, orderBy: { createdAt: "desc" }, select: { id: true } });
      return !!promptId && last?.id !== promptId;
    };

    // Step-1: reuse the chat's sandbox so follow-ups build on the existing code;
    // recreate it from the latest version (or the template's code) if it has expired.
    const sandboxId = await step.run("get-sandbox-id", async () => {
      await start("setup", { kind: "setup", label: "Set up the workspace" });
      const { sandbox } = await getOrCreateChatSandbox(chatId);
      await finish("setup");
      return sandbox.sandboxId;
    });

    // Follow-ups: tell the agent what code is already there so it edits the existing
    // app. Sent as a user message just before the new prompt.
    const followUpContext = await step.run("get-follow-up-context", async () => {
      const fragment = await getLatestFragment(chatId);
      if (!fragment) return "";

      const sandbox = await Sandbox.connect(sandboxId);
      return buildFollowUpContext(await snapshotFiles(sandbox));
    });

    const history = await step.run("get-previous-messages", async () => {
      const messages = await db.message.findMany({
        where: { chatId },
        orderBy: { createdAt: "asc" },
        // Negative take returns the LAST n rows while keeping ascending order.
        take: -MAX_HISTORY_MESSAGES,
      });

      const turns = messages.map((message) => ({
        role: message.role === MessageRole.ASSISTANT ? "model" : "user",
        text: message.content,
      }));

      // The current prompt is the last stored message; put the code context just before it.
      if (followUpContext) {
        turns.splice(Math.max(turns.length - 1, 0), 0, { role: "user", text: followUpContext });
      }
      // Older events may not have stored the prompt yet.
      if (turns.at(-1)?.text !== event.data.value) {
        turns.push({ role: "user", text: event.data.value });
      }

      return turns;
    });

    // Agent loop: each model turn and each tool call is its own step, so a retry resumes
    // where it failed. Model turns are sent back unchanged (Gemini 3 requires their
    // thought signatures on later turns).
    const contents = toContents(history);
    const writtenFiles = {};
    let summary = "";
    // The last summary, kept in case the turn budget runs out while fixing an error.
    let lastSummary = "";
    let checks = 0;
    let remainingError = null;
    // Stay on the model that answered last; switch only when its quota runs out.
    let currentModel;

    for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
      const { content, model } = await step.run(`gemini-turn-${turn}`, async () => {
        await start(`turn-${turn}`, { kind: "think", label: "Thinking" });
        const result = await runGeminiTurn({
          system: `${PROMPT}\n${EFFICIENCY_NOTE}`,
          contents,
          tools: CODE_AGENT_TOOLS,
          preferredModel: currentModel,
        });
        await finish(`turn-${turn}`);
        return result;
      });
      currentModel = model;
      contents.push(content);

      const calls = (content.parts ?? []).filter((part) => part.functionCall).map((part) => part.functionCall);

      if (calls.length === 0) {
        const text = textOf(content);
        if (text.includes("<task_summary>")) {
          lastSummary = text;
          if (Object.keys(writtenFiles).length === 0) break;

          // Check the app before replying; send any error back to the agent to fix.
          const check = checks++;
          const problem = await step.run(`check-app-${check}`, async () => {
            const key = `check-${check}`;
            await start(key, { kind: "check", label: check ? "Checking the fix" : "Checking for errors" });
            const error = await checkApp(sandboxId, routesToCheck(Object.keys(writtenFiles)));
            const firstLine = error?.split("\n").find((line) => line.trim() && !line.startsWith("Route"))?.trim();
            await finish(key, error ? "error" : "done", error ? `Found an error: ${(firstLine ?? error).slice(0, 90)}` : undefined);
            return error;
          });

          if (!problem || check >= MAX_FIX_ROUNDS) {
            remainingError = problem;
            summary = text;
            break;
          }
          contents.push({
            role: "user",
            parts: [{ text: `The app fails to load with this error:\n\n${problem}\n\nFix it with the tools, then reply with the <task_summary> again.` }],
          });
          continue;
        }
        contents.push({
          role: "user",
          parts: [{ text: "Continue the task with the tools. When everything is done, reply with the <task_summary>." }],
        });
        continue;
      }

      const responses = [];
      for (const [index, call] of calls.entries()) {
        const { part, writtenFiles: written } = await step.run(`tool-${turn}-${index}-${call.name}`, async () => {
          const key = `tool-${turn}-${index}`;
          await start(key, describeCall(call));
          const result = await runTool(call, sandboxId);
          await finish(key, result.part.functionResponse.response?.error ? "error" : "done");
          return result;
        });
        Object.assign(writtenFiles, written);
        responses.push(part);
      }
      contents.push({ role: "user", parts: responses });
    }

    summary ||= lastSummary;
    const isError = !summary || Object.keys(writtenFiles).length === 0;

    const fragmentTitle = isError
      ? ""
      : await step.run("generate-fragment-title", async () => {
          await start("finish", { kind: "finish", label: "Finishing up" });
          return generateText({ system: FRAGMENT_TITLE_PROMPT, prompt: summary });
        });

    const response = isError
      ? ""
      : await step.run("generate-response", () => generateText({ system: RESPONSE_PROMPT, prompt: summary }));

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await Sandbox.connect(sandboxId);
      return getSandboxUrl(sandbox);
    });

    // The run finished without a usable result: give the credit back, like onFailure does.
    if (isError && event.data.userId) {
      await step.run("refund-credit-on-error", async () => {
        // A stopped run was already refunded by stopGeneration.
        if (await wasStopped()) return null;
        return await refundCredits(event.data.userId);
      });
    }

    await step.run("save-result" , async()=>{
      if (await wasStopped()) return null;

      if (promptId) {
        await closeRunningSteps({ runId }, isError ? "error" : "done");
      }

      if(isError){
        return await db.message.create({
          data:{
            chatId,
            content:event.data.userId
              ? "Something went wrong. Please try again. Your credit has been refunded."
              : "Something went wrong. Please try again",
            role:MessageRole.ASSISTANT,
            type:MessageType.ERROR
          }
        })
      }

      // Store the whole app tree, not just what the agent wrote this run,
      // so any version can rebuild the app in a fresh sandbox.
      const sandbox = await Sandbox.connect(sandboxId);
      const files = await snapshotFiles(sandbox);

      return await db.message.create({
        data:{
          chatId,
          content:(response || "Here you go") + (remainingError
            ? `\n\n> The preview still shows an error I could not fix. Ask me to fix it:\n> ${remainingError.split("\n").slice(0, 3).join(" ").slice(0, 200)}`
            : ""),
          role:MessageRole.ASSISTANT,
          type:MessageType.RESULT,
          fragments:{
            create:{
              sandboxUrl:sandboxUrl,
              sandboxId:sandboxId,
              title:fragmentTitle || "Untitled",
              files
            }
          }
        }
      })
    })

    return {
      url: sandboxUrl,
      title: fragmentTitle || "Untitled",
      files: writtenFiles,
      summary,
    };
  }
);
