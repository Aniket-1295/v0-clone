"use client";

import { GlobeIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { usePublishStatus } from "@/modules/chats/hooks/chat";
import PublishSection from "./publish-section";

/**
 * Header shortcut for publish. The popover body is the same section as Settings.
 */
const PublishButton = ({ chatId }) => {
  const { data: publish } = usePublishStatus(chatId);

  if (!publish) return null;

  const building = publish.status === "building";
  const published = publish.status === "ready" && publish.url;
  const failed = publish.status === "error";

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
        <PublishSection chatId={chatId} />
      </PopoverContent>
    </Popover>
  );
};

export default PublishButton;
