import { cn } from "@/lib/utils";
import { MAX_PROMPT_LENGTH } from "@/lib/generation-limits";

// Shown once a prompt nears the limit; red when it is over and cannot be sent.
const SHOW_FROM = MAX_PROMPT_LENGTH * 0.8;

export const isPromptTooLong = (text) => text.trim().length > MAX_PROMPT_LENGTH;

export function PromptLength({ text, className }) {
  const length = text.trim().length;
  if (length < SHOW_FROM) return null;

  return (
    <span
      aria-live="polite"
      className={cn("text-xs tabular-nums text-muted-foreground", length > MAX_PROMPT_LENGTH && "text-red-500", className)}
    >
      {length.toLocaleString("en-US")} / {MAX_PROMPT_LENGTH.toLocaleString("en-US")}
    </span>
  );
}
