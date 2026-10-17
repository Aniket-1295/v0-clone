import { RateLimiterPrisma } from "rate-limiter-flexible";
import db from "./db";
import { auth } from "@clerk/nextjs/server";

export const FREE_POINTS = 5;
export const PRO_POINTS = 100;
export const DURATION = 30 * 24 * 60 * 60; // 30 days
export const GENERATION_COST = 1;

function createUsageTracker(points) {
  return new RateLimiterPrisma({
    storeClient: db,
    tableName: "Usage",
    points,
    duration: DURATION,
  });
}

export async function getUsageTracker() {
  const { has } = await auth();

  const hasProAccess = has({ plan: "pro" });

  return createUsageTracker(hasProAccess ? PRO_POINTS : FREE_POINTS);
}

export async function consumeCredits() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.consume(userId, GENERATION_COST);

  return result;
}

/**
 * Give back credits consumed by `consumeCredits`.
 *
 * Runs outside a request (Inngest failure handler), so the Clerk user id is
 * passed in explicitly instead of being read from `auth()`. The point budget
 * only affects the computed `remainingPoints`; the stored counter is shared.
 */
export async function refundCredits(clerkUserId, points = GENERATION_COST) {
  const usageTracker = createUsageTracker(FREE_POINTS);
  const current = await usageTracker.get(clerkUserId);

  // Nothing to refund if the window expired or nothing was consumed.
  if (!current || current.consumedPoints < points) {
    return null;
  }

  return usageTracker.reward(clerkUserId, points);
}

export async function getUsageStatus() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const usageTracker = await getUsageTracker();

  try {
    const result = await usageTracker.get(userId);

    if (!result) {
      return null;
    }

    return result;
  } catch (error) {
    // Handle case where user has no record yet
    console.error("Error getting usage:", error);
    return null;
  }
}