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

/** Whether the signed-in user is on the Pro plan. */
export async function hasProPlan() {
  const { has } = await auth();
  return has({ plan: "pro" });
}

export async function getUsageTracker() {
  return createUsageTracker((await hasProPlan()) ? PRO_POINTS : FREE_POINTS);
}

/**
 * Spends `cost` credits. Rejects with the RateLimiterRes (not an Error) when the user has
 * fewer than `cost` left; the rejected points are given back first, so a model the user
 * cannot afford does not eat the credits they still have.
 */
export async function consumeCredits(cost = GENERATION_COST) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const usageTracker = await getUsageTracker();
  try {
    return await usageTracker.consume(userId, cost);
  } catch (rejection) {
    if (rejection instanceof Error) throw rejection;
    await usageTracker.reward(userId, cost);
    throw Object.assign(rejection, {
      remainingPoints: Math.max(0, usageTracker.points - (rejection.consumedPoints - cost)),
    });
  }
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