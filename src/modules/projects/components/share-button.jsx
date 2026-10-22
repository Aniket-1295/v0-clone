"use client";

import { Share2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ShareSection from "./share-section";

/** Header shortcut: the same share controls as the Settings panel. */
const ShareButton = ({ chatId }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button size="sm" variant="outline" className="h-8 gap-1.5">
        <Share2Icon className="size-3.5" />
        Share
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-80 p-0">
      <ShareSection chatId={chatId} />
    </PopoverContent>
  </Popover>
);

export default ShareButton;
