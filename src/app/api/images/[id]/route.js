import db from "@/lib/db";

// Serves an image the agent generated for an app. Public on purpose: the app loads it in the
// preview, from a download, a GitHub repo or a published site. The id (a cuid) is the only key.
export async function GET(_request, { params }) {
  const { id } = await params;
  const image = await db.generatedImage.findUnique({ where: { id }, select: { mimeType: true, data: true } });
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(image.data, {
    headers: {
      "Content-Type": image.mimeType,
      // Generated images never change; the id is the cache key.
      "Cache-Control": "public, max-age=31536000, immutable",
      // Apps on other origins (sandboxes, published sites) embed it.
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}
