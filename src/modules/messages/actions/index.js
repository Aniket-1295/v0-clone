"use server";

import { MessageRole, MessageType } from "@prisma/client";
import db from "@/lib/db";
import { inngest } from "@/inngest/client";
import { getCurrentUser } from "@/modules/auth/actions";
import { spendCredit } from "@/lib/consume-credit";
import { ActionErrorCode, fail, ok } from "@/lib/action-result";
import { refundCredits } from "@/lib/usage";
import { closeRunningSteps } from "@/inngest/progress";

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

/** Progress steps of the chat's agent runs, oldest first (no file contents). */
export const getAgentSteps = async (chatId) => {
  const user = await getCurrentUser();
  if (!user) return fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");

  const chat = await findOwnChat(chatId, user.id);
  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");

  const steps = await db.agentStep.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    select: { id: true, promptId: true, kind: true, label: true, status: true, createdAt: true, updatedAt: true },
  });

  return ok(steps);
};

/**
 * Stops the chat's running generation: cancels the agent run, writes a "Stopped" reply and
 * refunds the credit. Files the agent already wrote stay in the sandbox.
 */
export const stopGeneration = async (chatId) => {
  const user = await getCurrentUser();
  if (!user) return fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");

  const chat = await findOwnChat(chatId, user.id);
  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");

  const prompt = await db.message.findFirst({ where: { chatId }, orderBy: { createdAt: "desc" } });
  // Already finished (or never started): nothing to stop.
  if (prompt?.role !== MessageRole.USER) return ok({ stopped: false });

  try {
    await inngest.send({ name: "code-agent/cancel", data: { chatId } });

    // The reply ends the generation for the UI; the run checks for it before saving.
    await db.message.create({
      data: { chatId, content: "Stopped. Your credit has been refunded.", role: MessageRole.ASSISTANT, type: MessageType.RESULT },
    });
    await closeRunningSteps({ promptId: prompt.id }, "stopped");
    await refundCredits(user.clerkId);

    return ok({ stopped: true });
  } catch (error) {
    console.error("stopGeneration failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not stop the generation. Please try again.");
  }
};
