"use server";

import { headers } from "next/headers";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { MessageRole, MessageType } from "@prisma/client";

import { inngest } from "@/inngest/client";
import db from "@/lib/db";
import { spendCredit } from "@/lib/consume-credit";
import { ActionErrorCode, fail, ok } from "@/lib/action-result";
import { getCurrentUser } from "@/modules/auth/actions";
import { getTemplate } from "@/templates/registry";
import { parseImage } from "@/lib/attachments";
import {
  connectSandbox,
  getLatestFragment,
  getOrCreateChatSandbox,
  isHostedPreview,
  restoreFragment,
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

/**
 * Starts a chat from a prompt, in a project or as a draft, and kicks off generation.
 * `image` ({ mimeType, data: base64 }) is an optional screenshot or mockup to recreate.
 */
export const createChat = async (value, projectId = null, image = null) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const parsed = parseImage(image);
  if (parsed.error) return fail(ActionErrorCode.INTERNAL, parsed.error);

  if (projectId) {
    const project = await db.project.findFirst({ where: { id: projectId, userId: user.id } });
    if (!project) return fail(ActionErrorCode.NOT_FOUND, "Project not found.");
  }

  const creditError = await spendCredit();
  if (creditError) return creditError;

  try {
    const chat = await db.chat.create({
      data: {
        title: titleFrom(value),
        userId: user.id,
        projectId,
        messages: {
          create: {
            content: value,
            role: MessageRole.USER,
            type: MessageType.RESULT,
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
      data: { value, chatId: chat.id, userId: user.clerkId },
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
    select: CHAT_LIST_SELECT,
  });

  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");
  return ok(chat);
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
    if (chat.sandboxId && (await connectSandbox(chat.sandboxId))) {
      return ok({ status: "alive" });
    }

    const [fragment, lastMessage] = await Promise.all([
      getLatestFragment(chatId),
      db.message.findFirst({ where: { chatId }, orderBy: { createdAt: "desc" }, select: { role: true } }),
    ]);

    // Nothing to rebuild yet, a generation is running (the agent restores the sandbox
    // itself), or the version is a template served by this app (no sandbox needed).
    if (!fragment || lastMessage?.role === MessageRole.USER || isHostedPreview(fragment)) {
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
