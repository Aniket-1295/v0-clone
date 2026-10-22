import { cn } from "@/lib/utils";
import { MAX_PROMPT_LENGTH } from "@/lib/generation-limits";

/**
 * Character counter near a limit. Shown from 80% of `max` (default: the prompt
 * limit); turns red when over. Use a different `max` for Instructions.
 */
export const isPromptTooLong = (text, max = MAX_PROMPT_LENGTH) => text.trim().length > max;

export function PromptLength({ text, className, max = MAX_PROMPT_LENGTH }) {
  const length = text.trim().length;
  const showFrom = max * 0.8;
  if (length < showFrom) return null;

  return (
    <span
      aria-live="polite"
      className={cn("text-xs tabular-nums text-muted-foreground", length > max && "text-red-500", className)}
    >
      {length.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
    </span>
  );
}
