"use server";

import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { MessageRole, MessageType } from "@prisma/client";

import { inngest } from "@/inngest/client";
import db from "@/lib/db";
import { resolveUserTier, spendCredit } from "@/lib/consume-credit";
import { ActionErrorCode, fail, ok } from "@/lib/action-result";
import { getCurrentUser } from "@/modules/auth/actions";
import { getTemplate } from "@/templates/registry";
import { parseImage } from "@/lib/attachments";
import { validatePrompt } from "@/lib/generation-limits";
import { validateInstructions } from "@/lib/instructions";
import { APP_LOG_FILE, APP_LOG_LINES } from "@/lib/app-logs";
import { TERMINAL_CWD, TERMINAL_TIMEOUT_MS, clampOutput, validateCommand } from "@/lib/terminal";
import { checkNoRunningGeneration } from "@/lib/generation-guard";
import { encryptSecret, decryptSecret, isSecretsConfigured } from "@/lib/secrets";
import { createRepository, isGithubConfigured, pushFiles, repoNameFor, revokeToken } from "@/lib/github";
import { ENV_KEY_PATTERN, MAX_ENV_VALUE_BYTES, MAX_ENV_VARS, getChatEnv, maskValue } from "@/lib/env-vars";
import { createDeployment, getDeploymentState, isPublishConfigured, projectNameFor, syncProjectEnv } from "@/lib/vercel";
import {
  connectSandbox,
  getLatestFragment,
  getOrCreateChatSandbox,
  isHostedPreview,
  restoreFragment,
  installDesignScript,
  saveCodeEditsAsVersion,
  syncChatEnvToSandbox,
  validateCodeEdits,
} from "@/lib/sandbox";

const UNAUTHORIZED = () => fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");
const titleFrom = (prompt) => {
  const line = prompt.trim().split("\n")[0];
  return line.length > 60 ? `${line.slice(0, 57)}...` : line;
};

const CHAT_LIST_SELECT = {
  id: true,
  title: true,
  createdAt: true,
  updatedAt: true,
  projectId: true,
  project: { select: { id: true, name: true } },
};

const CHAT_DETAIL_SELECT = {
  ...CHAT_LIST_SELECT,
  shareId: true,
  instructions: true,
  project: { select: { id: true, name: true, instructions: true } },
};

/**
 * Starts a chat from a prompt, in a project or as a draft, and kicks off generation.
 * `image` ({ mimeType, data: base64 }) is an optional screenshot or mockup to recreate.
 * `tierId` is the model tier (see src/lib/model-tiers.js); Mini when omitted. `images` lets the
 * agent generate images for the app.
 */
export const createChat = async (value, projectId = null, image = null, tierId = null, images = false) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const { prompt, error: promptError } = validatePrompt(value);
  if (promptError) return fail(ActionErrorCode.INVALID_INPUT, promptError);

  const parsed = parseImage(image);
  if (parsed.error) return fail(ActionErrorCode.INTERNAL, parsed.error);

  if (projectId) {
    const project = await db.project.findFirst({ where: { id: projectId, userId: user.id } });
    if (!project) return fail(ActionErrorCode.NOT_FOUND, "Project not found.");
  }

  const { tier, error: tierError } = await resolveUserTier(tierId);
  if (tierError) return tierError;

  const runningError = await checkNoRunningGeneration(user.id);
  if (runningError) return runningError;

  const creditError = await spendCredit(tier);
  if (creditError) return creditError;

  try {
    const chat = await db.chat.create({
      data: {
        title: titleFrom(prompt),
        userId: user.id,
        projectId,
        messages: {
          create: {
            content: prompt,
            role: MessageRole.USER,
            type: MessageType.RESULT,
            modelTier: tier.id,
            ...(parsed.image ? { attachments: { create: parsed.image } } : {}),
          },
        },
      },
    });

    if (projectId) {
      await db.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
    }

    await inngest.send({
      name: "code-agent/run",
      data: { value: prompt, chatId: chat.id, userId: user.clerkId, tier: tier.id, images: images === true },
    });

    return ok(chat);
  } catch (error) {
    console.error("createChat failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Failed to start the chat. Please try again.");
  }
};

/** The user's chats, newest first. `scope`: "all", "drafts" (no project) or a project id. */
export const getChats = async (scope = "all") => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const where = { userId: user.id };
  if (scope === "drafts") where.projectId = null;
  else if (scope !== "all") where.projectId = scope;

  const chats = await db.chat.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: CHAT_LIST_SELECT,
  });

  return ok(chats);
};

export const getChat = async (chatId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const chat = await db.chat.findFirst({
    where: { id: chatId, userId: user.id },
    select: CHAT_DETAIL_SELECT,
  });

  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");
  return ok(chat);
};

/** Standing rules for this chat. Empty string clears them. Applies on the next generation. */
export const updateChatInstructions = async (chatId, value) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const { instructions, error } = validateInstructions(value);
  if (error) return fail(ActionErrorCode.INVALID_INPUT, error);

  const { count } = await db.chat.updateMany({
    where: { id: chatId, userId: user.id },
    data: { instructions: instructions || null },
  });
  return count ? ok({ id: chatId, instructions: instructions || null }) : fail(ActionErrorCode.NOT_FOUND, "Chat not found.");
};

export const renameChat = async (chatId, title) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const trimmed = title.trim();
  if (!trimmed) return fail(ActionErrorCode.INTERNAL, "Name cannot be empty.");

  const { count } = await db.chat.updateMany({ where: { id: chatId, userId: user.id }, data: { title: trimmed.slice(0, 120) } });
  return count ? ok({ id: chatId }) : fail(ActionErrorCode.NOT_FOUND, "Chat not found.");
};

/** Moves a chat into a project, or back to drafts with projectId null. */
export const moveChat = async (chatId, projectId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  if (projectId) {
    const project = await db.project.findFirst({ where: { id: projectId, userId: user.id } });
    if (!project) return fail(ActionErrorCode.NOT_FOUND, "Project not found.");
  }

  const { count } = await db.chat.updateMany({ where: { id: chatId, userId: user.id }, data: { projectId } });
  return count ? ok({ id: chatId }) : fail(ActionErrorCode.NOT_FOUND, "Chat not found.");
};

export const deleteChat = async (chatId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const { count } = await db.chat.deleteMany({ where: { id: chatId, userId: user.id } });
  return count ? ok({ id: chatId }) : fail(ActionErrorCode.NOT_FOUND, "Chat not found.");
};

/**
 * Duplicates a template into a new draft chat: its first version is the template's real
 * code, previewed live from /templates-preview/<slug>. No AI run, no credit used.
 */
export const createChatFromTemplate = async (slug) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const template = getTemplate(slug);
  if (!template) return fail(ActionErrorCode.NOT_FOUND, "Template not found.");

  try {
    const source = await readFile(path.join(process.cwd(), "src/templates/components", `${slug}.jsx`), "utf8");
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

    const chat = await db.chat.create({ data: { title: template.name, userId: user.id } });

    // Created one after the other so the chat shows them in this order.
    await db.message.create({
      data: { chatId: chat.id, content: `Start from the ${template.name} template.`, role: MessageRole.USER, type: MessageType.RESULT },
    });
    await db.message.create({
      data: {
        chatId: chat.id,
        content: `Here's the **${template.name}** template: ${template.description} Ask me for any change you want.`,
        role: MessageRole.ASSISTANT,
        type: MessageType.RESULT,
        fragments: {
          create: {
            sandboxUrl: `${protocol}://${host}/templates-preview/${slug}`,
            title: template.name,
            files: { "app/page.tsx": source },
          },
        },
      },
    });

    return ok(chat);
  } catch (error) {
    console.error("createChatFromTemplate failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not start a chat from this template.");
  }
};

/**
 * Called by the chat page while it is open. Extends the chat's sandbox timeout, or rebuilds
 * the sandbox from the latest version when it has expired so the preview works again.
 * Returns { status: "alive" | "rebuilt" | "idle" }.
 */
export const wakeChatSandbox = async (chatId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const chat = await db.chat.findFirst({ where: { id: chatId, userId: user.id }, select: { sandboxId: true } });
  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");

  try {
    const lastMessage = await db.message.findFirst({ where: { chatId }, orderBy: { createdAt: "desc" }, select: { role: true } });
    const generating = lastMessage?.role === MessageRole.USER;

    // A hung sandbox is replaced, but not while a generation runs: an npm install can make
    // a healthy sandbox briefly slow, and the run must keep its sandbox.
    if (chat.sandboxId && (await connectSandbox(chat.sandboxId, { checkHealth: !generating }))) {
      return ok({ status: "alive" });
    }

    const fragment = await getLatestFragment(chatId);

    // Nothing to rebuild yet, a generation is running (the agent restores the sandbox
    // itself), or the version is a template served by this app (no sandbox needed).
    if (!fragment || generating || isHostedPreview(fragment)) {
      return ok({ status: "idle" });
    }

    await getOrCreateChatSandbox(chatId);
    return ok({ status: "rebuilt" });
  } catch (error) {
    console.error("wakeChatSandbox failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not start the preview. Please refresh.");
  }
};

/**
 * The last lines of the dev-server log in the chat's sandbox (server output and the
 * preview's browser console), for the Logs panel. Never starts or rebuilds a sandbox:
 * returns { state: "none" } when the chat has no sandbox of its own (no version yet, or a
 * template served by this app), { state: "asleep" } when it has expired, else
 * { state: "ok", text }.
 */
export const getAppLogs = async (chatId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const chat = await db.chat.findFirst({ where: { id: chatId, userId: user.id }, select: { sandboxId: true } });
  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");

  const fragment = await getLatestFragment(chatId);
  if (!chat.sandboxId || !fragment || isHostedPreview(fragment)) return ok({ state: "none" });

  try {
    const sandbox = await connectSandbox(chat.sandboxId);
    if (!sandbox) return ok({ state: "asleep" });

    const { stdout } = await sandbox.commands.run(`tail -n ${APP_LOG_LINES} ${APP_LOG_FILE} 2>/dev/null || true`, {
      timeoutMs: 10_000,
    });
    return ok({ state: "ok", text: stdout });
  } catch (error) {
    console.error("getAppLogs failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not read the logs. Please try again.");
  }
};

/**
 * Runs a one-shot shell command in the chat's sandbox (the app root) and returns its output,
 * for the Terminal panel. Blocked while a generation is running, since the agent is using the
 * sandbox. Returns { state: "none" } when the chat has no sandbox of its own, { state: "asleep" }
 * when it has expired, or { state: "ok", stdout, stderr, exitCode, timedOut }.
 */
export const runTerminalCommand = async (chatId, value) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const { command, error: commandError } = validateCommand(value);
  if (commandError) return fail(ActionErrorCode.INVALID_INPUT, commandError);

  const chat = await db.chat.findFirst({ where: { id: chatId, userId: user.id }, select: { sandboxId: true } });
  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");

  const lastMessage = await db.message.findFirst({ where: { chatId }, orderBy: { createdAt: "desc" }, select: { role: true } });
  if (lastMessage?.role === MessageRole.USER) {
    return fail(ActionErrorCode.GENERATION_IN_PROGRESS, "Wait for the current generation to finish before running a command.");
  }

  const fragment = await getLatestFragment(chatId);
  if (!chat.sandboxId || !fragment || isHostedPreview(fragment)) return ok({ state: "none" });

  try {
    const sandbox = await connectSandbox(chat.sandboxId);
    if (!sandbox) return ok({ state: "asleep" });

    let timedOut = false;
    const result = await sandbox.commands
      .run(command, { cwd: TERMINAL_CWD, timeoutMs: TERMINAL_TIMEOUT_MS })
      .catch((runError) => {
        // A non-zero exit throws a CommandExitError that carries stdout/stderr/exitCode;
        // a timeout or kill throws without them.
        if (typeof runError?.exitCode === "number") return runError;
        timedOut = true;
        return { stdout: runError?.stdout ?? "", stderr: "", exitCode: null };
      });

    return ok({
      state: "ok",
      stdout: clampOutput(result.stdout),
      stderr: clampOutput(result.stderr),
      exitCode: result.exitCode ?? null,
      timedOut,
    });
  } catch (error) {
    console.error("runTerminalCommand failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not run the command. Please try again.");
  }
};

/**
 * Makes an earlier version the latest one again by saving a copy of it as a new version
 * (history is never rewritten). Costs no credit. Returns the new message.
 */
export const restoreVersion = async (chatId, fragmentId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const chat = await db.chat.findFirst({ where: { id: chatId, userId: user.id }, select: { sandboxId: true } });
  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");

  const [fragment, latest, lastMessage] = await Promise.all([
    db.fragment.findFirst({ where: { id: fragmentId, message: { chatId } } }),
    getLatestFragment(chatId),
    db.message.findFirst({ where: { chatId }, orderBy: { createdAt: "desc" }, select: { role: true } }),
  ]);

  if (!fragment) return fail(ActionErrorCode.NOT_FOUND, "Version not found.");
  if (fragment.id === latest?.id) return fail(ActionErrorCode.INTERNAL, "This is already the latest version.");
  if (lastMessage?.role === MessageRole.USER) {
    return fail(ActionErrorCode.INTERNAL, "Wait for the current generation to finish, then try again.");
  }

  try {
    const message = await restoreFragment(chatId, fragment, chat.sandboxId);
    return ok(message);
  } catch (error) {
    console.error("restoreVersion failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not restore this version. Please try again.");
  }
};

const PUBLISH_SELECT = {
  id: true,
  title: true,
  vercelProjectName: true,
  publishDeploymentId: true,
  publishStatus: true,
  publishError: true,
  publishedUrl: true,
  publishedAt: true,
  publishedFragmentId: true,
};

const publishView = (chat, latest) => ({
  configured: isPublishConfigured(),
  // Template versions only hold app/page.tsx; they become a full app after a prompt.
  canPublish: !!latest && !isHostedPreview(latest),
  status: chat.publishStatus ?? null,
  url: chat.publishedUrl ?? null,
  error: chat.publishError ?? null,
  publishedAt: chat.publishedAt ?? null,
  isLatestPublished: !!latest && chat.publishedFragmentId === latest.id,
});

/**
 * Deploys the chat's latest version to its own Vercel project (created on first publish),
 * so the app stays online at a permanent URL. Publishing again updates it.
 */
export const publishChat = async (chatId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const chat = await db.chat.findFirst({ where: { id: chatId, userId: user.id }, select: PUBLISH_SELECT });
  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");
  if (!isPublishConfigured()) return fail(ActionErrorCode.INTERNAL, "Publishing is not set up yet.");
  if (chat.publishStatus === "building") return fail(ActionErrorCode.INTERNAL, "A publish is already in progress.");

  const latest = await getLatestFragment(chatId);
  if (!latest || isHostedPreview(latest)) {
    return fail(ActionErrorCode.INTERNAL, "Send a prompt first: there is no generated app to publish yet.");
  }

  try {
    const projectName = chat.vercelProjectName ?? projectNameFor(chat);
    // The chat's environment variables go to the project before it builds.
    await syncProjectEnv(projectName, await getChatEnv(chatId));
    const { id } = await createDeployment({ projectName, files: latest.files });
    const updated = await db.chat.update({
      where: { id: chatId },
      data: {
        vercelProjectName: projectName,
        publishDeploymentId: id,
        publishStatus: "building",
        publishError: null,
        publishedFragmentId: latest.id,
      },
      select: PUBLISH_SELECT,
    });
    return ok(publishView(updated, latest));
  } catch (error) {
    console.error("publishChat failed:", error);
    return fail(ActionErrorCode.INTERNAL, `Could not start publishing: ${error.message}`);
  }
};

/** The chat's publish state; while a deployment builds, asks Vercel how it is going. */
export const getPublishStatus = async (chatId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  let chat = await db.chat.findFirst({ where: { id: chatId, userId: user.id }, select: PUBLISH_SELECT });
  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");
  const latest = await getLatestFragment(chatId);

  if (chat.publishStatus === "building" && chat.publishDeploymentId && isPublishConfigured()) {
    try {
      const deployment = await getDeploymentState(chat.publishDeploymentId);
      if (deployment.state !== "building") {
        chat = await db.chat.update({
          where: { id: chatId },
          data:
            deployment.state === "ready"
              ? { publishStatus: "ready", publishedUrl: deployment.url, publishedAt: new Date(), publishError: null }
              : { publishStatus: "error", publishError: deployment.error },
          select: PUBLISH_SELECT,
        });
      }
    } catch (error) {
      console.error("getPublishStatus failed:", error);
    }
  }

  return ok(publishView(chat, latest));
};

/**
 * Makes the chat viewable read-only at /share/[shareId] by anyone with the link. Returns
 * the existing link if it is already shared. The id is random, so links cannot be guessed.
 */
export const shareChat = async (chatId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const chat = await db.chat.findFirst({ where: { id: chatId, userId: user.id }, select: { shareId: true } });
  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");
  if (chat.shareId) return ok({ shareId: chat.shareId });

  const updated = await db.chat.update({
    where: { id: chatId },
    data: { shareId: randomBytes(12).toString("base64url") },
    select: { shareId: true },
  });
  return ok(updated);
};

/** Turns the share link off; the old link stops working. */
export const unshareChat = async (chatId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const { count } = await db.chat.updateMany({ where: { id: chatId, userId: user.id }, data: { shareId: null } });
  return count ? ok({ shareId: null }) : fail(ActionErrorCode.NOT_FOUND, "Chat not found.");
};

/**
 * Saves files edited by hand in the Code tab as a new version of the chat (the latest
 * version only; older ones must be restored first). The edits go into the chat's sandbox
 * so the preview updates. Costs no credit. Returns the new message.
 */
export const saveCodeEdits = async (chatId, fragmentId, edits) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const chat = await db.chat.findFirst({ where: { id: chatId, userId: user.id }, select: { id: true } });
  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");

  const [latest, lastMessage] = await Promise.all([
    getLatestFragment(chatId),
    db.message.findFirst({ where: { chatId }, orderBy: { createdAt: "desc" }, select: { role: true } }),
  ]);
  if (lastMessage?.role === MessageRole.USER) {
    return fail(ActionErrorCode.INTERNAL, "Wait for the current generation to finish, then save.");
  }
  if (!latest || latest.id !== fragmentId) {
    return fail(ActionErrorCode.INTERNAL, "Only the latest version can be edited. Restore this version first.");
  }

  const problem = validateCodeEdits(edits, latest.files);
  if (problem) return fail(ActionErrorCode.INTERNAL, problem);

  try {
    const message = await saveCodeEditsAsVersion(chatId, latest, edits);
    await db.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
    return ok(message);
  } catch (error) {
    console.error("saveCodeEdits failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not save your changes. Please try again.");
  }
};

const ownChat = (chatId, userId) => db.chat.findFirst({ where: { id: chatId, userId }, select: { id: true } });

/**
 * The chat's environment variables with masked values. Values are never sent back to the
 * browser once saved; they can only be replaced or deleted.
 */
export const listEnvVars = async (chatId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  if (!(await ownChat(chatId, user.id))) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");

  const rows = await db.chatEnvVar.findMany({ where: { chatId }, orderBy: { key: "asc" } });
  const vars = rows.map((row) => {
    let masked = "••••••••";
    try {
      masked = maskValue(decryptSecret(row.valueEncrypted));
    } catch {
      // Unreadable with the current ENV_VARS_SECRET; the user can replace it.
    }
    return { key: row.key, masked, updatedAt: row.updatedAt };
  });
  return ok({ configured: isSecretsConfigured(), vars });
};

/** Adds or replaces one variable, then updates the running sandbox. */
export const setEnvVar = async (chatId, key, value) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  if (!(await ownChat(chatId, user.id))) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");
  if (!isSecretsConfigured()) return fail(ActionErrorCode.INTERNAL, "Environment variables are not set up yet (ENV_VARS_SECRET).");

  const name = String(key ?? "").trim();
  if (!ENV_KEY_PATTERN.test(name)) {
    return fail(ActionErrorCode.INTERNAL, "Use capital letters, digits and underscores for the name, e.g. OPENAI_API_KEY.");
  }
  if (typeof value !== "string" || value.length === 0) return fail(ActionErrorCode.INTERNAL, "Enter a value.");
  if (Buffer.byteLength(value) > MAX_ENV_VALUE_BYTES) return fail(ActionErrorCode.INTERNAL, "That value is too long (max 4 KB).");

  const existing = await db.chatEnvVar.findUnique({ where: { chatId_key: { chatId, key: name } }, select: { id: true } });
  if (!existing && (await db.chatEnvVar.count({ where: { chatId } })) >= MAX_ENV_VARS) {
    return fail(ActionErrorCode.INTERNAL, `A chat can have at most ${MAX_ENV_VARS} variables.`);
  }

  await db.chatEnvVar.upsert({
    where: { chatId_key: { chatId, key: name } },
    create: { chatId, key: name, valueEncrypted: encryptSecret(value) },
    update: { valueEncrypted: encryptSecret(value) },
  });
  await syncChatEnvToSandbox(chatId);
  return ok({ key: name });
};

export const deleteEnvVar = async (chatId, key) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  if (!(await ownChat(chatId, user.id))) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");

  await db.chatEnvVar.deleteMany({ where: { chatId, key } });
  await syncChatEnvToSandbox(chatId);
  return ok({ key });
};

/** Turns on design mode for the chat's preview: installs the selection helper in its sandbox. */
export const enableDesignMode = async (chatId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  if (!(await ownChat(chatId, user.id))) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");

  try {
    return ok(await installDesignScript(chatId));
  } catch (error) {
    console.error("enableDesignMode failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not start design mode. Please try again.");
  }
};

// Read separately: getCurrentUser is callable from the browser and must not carry the token.
const githubAccount = (userId) =>
  db.user.findUnique({ where: { id: userId }, select: { githubLogin: true, githubTokenEncrypted: true } });

const githubView = async (account, chat) => {
  const latest = await getLatestFragment(chat.id);
  return {
    configured: isGithubConfigured(),
    connected: !!account.githubTokenEncrypted,
    login: account.githubLogin ?? null,
    repo: chat.githubRepo ?? null,
    repoUrl: chat.githubRepo ? `https://github.com/${chat.githubRepo}` : null,
    pushedAt: chat.githubPushedAt ?? null,
    upToDate: !!latest && chat.githubPushedFragmentId === latest.id,
    canPush: !!latest && !isHostedPreview(latest),
    suggestedName: repoNameFor(chat.title),
  };
};

const GITHUB_CHAT_SELECT = { id: true, title: true, githubRepo: true, githubBranch: true, githubPushedFragmentId: true, githubPushedAt: true };

/** Whether the user has connected GitHub and where this chat's app was pushed. */
export const getGithubStatus = async (chatId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  const chat = await db.chat.findFirst({ where: { id: chatId, userId: user.id }, select: GITHUB_CHAT_SELECT });
  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");
  return ok(await githubView(await githubAccount(user.id), chat));
};

/**
 * Pushes the chat's latest version to GitHub as one commit. The first push creates the
 * repository (`repoName`, private by default) in the user's own account.
 */
export const pushToGithub = async (chatId, { repoName, isPrivate = true } = {}) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  let chat = await db.chat.findFirst({ where: { id: chatId, userId: user.id }, select: GITHUB_CHAT_SELECT });
  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");
  const account = await githubAccount(user.id);
  if (!account.githubTokenEncrypted) return fail(ActionErrorCode.INTERNAL, "Connect your GitHub account first.");

  const latest = await getLatestFragment(chatId);
  if (!latest || isHostedPreview(latest)) {
    return fail(ActionErrorCode.INTERNAL, "Send a prompt first: there is no generated app to push yet.");
  }

  const token = decryptSecret(account.githubTokenEncrypted);
  try {
    if (!chat.githubRepo) {
      const name = repoNameFor(repoName || chat.title);
      const created = await createRepository(token, { name, isPrivate, description: `${chat.title} (made with v0 clone)` });
      chat = await db.chat.update({
        where: { id: chatId },
        data: { githubRepo: created.repo, githubBranch: created.branch },
        select: GITHUB_CHAT_SELECT,
      });
    }

    await pushFiles(token, {
      repo: chat.githubRepo,
      branch: chat.githubBranch || "main",
      files: latest.files,
      message: `v0: ${latest.title}`,
    });
    chat = await db.chat.update({
      where: { id: chatId },
      data: { githubPushedFragmentId: latest.id, githubPushedAt: new Date() },
      select: GITHUB_CHAT_SELECT,
    });
    return ok(await githubView(account, chat));
  } catch (error) {
    console.error("pushToGithub failed:", error.message);
    if (error.status === 401) {
      await db.user.update({ where: { id: user.id }, data: { githubLogin: null, githubTokenEncrypted: null } });
      return fail(ActionErrorCode.INTERNAL, "Your GitHub connection has expired. Connect GitHub again.");
    }
    if (error.status === 404 && chat.githubRepo) {
      // The repository was deleted or renamed on GitHub; the next push creates a new one.
      await db.chat.update({ where: { id: chatId }, data: { githubRepo: null, githubBranch: null, githubPushedFragmentId: null } });
      return fail(ActionErrorCode.INTERNAL, `${chat.githubRepo} was not found on GitHub. Push again to create a new repository.`);
    }
    if (error.status === 422) return fail(ActionErrorCode.INTERNAL, `GitHub refused: ${error.message}`);
    return fail(ActionErrorCode.INTERNAL, "Could not push to GitHub. Please try again.");
  }
};

/** Disconnects GitHub for the user and revokes the app's access. Pushed repositories stay. */
export const disconnectGithub = async () => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  const account = await githubAccount(user.id);
  if (account?.githubTokenEncrypted) {
    try {
      await revokeToken(decryptSecret(account.githubTokenEncrypted));
    } catch {
      // Unreadable or already revoked: forgetting it is enough.
    }
  }
  await db.user.update({ where: { id: user.id }, data: { githubLogin: null, githubTokenEncrypted: null } });
  return ok({ connected: false });
};
