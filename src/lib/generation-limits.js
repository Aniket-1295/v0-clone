// Limits on starting generations. Pure (no database), so the prompt boxes use them too.

export const MAX_PROMPT_LENGTH = 4000;

// A prompt with no reply after this long is a stuck run, not a running one.
export const RUN_STALE_MS = 15 * 60 * 1000;

export const GENERATION_IN_PROGRESS_MESSAGE =
  "A generation is already running. Wait for it to finish, or stop it, before starting another.";

/** Trims a prompt and checks its length. Returns { prompt } or { error }. */
export const validatePrompt = (value) => {
  if (typeof value !== "string") return { error: "Describe what you want to build." };
  const prompt = value.trim();
  if (!prompt) return { error: "Describe what you want to build." };
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { error: `Your prompt is too long. Keep it under ${MAX_PROMPT_LENGTH.toLocaleString("en-US")} characters.` };
  }
  return { prompt };
};

/**
 * The chat with a generation still running, from a user's recent messages (newest first,
 * each { chatId, role, createdAt }), or null. A run is going while its chat's latest message
 * is the user's prompt: every way a run ends (reply, error, Stop) writes a reply after it.
 */
export const findRunningChatId = (recentMessages, now = Date.now()) => {
  const seen = new Set();
  for (const { chatId, role, createdAt } of recentMessages) {
    if (seen.has(chatId)) continue;
    seen.add(chatId);
    if (role === "USER" && now - new Date(createdAt).getTime() < RUN_STALE_MS) return chatId;
  }
  return null;
};
