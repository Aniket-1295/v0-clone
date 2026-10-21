import { verifyWebhook } from "@clerk/nextjs/webhooks";
import * as Sentry from "@sentry/nextjs";
import { deleteClerkUser, upsertClerkUser } from "@/lib/users";

// Clerk calls this when a user is created, updated or deleted, so the database
// stays in sync without a write on every page view. Signed with Svix; the
// secret is CLERK_WEBHOOK_SIGNING_SECRET (Clerk dashboard → Webhooks).
export async function POST(request) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "user.created":
      case "user.updated":
        await upsertClerkUser(event.data);
        break;
      case "user.deleted":
        if (event.data.id) await deleteClerkUser(event.data.id);
        break;
    }
  } catch (error) {
    // A non-2xx response makes Clerk retry the delivery.
    console.error(`Clerk webhook ${event.type} failed:`, error);
    Sentry.captureException(error, { tags: { webhook: event.type } });
    return new Response("Webhook handler failed", { status: 500 });
  }

  return new Response("OK");
}
