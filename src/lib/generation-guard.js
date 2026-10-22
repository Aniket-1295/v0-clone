import db from "@/lib/db";
import { ActionErrorCode, fail } from "@/lib/action-result";
import { GENERATION_IN_PROGRESS_MESSAGE, RUN_STALE_MS, findRunningChatId } from "@/lib/generation-limits";

/**
 * One generation at a time per user. Returns a failed action result while one of the
 * user's chats is still generating, or null. Checked before a credit is spent; the
 * code-agent function's per-user concurrency limit backs it up against races.
 */
export const checkNoRunningGeneration = async (userId) => {
  const recentMessages = await db.message.findMany({
    where: { chat: { userId }, createdAt: { gte: new Date(Date.now() - RUN_STALE_MS) } },
    orderBy: { createdAt: "desc" },
    select: { chatId: true, role: true, createdAt: true },
  });

  return findRunningChatId(recentMessages) ? fail(ActionErrorCode.GENERATION_IN_PROGRESS, GENERATION_IN_PROGRESS_MESSAGE) : null;
};
