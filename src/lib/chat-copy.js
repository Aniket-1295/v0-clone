// Pure helpers for duplicating a chat (no database), shared by the action and its tests.

// renameChat keeps titles within this length too.
const MAX_TITLE_LENGTH = 120;

/** "Landing page" -> "Landing page (copy)", kept within the title length the app uses. */
export const copyTitle = (title) => {
  const suffix = " (copy)";
  const base = title.trim() || "Untitled";
  return base.length + suffix.length > MAX_TITLE_LENGTH
    ? `${base.slice(0, MAX_TITLE_LENGTH - suffix.length - 3)}...${suffix}`
    : `${base}${suffix}`;
};
