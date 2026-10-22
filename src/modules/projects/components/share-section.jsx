"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, CopyIcon, ExternalLinkIcon, Share2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { showActionError } from "@/lib/show-action-error";
import { useGetChat, useShareChat, useUnshareChat } from "@/modules/chats/hooks/chat";

const useOrigin = () =>
  useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ""
  );

/** Share: a read-only public link to the chat and its latest version, which can be turned off. */
const ShareSection = ({ chatId }) => {
  const router = useRouter();
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const { data: chat } = useGetChat(chatId);
  const share = useShareChat(chatId);
  const unshare = useUnshareChat(chatId);

  if (!chat) return null;

  const link = chat.shareId ? `${origin}/share/${chat.shareId}` : null;
  const busy = share.isPending || unshare.isPending;
  const onError = (error) => showActionError(error, router, "Could not update sharing.");

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">Share</p>
        <p className="text-xs text-muted-foreground">
          {link
            ? "Anyone with this link can view the chat and its latest version. They cannot change anything."
            : "Create a read-only link to this chat and its latest version."}
        </p>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {link ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="min-w-0 flex-1 truncate rounded-md border bg-muted/50 px-2.5 py-1.5 text-xs">{link}</span>
              <Button variant="outline" size="icon" className="size-8 shrink-0" aria-label="Copy link" onClick={copy}>
                {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
              </Button>
              <Button variant="outline" size="icon" className="size-8 shrink-0" aria-label="Open shared page" asChild>
                <a href={link} target="_blank" rel="noreferrer">
                  <ExternalLinkIcon className="size-3.5" />
                </a>
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
              disabled={busy}
              onClick={() => unshare.mutate(undefined, { onError })}
            >
              {unshare.isPending && <Spinner className="size-3.5" />}
              Stop sharing
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="w-full gap-1.5 bg-foreground text-background hover:bg-foreground/90"
            disabled={busy}
            onClick={() => share.mutate(undefined, { onError })}
          >
            {share.isPending ? <Spinner className="size-3.5" /> : <Share2Icon className="size-3.5" />}
            Create link
          </Button>
        )}
      </div>
    </>
  );
};

export default ShareSection;
