"use server";

import { MessageRole, MessageType } from "@prisma/client";
import db from "@/lib/db";
import { inngest } from "@/inngest/client";
import { getCurrentUser } from "@/modules/auth/actions";
import { spendCredit } from "@/lib/consume-credit";
import { ActionErrorCode, fail, ok } from "@/lib/action-result";

const findOwnChat = (chatId, userId) => db.chat.findFirst({ where: { id: chatId, userId } });

/** Sends a follow-up prompt in a chat and kicks off generation. */
export const createMessages = async (value, chatId) => {
  const user = await getCurrentUser();

  if (!user) return fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");

  const chat = await findOwnChat(chatId, user.id);

  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");

  const creditError = await spendCredit();
  if (creditError) return creditError;

  try {
    const newMessage = await db.message.create({
      data: {
        chatId,
        content: value,
        role: MessageRole.USER,
        type: MessageType.RESULT,
      },
    });

    // Keep "recently updated" ordering in the sidebar and lists.
    await db.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
    if (chat.projectId) {
      await db.project.update({ where: { id: chat.projectId }, data: { updatedAt: new Date() } });
    }

    await inngest.send({
      name: "code-agent/run",
      data: {
        value,
        chatId,
        userId: user.clerkId,
      },
    });

    return ok(newMessage);
  } catch (error) {
    console.error("createMessages failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Failed to send message. Please try again.");
  }
};

export const getMessages = async (chatId) => {
  const user = await getCurrentUser();

  if (!user) return fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");

  const chat = await findOwnChat(chatId, user.id);

  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");

  const messages = await db.message.findMany({
    where: { chatId },
    orderBy: { updatedAt: "asc" },
    include: { fragments: true },
  });

  return ok(messages);
};
