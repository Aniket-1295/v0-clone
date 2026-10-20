import { inngest } from "./client";
import Sandbox from "@e2b/code-interpreter";
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "@/prompt";
import { buildFollowUpContext } from "./utils";
import { generateText, runGeminiTurn, textOf } from "./gemini";
import { CODE_AGENT_TOOLS, runTool } from "./tools";

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
const MAX_AGENT_TURNS = 15;

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
    // Runs once all retries are exhausted: unblock the UI and give the credit back.
    onFailure: async ({ event, step }) => {
      const { chatId, projectId, userId } = event.data.event.data;

      await step.run("write-error-message", async () => {
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

  async ({ event, step }) => {
    const chatId = event.data.chatId ?? event.data.projectId;

    // Step-1: reuse the chat's sandbox so follow-ups build on the existing code;
    // recreate it from the latest version (or the template's code) if it has expired.
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const { sandbox } = await getOrCreateChatSandbox(chatId);
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

    for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
      const { content } = await step.run(`gemini-turn-${turn}`, () =>
        runGeminiTurn({ system: PROMPT, contents, tools: CODE_AGENT_TOOLS })
      );
      contents.push(content);

      const calls = (content.parts ?? []).filter((part) => part.functionCall).map((part) => part.functionCall);

      if (calls.length === 0) {
        const text = textOf(content);
        if (text.includes("<task_summary>")) {
          summary = text;
          break;
        }
        contents.push({
          role: "user",
          parts: [{ text: "Continue the task with the tools. When everything is done, reply with the <task_summary>." }],
        });
        continue;
      }

      const responses = [];
      for (const [index, call] of calls.entries()) {
        const { part, writtenFiles: written } = await step.run(`tool-${turn}-${index}-${call.name}`, () =>
          runTool(call, sandboxId)
        );
        Object.assign(writtenFiles, written);
        responses.push(part);
      }
      contents.push({ role: "user", parts: responses });
    }

    const isError = !summary || Object.keys(writtenFiles).length === 0;

    const fragmentTitle = isError
      ? ""
      : await step.run("generate-fragment-title", () => generateText({ system: FRAGMENT_TITLE_PROMPT, prompt: summary }));

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
        return await refundCredits(event.data.userId);
      });
    }

    await step.run("save-result" , async()=>{
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
          content:response || "Here you go",
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
