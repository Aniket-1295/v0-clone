import { consumeCredits } from "@/lib/usage";
import { ActionErrorCode, fail } from "@/lib/action-result";

const OUT_OF_CREDITS_MESSAGE = "You have run out of credits. Upgrade to keep generating.";

/** Spends one generation credit. Returns a failed action result, or null on success. */
export const spendCredit = async () => {
  try {
    await consumeCredits();
    return null;
  } catch (error) {
    // rate-limiter-flexible rejects with a RateLimiterRes (not an Error) when
    // the user is out of points; anything else is a real failure.
    if (error instanceof Error) {
      console.error("consumeCredits failed:", error);
      return fail(ActionErrorCode.INTERNAL, "Something went wrong. Please try again.");
    }
    return fail(ActionErrorCode.TOO_MANY_REQUESTS, OUT_OF_CREDITS_MESSAGE);
  }
};
