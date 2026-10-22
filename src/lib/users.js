import db from "@/lib/db";

/**
 * The profile fields we keep for a Clerk user. Accepts both shapes Clerk sends:
 * the Backend API user from currentUser() (camelCase) and a webhook payload (snake_case).
 */
export const profileFromClerk = (user) => {
  const firstName = user.firstName ?? user.first_name;
  const lastName = user.lastName ?? user.last_name;
  const emails = (user.emailAddresses ?? user.email_addresses ?? []).map((email) => ({
    id: email.id,
    address: email.emailAddress ?? email.email_address,
    verified: email.verification?.status === "verified",
  }));
  const primaryId = user.primaryEmailAddressId ?? user.primary_email_address_id;
  const primary = emails.find((email) => email.id === primaryId) ?? emails[0];

  return {
    clerkId: user.id,
    name: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null,
    image: (user.imageUrl ?? user.image_url) || null,
    email: primary?.address || "",
    emailVerified: !!primary?.verified,
  };
};

/** Creates or updates the database row for a Clerk user. */
export const upsertClerkUser = async (clerkUser) => {
  const { clerkId, emailVerified, ...profile } = profileFromClerk(clerkUser);

  const existing = await db.user.findUnique({ where: { clerkId } });
  if (existing) return db.user.update({ where: { clerkId }, data: profile });

  // A user can come back with a new Clerk id (e.g. after moving from Clerk's
  // development instance to production). Their email is verified by Clerk, so
  // link the existing row instead of failing on the unique email.
  const byEmail = emailVerified && profile.email ? await db.user.findUnique({ where: { email: profile.email } }) : null;

  return byEmail
    ? db.user.update({ where: { id: byEmail.id }, data: { ...profile, clerkId } })
    : db.user.create({ data: { ...profile, clerkId } });
};

/** Removes a deleted Clerk user and, by cascade, their projects and chats. */
export const deleteClerkUser = (clerkId) => db.user.deleteMany({ where: { clerkId } });
