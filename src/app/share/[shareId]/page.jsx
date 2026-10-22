import { notFound } from "next/navigation";
import { getSharedChat } from "@/modules/share/data";
import SharedChatView from "@/modules/share/components/shared-chat-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { shareId } = await params;
  const chat = await getSharedChat(shareId);
  // Shared links are unlisted: keep them out of search engines.
  return { title: chat ? chat.title : "Not found", robots: { index: false, follow: false } };
}

export default async function SharePage({ params }) {
  const { shareId } = await params;
  const chat = await getSharedChat(shareId);
  if (!chat) notFound();
  return <SharedChatView shareId={shareId} chat={JSON.parse(JSON.stringify(chat))} />;
}
