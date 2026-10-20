"use server";

import db from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export const onBoardUser = async () => {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    const { id, firstName, lastName, imageUrl, emailAddresses, primaryEmailAddress } = user;
    const email = (primaryEmailAddress ?? emailAddresses[0])?.emailAddress || "";
    const profile = {
      name:
        firstName && lastName
          ? `${firstName} ${lastName}`
          : firstName || lastName || null,
      image: imageUrl || null,
      email,
    };

    let newUser = await db.user.findUnique({ where: { clerkId: id } });

    if (newUser) {
      newUser = await db.user.update({ where: { clerkId: id }, data: profile });
    } else {
      // A user can come back with a new Clerk id (e.g. after moving from Clerk's
      // development instance to production). Their email is verified by Clerk, so
      // link the existing row instead of failing on the unique email.
      const verified = (primaryEmailAddress ?? emailAddresses[0])?.verification?.status === "verified";
      const existing = verified && email ? await db.user.findUnique({ where: { email } }) : null;

      newUser = existing
        ? await db.user.update({ where: { id: existing.id }, data: { ...profile, clerkId: id } })
        : await db.user.create({ data: { ...profile, clerkId: id } });
    }

    return {
      success: true,
      user: newUser,
      message: "User onboarded successfully",
    };
  } catch (error) {
    console.error("❌ Error onboarding user:", error);
    return {
      success: false,
      error: "Failed to onboard user",
    };
  }
};

export const getCurrentUser = async () => {
    try {
      const user = await currentUser();
  
      if (!user) {
        return null;
      }
  
      const dbUser = await db.user.findUnique({
        where: {
          clerkId: user.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          clerkId: true,
        },
      });
  
      return dbUser;
    } catch (error) {
      console.error("❌ Error fetching current user:", error);
      return null;
    }
  };
