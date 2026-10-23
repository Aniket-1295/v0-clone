import db from "@/lib/db";
import { findAccessibleChat } from "@/lib/teams";
import { getCurrentUser } from "@/modules/auth/actions";

// Serves an image attached to a prompt, to the chat's owner or a teammate.
export async function GET(_request, { params }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const attachment = await db.attachment.findFirst({
    where: { id },
    select: { mimeType: true, data: true, message: { select: { chatId: true } } },
  });
  if (!attachment) return new Response("Not found", { status: 404 });
  if (!(await findAccessibleChat(db, attachment.message.chatId, user.id))) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(attachment.data, {
    headers: {
      "Content-Type": attachment.mimeType,
      // Attachments never change; the id is the cache key.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
