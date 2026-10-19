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

/** Starts a chat from a prompt, in a project or as a draft, and kicks off generation. */
export const createChat = async (value, projectId = null) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

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
          create: { content: value, role: MessageRole.USER, type: MessageType.RESULT },
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
