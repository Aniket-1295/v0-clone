"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/spinner";

// Rendered in the browser only: the markdown messages and the resizable code panels do not
// hydrate identically from server HTML, which broke the page on phones. The data still
// arrives with the page, and shared pages are not indexed, so nothing is lost.
const SharedChatView = dynamic(() => import("./shared-chat-view"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Spinner className="text-muted-foreground" />
    </div>
  ),
});

export default SharedChatView;
