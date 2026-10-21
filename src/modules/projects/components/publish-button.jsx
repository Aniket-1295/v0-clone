"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, CopyIcon, ExternalLinkIcon, GlobeIcon, RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { showActionError } from "@/lib/show-action-error";
import { usePublishChat, usePublishStatus } from "@/modules/chats/hooks/chat";

const hostOf = (url) => url?.replace(/^https?:\/\//, "");

/**
 * v0-style Publish: deploys the chat's latest version to a permanent URL on Vercel.
 * The popover shows the live link, an Update button when a newer version exists, and the
 * build error when a publish fails.
 */
const PublishButton = ({ chatId }) => {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const { data: publish } = usePublishStatus(chatId);
  const publishChat = usePublishChat(chatId);

  if (!publish) return null;

  const building = publish.status === "building" || publishChat.isPending;
  const published = publish.status === "ready" && publish.url;
  const failed = publish.status === "error" && !publishChat.isPending;
  const disabledReason = !publish.configured
    ? "Publishing is not set up yet (VERCEL_TOKEN)."
    : !publish.canPublish
      ? "Send a prompt first: there is no generated app to publish yet."
      : null;

  const start = () =>
    publishChat.mutate(undefined, {
      onError: (error) => showActionError(error, router, "Could not publish this chat."),
    });

  const copy = () => {
    navigator.clipboard.writeText(publish.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          className={cn(
            "h-8 gap-1.5 bg-foreground text-background hover:bg-foreground/90",
            failed && "bg-red-600 text-white hover:bg-red-600/90"
          )}
        >
          {building ? (
            <Spinner className="size-3.5" />
          ) : failed ? (
            <TriangleAlertIcon className="size-3.5" />
          ) : published ? (
            <span className="size-2 rounded-full bg-green-500" />
          ) : (
            <GlobeIcon className="size-3.5" />
          )}
          {building ? "Publishing…" : failed ? "Publish failed" : published ? "Published" : "Publish"}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-medium">Publish</p>
          <p className="text-xs text-muted-foreground">
            {building
              ? "Building on Vercel. This usually takes 1–2 minutes."
              : failed
                ? "The last publish failed on Vercel. Ask for a fix in the chat, or try again."
                : published
                  ? `Live${publish.publishedAt ? `, updated ${formatDistanceToNow(new Date(publish.publishedAt), { addSuffix: true })}` : ""}.`
                  : "Put this app online at a permanent link anyone can open."}
          </p>
        </div>

        <div className="flex flex-col gap-3 p-4">
          {published && (
            <div className="flex items-center gap-1.5">
              <a
                href={publish.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate rounded-md border bg-muted/50 px-2.5 py-1.5 text-xs hover:text-foreground"
              >
                {hostOf(publish.url)}
              </a>
              <Button variant="outline" size="icon" className="size-8 shrink-0" aria-label="Copy link" onClick={copy}>
                {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
              </Button>
              <Button variant="outline" size="icon" className="size-8 shrink-0" aria-label="Open site" asChild>
                <a href={publish.url} target="_blank" rel="noreferrer">
                  <ExternalLinkIcon className="size-3.5" />
                </a>
              </Button>
            </div>
          )}

          {failed && publish.error && (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-red-500/30 bg-red-500/10 p-2 text-[11px] leading-relaxed text-red-700 dark:text-red-400">
              {publish.error}
            </pre>
          )}

          {published && !publish.isLatestPublished && !building && (
            <p className="text-xs text-muted-foreground">A newer version is not published yet.</p>
          )}

          {disabledReason ? (
            <p className="text-xs text-muted-foreground">{disabledReason}</p>
          ) : (
            <Button
              size="sm"
              className={cn("w-full gap-1.5", !(published && publish.isLatestPublished) && "bg-foreground text-background hover:bg-foreground/90")}
              variant={published && publish.isLatestPublished ? "outline" : "default"}
              disabled={building}
              onClick={start}
            >
              {building ? (
                <Spinner className="size-3.5" />
              ) : published || failed ? (
                <RefreshCwIcon className="size-3.5" />
              ) : (
                <GlobeIcon className="size-3.5" />
              )}
              {building ? "Publishing…" : failed ? "Try again" : published ? (publish.isLatestPublished ? "Republish" : "Update") : "Publish"}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PublishButton;
