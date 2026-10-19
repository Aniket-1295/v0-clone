import { Response } from "@/components/ai-elements/response";
import { cn } from "@/lib/utils";
import { MessageRole, MessageType } from "@prisma/client";
import { format } from "date-fns";
import { AlertCircleIcon, ChevronRightIcon, Code2Icon } from "lucide-react";
import Image from "next/image";
import React from "react";

const FragmentCard = ({ fragment, isActiveFragment, onFragmentClick }) => {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full max-w-sm items-center gap-3 rounded-lg border bg-card p-2 pr-3 text-start transition-colors hover:bg-accent cursor-pointer",
        isActiveFragment && "border-foreground/40 bg-accent"
      )}
      onClick={() => onFragmentClick(fragment)}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
        <Code2Icon className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium line-clamp-1">{fragment.title}</span>
        <span className="text-xs text-muted-foreground">
          {isActiveFragment ? "Showing in preview" : "Open preview"}
        </span>
      </div>
      <ChevronRightIcon className="size-4 text-muted-foreground" />
    </button>
  );
};

const UserMessage = ({ content }) => {
  return (
    <div className="flex justify-end pl-10">
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-xl bg-muted px-3 py-2 text-sm">
        {content}
      </div>
    </div>
  );
};

const AssistantMessage = ({
  content,
  fragment,
  createdAt,
  isActiveFragment,
  onFragmentClick,
  type,
}) => {
  const isError = type === MessageType.ERROR;

  return (
    <div className="group flex flex-col">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-md border bg-card">
          <Image
            alt="v0"
            src={"/logo.svg"}
            height={14}
            width={14}
            className="invert dark:invert-0"
          />
        </div>
        <span className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {format(new Date(createdAt), "HH:mm 'on' MMM dd, yyyy")}
        </span>
      </div>

      <div className="flex flex-col gap-y-3 pl-8 text-sm">
        {isError ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-700 dark:text-red-400">
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            <span>{content}</span>
          </div>
        ) : (
          <Response>{content}</Response>
        )}
        {fragment && type === MessageType.RESULT && (
          <FragmentCard
            fragment={fragment}
            isActiveFragment={isActiveFragment}
            onFragmentClick={onFragmentClick}
          />
        )}
      </div>
    </div>
  );
};

const MessageCard = ({
  content,
  role,
  fragment,
  createdAt,
  isActiveFragment,
  onFragmentClick,
  type,
}) => {
  if (role === MessageRole.ASSISTANT) {
    return (
      <AssistantMessage
        content={content}
        fragment={fragment}
        createdAt={createdAt}
        isActiveFragment={isActiveFragment}
        onFragmentClick={onFragmentClick}
        type={type}
      />
    );
  }

  return <UserMessage content={content} />;
};

export default MessageCard;
