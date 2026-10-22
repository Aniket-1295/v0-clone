// A command runs in the chat's own E2B sandbox (isolated), as the chat owner, in the app
// root. One-shot commands only: long-running ones (a dev server) are cut off at the timeout.
export const TERMINAL_CWD = "/home/user";
export const TERMINAL_TIMEOUT_MS = 60_000;
export const MAX_COMMAND_LENGTH = 2000;
// Output past this is cut (a runaway command can print megabytes); keep the tail.
export const MAX_OUTPUT_BYTES = 60_000;

/** Trims a command and checks its length. Returns { command } or { error }. */
export const validateCommand = (value) => {
  if (typeof value !== "string") return { error: "Enter a command to run." };
  const command = value.trim();
  if (!command) return { error: "Enter a command to run." };
  if (command.length > MAX_COMMAND_LENGTH) {
    return { error: `Command is too long. Keep it under ${MAX_COMMAND_LENGTH.toLocaleString("en-US")} characters.` };
  }
  return { command };
};

/** Keeps the last MAX_OUTPUT_BYTES of output, with a leading note when anything was cut. */
export const clampOutput = (text) => {
  if (typeof text !== "string" || text.length <= MAX_OUTPUT_BYTES) return text || "";
  return `… (earlier output trimmed)\n${text.slice(-MAX_OUTPUT_BYTES)}`;
};
