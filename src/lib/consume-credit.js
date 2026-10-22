import { consumeCredits, hasProPlan } from "@/lib/usage";
import { ActionErrorCode, fail } from "@/lib/action-result";
import { notEnoughCreditsMessage, resolveTier } from "@/lib/model-tiers";

/** The model tier the signed-in user asked for. Returns { tier } or { error: failed action result }. */
export const resolveUserTier = async (tierId) => {
  const { tier, error, upgrade } = resolveTier(tierId, await hasProPlan());
  if (!error) return { tier };
  return { error: fail(upgrade ? ActionErrorCode.UPGRADE_REQUIRED : ActionErrorCode.INVALID_INPUT, error) };
};

/** Spends a tier's credits. Returns a failed action result, or null on success. */
export const spendCredit = async (tier) => {
  try {
    await consumeCredits(tier.credits);
    return null;
  } catch (error) {
    // rate-limiter-flexible rejects with a RateLimiterRes (not an Error) when the
    // user has too few points left; anything else is a real failure.
    if (error instanceof Error) {
      console.error("consumeCredits failed:", error);
      return fail(ActionErrorCode.INTERNAL, "Something went wrong. Please try again.");
    }
    return fail(ActionErrorCode.TOO_MANY_REQUESTS, notEnoughCreditsMessage(tier, error.remainingPoints ?? 0));
  }
};
