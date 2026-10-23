import Image from "next/image";
import React from "react";
import AgentProgress from "./agent-progress";
import { SITE_NAME } from "@/lib/site";

// Shown while the agent works on the latest prompt: its live steps.
const MessageLoading = ({ steps, startedAt }) => {
  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-md border bg-card">
          <Image
            src={"/logo.svg"}
            alt={SITE_NAME}
            width={14}
            height={14}
            className="shrink-0 invert dark:invert-0"
          />
        </div>
      </div>

      <div className="pl-8 flex flex-col gap-y-4">
        <AgentProgress steps={steps} startedAt={startedAt} live />
      </div>
    </div>
  );
};

export default MessageLoading;
