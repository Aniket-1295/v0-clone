"use server";

import { MessageRole, MessageType } from "@prisma/client";
import db from "@/lib/db";
import { inngest } from "@/inngest/client";
import { getCurrentUser } from "@/modules/auth/actions";
import { resolveUserTier, spendCredit } from "@/lib/consume-credit";
import { getTier, refundNote } from "@/lib/model-tiers";
import { ActionErrorCode, fail, ok } from "@/lib/action-result";
import { refundCredits } from "@/lib/usage";
import { closeRunningSteps } from "@/inngest/progress";
import { parseImage } from "@/lib/attachments";
import { validatePrompt } from "@/lib/generation-limits";
import { checkNoRunningGeneration } from "@/lib/generation-guard";

const findOwnChat = (chatId, userId) => db.chat.findFirst({ where: { id: chatId, userId } });

/**
 * Sends a follow-up prompt (optionally with an image to recreate) and kicks off generation
 * on the model tier `tierId` (Mini when omitted). `images` lets the agent generate images.
 */
export const createMessages = async (value, chatId, image = null, tierId = null, images = false) => {
  const user = await getCurrentUser();

  if (!user) return fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");

  const { prompt, error: promptError } = validatePrompt(value);
  if (promptError) return fail(ActionErrorCode.INVALID_INPUT, promptError);

  const parsed = parseImage(image);
  if (parsed.error) return fail(ActionErrorCode.INTERNAL, parsed.error);

  const chat = await findOwnChat(chatId, user.id);

  if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");

  const { tier, error: tierError } = await resolveUserTier(tierId);
  if (tierError) return tierError;

  const runningError = await checkNoRunningGeneration(user.id);
  if (runningError) return runningError;

  const creditError = await spendCredit(tier);
  if (creditError) return creditError;

  try {
    const newMessage = await db.message.create({
      data: {
        chatId,
        content: prompt,
        role: MessageRole.USER,
        type: MessageType.RESULT,
        modelTier: tier.id,
        ...(parsed.image ? { attachments: { create: parsed.image } } : {}),
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
        value: prompt,
        chatId,
        userId: user.clerkId,
        tier: tier.id,
        images: images === true,
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

  try {
    const chat = await findOwnChat(chatId, user.id);

    if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");

    const messages = await db.message.findMany({
      where: { chatId },
      orderBy: { updatedAt: "asc" },
      // Attachment bytes are served separately by /api/attachments/[id].
      include: { fragments: true, attachments: { select: { id: true, mimeType: true } } },
    });

    return ok(messages);
  } catch (error) {
    console.error("getMessages failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not load messages.");
  }
};

/** Progress steps of the chat's agent runs, oldest first (no file contents). */
export const getAgentSteps = async (chatId) => {
  const user = await getCurrentUser();
  if (!user) return fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");

  try {
    const chat = await findOwnChat(chatId, user.id);
    if (!chat) return fail(ActionErrorCode.NOT_FOUND, "Chat not found.");

    const steps = await db.agentStep.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      select: { id: true, promptId: true, kind: true, label: true, status: true, createdAt: true, updatedAt: true },
    });

    return ok(steps);
  } catch (error) {
    console.error("getAgentSteps failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not load progress.");
  }
};

/**
 * Stops the chat's running generation: cancels the agent run, writes a "Stopped" reply and
 * refunds the prompt's credits. Files the agent already wrote stay in the sandbox.
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

    const { credits } = getTier(prompt.modelTier);
    // The reply ends the generation for the UI; the run checks for it before saving.
    await db.message.create({
      data: { chatId, content: `Stopped. ${refundNote(credits)}`, role: MessageRole.ASSISTANT, type: MessageType.RESULT },
    });
    await closeRunningSteps({ promptId: prompt.id }, "stopped");
    await refundCredits(user.clerkId, credits);

    return ok({ stopped: true });
  } catch (error) {
    console.error("stopGeneration failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not stop the generation. Please try again.");
  }
};
