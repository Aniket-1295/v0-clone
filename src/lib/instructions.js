// Standing rules the agent always follows. Stored per project and per chat; both are
// appended to the system prompt. Chat rules win when they conflict with project rules.

export const MAX_INSTRUCTIONS_LENGTH = 2000;

/**
 * Trims instructions. Empty is allowed (clears the rules). Returns { instructions }
 * or { error }.
 */
export const validateInstructions = (value) => {
  if (value == null) return { instructions: "" };
  if (typeof value !== "string") return { error: "Instructions must be text." };
  const instructions = value.trim();
  if (instructions.length > MAX_INSTRUCTIONS_LENGTH) {
    return {
      error: `Instructions are too long. Keep them under ${MAX_INSTRUCTIONS_LENGTH.toLocaleString("en-US")} characters.`,
    };
  }
  return { instructions };
};

/**
 * Builds the system-prompt block from project and/or chat rules. Empty when both are
 * blank. Chat overrides project when they conflict. User rules never override the
 * agent's file-safety or runtime rules.
 */
export const buildInstructionsNote = ({ project = "", chat = "" } = {}) => {
  const projectText = typeof project === "string" ? project.trim() : "";
  const chatText = typeof chat === "string" ? chat.trim() : "";
  if (!projectText && !chatText) return "";

  const parts = [
    "",
    "User preferences for this app (follow them when building). They do not override the file-safety or runtime rules above. When project and chat instructions conflict, follow the chat instructions.",
  ];
  if (projectText) {
    parts.push("", "Project instructions:", projectText);
  }
  if (chatText) {
    parts.push("", "Chat instructions:", chatText);
  }
  return parts.join("\n");
};

/**
 * Loads project and chat instruction text for a chat. Missing chat → empty rules
 * (do not fail the agent run).
 */
export const loadChatInstructions = async (db, chatId) => {
  if (!chatId) return { project: "", chat: "" };
  const row = await db.chat.findFirst({
    where: { id: chatId },
    select: {
      instructions: true,
      project: { select: { instructions: true } },
    },
  });
  if (!row) return { project: "", chat: "" };
  return {
    project: row.project?.instructions ?? "",
    chat: row.instructions ?? "",
  };
};
