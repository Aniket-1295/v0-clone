"use server";

import db from "@/lib/db";
import { upsertClerkUser } from "@/lib/users";
import { currentUser } from "@clerk/nextjs/server";

const USER_FIELDS = {
  id: true,
  email: true,
  name: true,
  image: true,
  clerkId: true,
};

/**
 * The signed-in user's database row. Users are created by the Clerk webhook
 * (/api/webhooks/clerk); if it has not arrived yet (or is not configured),
 * the row is created here on first use.
 */
export const getCurrentUser = async () => {
  try {
    const user = await currentUser();

    if (!user) {
      return null;
    }

    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: USER_FIELDS,
    });
    if (dbUser) return dbUser;

    const created = await upsertClerkUser(user);
    return Object.fromEntries(Object.keys(USER_FIELDS).map((key) => [key, created[key]]));
  } catch (error) {
    console.error("❌ Error fetching current user:", error);
    return null;
  }
};
