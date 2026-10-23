import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTier, notEnoughCreditsMessage, refundNote, resolveTier } from "@/lib/model-tiers";

describe("resolveTier", () => {
  it("defaults to Mini when no tier is sent (older clients)", () => {
    expect(resolveTier(null, false).tier.id).toBe("mini");
    expect(resolveTier(undefined, true).tier.id).toBe("mini");
  });

  it("lets every plan use Mini and Pro", () => {
    expect(resolveTier("pro", false).tier).toMatchObject({ id: "pro", credits: 2 });
  });

  it("keeps Max for the Pro plan", () => {
    expect(resolveTier("max", true).tier).toMatchObject({ id: "max", credits: 4 });
    expect(resolveTier("max", false)).toMatchObject({ upgrade: true, error: expect.stringContaining("Pro plan") });
  });

  it("rejects unknown tiers", () => {
    expect(resolveTier("ultra", true)).toEqual({ error: "Unknown model." });
  });
});

describe("credit messages", () => {
  it("treats missing tiers on stored prompts as Mini", () => {
    expect(getTier(null).credits).toBe(1);
  });

  it("names the cost when the user has some credits but not enough", () => {
    expect(notEnoughCreditsMessage(getTier("max"), 1)).toBe(
      "Max costs 4 credits and you have 1 credit left. Pick a smaller model or upgrade."
    );
    expect(notEnoughCreditsMessage(getTier("mini"), 0)).toMatch(/run out of credits/);
  });

  it("words refunds by amount", () => {
    expect(refundNote(1)).toBe("Your credit has been refunded.");
    expect(refundNote(4)).toBe("Your 4 credits have been refunded.");
  });
});

describe("tierModels", () => {
  beforeEach(() => vi.resetModules());

  it("runs Mini and Pro on the Flash rotation, Pro thinking harder", async () => {
    const { AGENT_MODELS, tierModels } = await import("@/inngest/gemini");
    expect(tierModels("mini")).toEqual({ models: AGENT_MODELS, primary: AGENT_MODELS, thinkingLevel: "LOW" });
    expect(tierModels("pro")).toMatchObject({ models: AGENT_MODELS, thinkingLevel: "HIGH" });
  });

  it("tries Max's models first and falls back to Flash", async () => {
    const { AGENT_MODELS, MAX_MODELS, tierModels } = await import("@/inngest/gemini");
    const max = tierModels("max");
    expect(max.models).toEqual([...MAX_MODELS, ...AGENT_MODELS]);
    expect(max.primary).toEqual(MAX_MODELS);
    expect(max.primary).not.toContain(AGENT_MODELS[0]);
  });
});

// Clerk and the rate limiter stand-ins: the limiter rejects like rate-limiter-flexible does
// (after counting the points), so consumeCredits must give them back.
const limiter = vi.hoisted(() => ({ consumed: 0, points: 5 }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "user_1", has: () => false }) }));
vi.mock("rate-limiter-flexible", () => ({
  RateLimiterPrisma: class {
    constructor({ points }) {
      this.points = points;
    }
    async consume(_key, cost) {
      limiter.consumed += cost;
      const res = { consumedPoints: limiter.consumed, remainingPoints: Math.max(0, this.points - limiter.consumed) };
      if (limiter.consumed > this.points) throw res;
      return res;
    }
    async reward(_key, points) {
      limiter.consumed -= points;
    }
  },
}));

describe("spendCredit", () => {
  beforeEach(() => Object.assign(limiter, { consumed: 0 }));

  it("charges the tier's credits", async () => {
    const { spendCredit } = await import("@/lib/consume-credit");
    expect(await spendCredit(getTier("pro"))).toBeNull();
    expect(limiter.consumed).toBe(2);
  });

  it("refuses a tier the user cannot afford without spending what is left", async () => {
    const { spendCredit } = await import("@/lib/consume-credit");
    limiter.consumed = 4;
    const result = await spendCredit(getTier("pro"));
    expect(result).toMatchObject({ ok: false, code: "TOO_MANY_REQUESTS" });
    expect(result.message).toBe("Pro costs 2 credits and you have 1 credit left. Pick a smaller model or upgrade.");
    expect(limiter.consumed).toBe(4);
    // The last credit still pays for Mini.
    expect(await spendCredit(getTier("mini"))).toBeNull();
  });
});
