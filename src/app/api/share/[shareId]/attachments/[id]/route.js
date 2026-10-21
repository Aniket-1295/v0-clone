import db from "@/lib/db";

// Serves an image attached to a prompt in a shared chat, for its public read-only page.
export async function GET(_request, { params }) {
  const { shareId, id } = await params;
  const attachment = await db.attachment.findFirst({
    where: { id, message: { chat: { shareId } } },
    select: { mimeType: true, data: true },
  });
  if (!attachment) return new Response("Not found", { status: 404 });

  return new Response(attachment.data, {
    headers: {
      "Content-Type": attachment.mimeType,
      // Not immutable: the owner can stop sharing at any time.
      "Cache-Control": "public, max-age=300",
    },
  });
}
