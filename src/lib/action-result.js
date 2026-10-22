/**
 * Result envelope for server actions.
 *
 * Next.js masks thrown error messages in production, so actions return a
 * plain object instead of throwing. Client hooks call `unwrap` to turn a
 * failed result back into an Error that carries the machine-readable `code`.
 */

export const ActionErrorCode = {
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  // The chosen model needs a paid plan.
  UPGRADE_REQUIRED: "UPGRADE_REQUIRED",
  GENERATION_IN_PROGRESS: "GENERATION_IN_PROGRESS",
  INVALID_INPUT: "INVALID_INPUT",
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL: "INTERNAL",
};

export const ok = (data) => ({ ok: true, data });

export const fail = (code, message) => ({ ok: false, code, message });

/** Throws an Error with `.code` when the result is a failure; returns `data` otherwise. */
export const unwrap = (result) => {
  if (result?.ok) {
    return result.data;
  }

  const error = new Error(result?.message || "Something went wrong");
  error.code = result?.code || ActionErrorCode.INTERNAL;
  throw error;
};

/** Next.js replaces thrown server-action errors with this digest text in production. */
export const isMaskedNextError = (message) =>
  typeof message === "string" && message.includes("Server Components render");

/** Safe text for the UI: never show a Next.js production digest. */
export const visibleActionError = (error, fallback) => {
  const message = error?.message || "";
  if (!message || isMaskedNextError(message)) return fallback;
  return message;
};
