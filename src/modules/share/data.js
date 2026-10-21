import db from "@/lib/db";
import { isHostedPreview } from "@/lib/sandbox";

// How long the share page waits for a sandbox before calling the preview asleep.
const PREVIEW_CHECK_MS = 4000;

const isUp = async (url) => {
  try {
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(PREVIEW_CHECK_MS), cache: "no-store" });
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
};

/**
 * A shared chat for the public read-only page, or null. Only what the page shows: no user
 * details, credits or other chats. File trees are sent for the latest version only.
 * preview: { mode: "live" | "published" | "asleep", url? }. Sandboxes are never started
 * for visitors: a live preview is shown only if the sandbox is already running.
 */
export const getSharedChat = async (shareId) => {
  if (!shareId) return null;
  const chat = await db.chat.findUnique({
    where: { shareId },
    select: {
      id: true,
      title: true,
      publishStatus: true,
      publishedUrl: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          type: true,
          content: true,
          createdAt: true,
          fragments: { select: { id: true, title: true, sandboxUrl: true, files: true } },
          attachments: { select: { id: true } },
        },
      },
    },
  });
  if (!chat) return null;

  const latest = chat.messages.findLast((message) => message.fragments)?.fragments ?? null;
  const messages = chat.messages.map((message) => ({
    ...message,
    fragments: message.fragments && {
      id: message.fragments.id,
      title: message.fragments.title,
      sandboxUrl: message.fragments.sandboxUrl,
    },
  }));

  let preview = { mode: "asleep" };
  if (latest && (isHostedPreview(latest) || (await isUp(latest.sandboxUrl)))) {
    preview = { mode: "live", url: latest.sandboxUrl };
  } else if (chat.publishStatus === "ready" && chat.publishedUrl) {
    preview = { mode: "published", url: chat.publishedUrl };
  }

  return {
    title: chat.title,
    messages,
    latest: latest && { id: latest.id, title: latest.title, files: latest.files },
    preview,
  };
};
