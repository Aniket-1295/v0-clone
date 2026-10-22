import { inngest } from "./client";
import * as Sentry from "@sentry/nextjs";
import Sandbox from "@e2b/code-interpreter";
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "@/prompt";
import { buildFollowUpContext } from "./utils";
import { generateText, runGeminiTurn, textOf, tierModels } from "./gemini";
import { agentTools, runTool } from "./tools";
import { MAX_IMAGES_PER_RUN } from "@/lib/generated-images";
import { closeRunningSteps, describeCall, finishStep, startStep } from "./progress";
import { checkApp, routesToCheck } from "./check-app";
import { getChatEnvKeys } from "@/lib/env-vars";
import { buildInstructionsNote, loadChatInstructions } from "@/lib/instructions";

import  db  from "@/lib/db";
import { refundCredits } from "@/lib/usage";
import { MAX_FALLBACK_TIER_ID, creditsLabel, getTier, refundNote } from "@/lib/model-tiers";

import {
  getLatestFragment,
  getOrCreateChatSandbox,
  getSandboxUrl,
  snapshotWithFallback,
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

// Sent with the system prompt when the conversation has an attached image.
const IMAGE_NOTE = `
The user attached an image of a design (a screenshot or mockup). Recreate it as closely as you can: its layout, sections, colours, typography, spacing and components, built with Tailwind and shadcn/ui. Use the text you can read in it; where content is unreadable, use realistic placeholder content.
Build only what the image shows, in app/page.tsx plus a few components if needed: do not add sections, pages, modals or features that are not in the image, and do not install packages (Tailwind, shadcn/ui and lucide-react are enough).`;
// Sent with the system prompt when the user turned on "Generate images".
const IMAGES_NOTE = `
You can create images with the generateImage tool (at most ${MAX_IMAGES_PER_RUN} in this task). Use it where real imagery makes the app better: hero images, product shots, illustrations, backgrounds, avatars. Do not use it for icons (use lucide-react) or for logos and images with text in them.
Write a detailed prompt (subject, style, colours, lighting) and pick the aspect ratio that fits the layout. Use the returned URL in a plain <img src="..." alt="..." /> with suitable classes (for example className="h-full w-full object-cover"), not next/image. Keep using images generated earlier in this chat (their URLs are in the code) instead of generating them again. Never use image URLs from the web (Unsplash or any other site); only URLs that generateImage returned.`;

// Environment variables: the agent learns the names, never the values.
const envNote = (keys) =>
  keys.length
    ? `
These environment variables are set for this app (in .env.local, managed by the user): ${keys.join(", ")}. Read them with process.env.NAME in server code (Server Components, Route Handlers, Server Actions); only names starting with NEXT_PUBLIC_ are available in client components. Never read, print, copy or overwrite .env.local, and never hard-code secret values.`
    : `
No environment variables are set for this app. If a feature needs an API key or other secret, read it from process.env (e.g. process.env.OPENAI_API_KEY) and tell the user, in your summary, which variable to add in the chat's Environment variables panel. Never ask for or hard-code secret values.`;

// Only the newest images are sent to the model; older ones become a short note.
const MAX_IMAGES = 2;

/**
 * Stored chat messages as Gemini contents, merging consecutive turns of the same role.
 * Images stay as { attachmentId } parts here (step outputs must stay small) and are
 * loaded by withImages() right before each model call.
 */
const toContents = (messages) => {
  const contents = messages.reduce((contents, { role, text, attachmentIds = [] }) => {
    const parts = [{ text }, ...attachmentIds.map((attachmentId) => ({ attachmentId }))];
    const last = contents[contents.length - 1];
    if (last?.role === role) last.parts.push(...parts);
    else contents.push({ role, parts });
    return contents;
  }, []);

  let kept = 0;
  for (const content of [...contents].reverse()) {
    content.parts = content.parts
      .reverse()
      .map((part) => (part.attachmentId && ++kept > MAX_IMAGES ? { text: "(An image was attached here earlier.)" } : part))
      .reverse();
  }
  return contents;
};

/** Replaces { attachmentId } parts with the image bytes Gemini expects. */
const withImages = async (contents) => {
  const ids = contents.flatMap((content) => content.parts.filter((part) => part.attachmentId).map((part) => part.attachmentId));
  if (ids.length === 0) return contents;

  const images = new Map(
    (await db.attachment.findMany({ where: { id: { in: ids } }, select: { id: true, mimeType: true, data: true } })).map(
      (image) => [image.id, { inlineData: { mimeType: image.mimeType, data: Buffer.from(image.data).toString("base64") } }]
    )
  );
  return contents.map((content) => ({
    ...content,
    parts: content.parts.map((part) => (part.attachmentId ? images.get(part.attachmentId) ?? { text: "(Image unavailable.)" } : part)),
  }));
};

export const codeAgentFunction = inngest.createFunction(
  {
    id: "code-agent",
    // One run at a time per user; extra runs wait. Backs up the check in the server actions.
    concurrency: [{ key: "event.data.userId", limit: 1 }],
    // The Stop button (stopGeneration) sends this; the run ends at its next step.
    cancelOn: [{ event: "code-agent/cancel", if: "async.data.chatId == event.data.chatId" }],
    // Runs once all retries are exhausted: unblock the UI and give the credits back.
    onFailure: async ({ event, step }) => {
      const { chatId, projectId, userId, tier } = event.data.event.data;
      const { credits } = getTier(tier);

      // Inngest catches the run's error, so Sentry would never see it otherwise.
      await step.run("report-error", async () => {
        const { name, message, stack } = event.data.error ?? {};
        const error = Object.assign(new Error(message || "Code agent run failed"), { name: name || "Error", stack });
        Sentry.captureException(error, { tags: { inngestFunction: "code-agent", runId: event.data.run_id, chatId: chatId ?? projectId } });
        await Sentry.flush(2000);
      });

      await step.run("write-error-message", async () => {
        if (event.data.run_id) await closeRunningSteps({ runId: event.data.run_id }, "error");
        return await db.message.create({
          data: {
            // Events sent before projects held chats carry projectId; the migration gave
            // each such project a chat with the same id.
            chatId: chatId ?? projectId,
            content: `Generation failed. ${refundNote(credits)}`,
            role: MessageRole.ASSISTANT,
            type: MessageType.ERROR,
          },
        });
      });

      if (userId) {
        await step.run("refund-credit", async () => {
          return await refundCredits(userId, credits);
        });
      }
    },
  },
  { event: "code-agent/run" },

  async ({ event, step, runId }) => {
    const chatId = event.data.chatId ?? event.data.projectId;
    // Events sent before model tiers carry no tier: they ran on Mini.
    const tier = getTier(event.data.tier);
    // The user turned on "Generate images" for this prompt.
    const images = !!event.data.images;
    const tools = agentTools({ images });
    const { models, primary, thinkingLevel } = tierModels(tier.id);

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

      return buildFollowUpContext(await snapshotWithFallback(sandboxId, chatId));
    });

    const history = await step.run("get-previous-messages", async () => {
      const messages = await db.message.findMany({
        where: { chatId },
        orderBy: { createdAt: "asc" },
        // Negative take returns the LAST n rows while keeping ascending order.
        take: -MAX_HISTORY_MESSAGES,
        include: { attachments: { select: { id: true } } },
      });

      const turns = messages.map((message) => ({
        role: message.role === MessageRole.ASSISTANT ? "model" : "user",
        text: message.content,
        attachmentIds: message.attachments.map((attachment) => attachment.id),
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
    const hasImage = history.some((turn) => turn.attachmentIds?.length);
    const envKeys = await step.run("get-env-names", () => getChatEnvKeys(chatId));
    const rules = await step.run("get-instructions", () => loadChatInstructions(db, chatId));
    const system = `${PROMPT}\n${EFFICIENCY_NOTE}${hasImage ? `\n${IMAGE_NOTE}` : ""}${images ? `\n${IMAGES_NOTE}` : ""}\n${envNote(envKeys)}${buildInstructionsNote(rules)}`;
    const writtenFiles = {};
    let summary = "";
    // The last summary, kept in case the turn budget runs out while fixing an error.
    let lastSummary = "";
    let checks = 0;
    let remainingError = null;
    // Stay on the model that answered last; switch only when its quota runs out.
    let currentModel;
    // Max only: some turn ran on the Flash fallback because Max's models were unavailable.
    let fellBack = false;
    // generateImage calls left; 0 once the image models turn out to be unavailable.
    let imagesLeft = images ? MAX_IMAGES_PER_RUN : 0;
    // The image models had no quota: the reply says the app uses placeholders.
    let imagesUnavailable = false;

    for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
      const { content, model } = await step.run(`gemini-turn-${turn}`, async () => {
        await start(`turn-${turn}`, { kind: "think", label: "Thinking" });
        const result = await runGeminiTurn({
          system,
          contents: await withImages(contents),
          tools,
          models,
          thinkingLevel,
          preferredModel: currentModel,
        });
        await finish(`turn-${turn}`);
        return result;
      });
      currentModel = model;
      fellBack ||= !primary.includes(model);
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
          const result = await runTool(call, sandboxId, { chatId, images, imagesLeft });
          const failed = !!result.part.functionResponse.response?.error;
          // "Generating an image: ..." becomes "Generated" or "Could not generate", keeping the prompt.
          const imageLabel = call.name === "generateImage"
            ? describeCall(call).label.replace("Generating an image", failed ? "Could not generate an image" : "Generated an image")
            : undefined;
          await finish(key, failed ? "error" : "done", imageLabel);
          return result;
        });
        Object.assign(writtenFiles, written);
        responses.push(part);
        if (call.name === "generateImage") {
          const response = part.functionResponse.response;
          if (response?.output?.url) imagesLeft--;
          else if (/unavailable/i.test(response?.error ?? "")) {
            imagesLeft = 0;
            imagesUnavailable = true;
          } else if (/limit/i.test(response?.error ?? "")) imagesLeft = 0;
        }
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

    // The run finished without a usable result: give the credits back, like onFailure does.
    if (isError && event.data.userId) {
      await step.run("refund-credit-on-error", async () => {
        // A stopped run was already refunded by stopGeneration.
        if (await wasStopped()) return null;
        return await refundCredits(event.data.userId, tier.credits);
      });
    }

    // Max fell back to Flash: it is charged the fallback tier's price.
    const fallbackTier = getTier(MAX_FALLBACK_TIER_ID);
    const imagesNote = imagesUnavailable
      ? "\n\n> Images could not be generated right now (the image model is unavailable), so the app uses placeholders. Ask me to add images later."
      : "";
    const fallbackNote = fellBack
      ? `\n\n> ${tier.name} was unavailable, so this ran on ${fallbackTier.name}. You were charged ${creditsLabel(fallbackTier.credits)} instead of ${creditsLabel(tier.credits)}.`
      : "";

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
              ? `Something went wrong. Please try again. ${refundNote(tier.credits)}`
              : "Something went wrong. Please try again",
            role:MessageRole.ASSISTANT,
            type:MessageType.ERROR
          }
        })
      }

      // Store the whole app tree, not just what the agent wrote this run,
      // so any version can rebuild the app in a fresh sandbox.
      const files = await snapshotWithFallback(sandboxId, chatId, writtenFiles);

      return await db.message.create({
        data:{
          chatId,
          content:(response || "Here you go") + (remainingError
            ? `\n\n> The preview still shows an error I could not fix. Ask me to fix it:\n> ${remainingError.split("\n").slice(0, 3).join(" ").slice(0, 200)}`
            : "") + imagesNote + fallbackNote,
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

    // Last, so a failure in an earlier step cannot refund the run twice (onFailure refunds it all).
    if (fellBack && !isError && event.data.userId) {
      await step.run("refund-fallback-difference", async () => {
        if (await wasStopped()) return null;
        return await refundCredits(event.data.userId, tier.credits - fallbackTier.credits);
      });
    }

    return {
      url: sandboxUrl,
      title: fragmentTitle || "Untitled",
      files: writtenFiles,
      summary,
    };
  }
);
