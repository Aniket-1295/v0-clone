// Model tiers shown in the prompt boxes' model picker. Pure (no database or SDK), so the
// client and the server share it. Which Gemini models each tier runs on lives in
// src/inngest/gemini.js (tierModels).

export const MODEL_TIERS = [
  { id: "mini", name: "v0 Mini", description: "Fast generation for everyday apps", credits: 1, plan: null },
  { id: "pro", name: "v0 Pro", description: "Thinks longer for complex, multi-page apps", credits: 2, plan: null },
  { id: "max", name: "v0 Max", description: "Our strongest model for the hardest builds", credits: 4, plan: "pro" },
];

export const DEFAULT_TIER_ID = "mini";
// When Max's model is out of quota or busy, a Max run continues on this tier and costs its price.
export const MAX_FALLBACK_TIER_ID = "pro";

/** The tier with this id, or the default tier for unknown or missing ids (older runs). */
export const getTier = (id) => MODEL_TIERS.find((tier) => tier.id === id) ?? MODEL_TIERS[0];

export const creditsLabel = (credits) => `${credits} ${credits === 1 ? "credit" : "credits"}`;

/** "Your credit has been refunded." / "Your 4 credits have been refunded." */
export const refundNote = (credits) =>
  credits === 1 ? "Your credit has been refunded." : `Your ${credits} credits have been refunded.`;

/**
 * The tier a generation may run on. `id` comes from the client; `hasPro` is whether the
 * user is on the Pro plan. Returns { tier }, or { error } (with `upgrade` when the plan is the problem).
 */
export const resolveTier = (id, hasPro) => {
  if (id != null && !MODEL_TIERS.some((tier) => tier.id === id)) return { error: "Unknown model." };
  const tier = getTier(id);
  if (tier.plan === "pro" && !hasPro) return { error: `${tier.name} is available on the Pro plan. Upgrade to use it.`, upgrade: true };
  return { tier };
};

/** Shown when a tier costs more credits than the user has left. */
export const notEnoughCreditsMessage = (tier, remaining) =>
  remaining > 0 && remaining < tier.credits
    ? `${tier.name} costs ${creditsLabel(tier.credits)} and you have ${creditsLabel(remaining)} left. Pick a smaller model or upgrade.`
    : "You have run out of credits. Upgrade to keep generating.";
