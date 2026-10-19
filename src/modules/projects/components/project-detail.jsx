"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRightIcon, GlobeIcon, MessageSquareIcon, MessageSquarePlusIcon, RocketIcon, StarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time-ago";
import { showActionError } from "@/lib/show-action-error";
import TemplateThumbnail from "@/modules/templates/components/template-thumbnail";
import ChatActions from "@/modules/chats/components/chat-actions";
import { useGetProjectById, useStarProject } from "../hooks/project";
import ProjectActions from "./project-actions";

export default function ProjectDetail({ projectId }) {
  const router = useRouter();
  const { data: project, isPending, error } = useGetProjectById(projectId);
  const star = useStarProject();

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="text-muted-foreground">{error.message}</p>
        <Button asChild variant="outline" className="mt-4"><Link href="/projects">Back to projects</Link></Button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-12">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  const latest = project.latestVersion;
  const chats = project.chats.map((chat) => ({ ...chat, projectId: project.id }));

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex min-w-0 items-center gap-2 text-3xl font-semibold tracking-tight">
          <Link href="/projects" className="text-muted-foreground transition-colors hover:text-foreground">Projects</Link>
          <ChevronRightIcon className="size-6 shrink-0 text-muted-foreground" />
          <span className="truncate">{project.name}</span>
        </h1>
        <button
          type="button"
          aria-label={project.starred ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={project.starred}
          onClick={() => star.mutateAsync([project.id, !project.starred]).catch((e) => showActionError(e, router))}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
        >
          <StarIcon className={cn("size-5", project.starred && "fill-current text-amber-400")} />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <ProjectActions project={project} showOpen={false} />
          <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
            <Link href={`/?project=${project.id}`}>
              <MessageSquarePlusIcon className="size-4" /> New Chat
            </Link>
          </Button>
        </div>
      </div>

      <section className="mt-10 overflow-hidden rounded-xl border bg-card dark:bg-neutral-950">
        <h2 className="border-b px-5 py-3.5 font-medium">Production Deployment</h2>
        <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,320px)_1fr]">
          <div className="overflow-hidden rounded-lg border bg-muted">
            {latest ? (
              <TemplateThumbnail src={latest.sandboxUrl} />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center text-sm text-muted-foreground">No versions yet</div>
            )}
          </div>
          <ul className="divide-y text-sm">
            <li className="flex items-center gap-3 py-3">
              <span className="size-2.5 rounded-full bg-muted-foreground/50" />
              Not published
            </li>
            <li className="flex items-center gap-3 py-3 text-muted-foreground">
              <GlobeIcon className="size-4" />
              {latest ? (
                <Link href={`/chat/${latest.message.chatId}`} className="truncate text-foreground hover:underline">
                  Latest version: {latest.title}
                </Link>
              ) : (
                "Start a chat to create the first version."
              )}
            </li>
            <li className="flex items-center gap-3 py-3 text-muted-foreground">
              <RocketIcon className="size-4" />
              One-click publishing to a live URL is coming soon.
            </li>
            {latest && <li className="py-3 text-muted-foreground">Last generated {timeAgo(latest.createdAt)}</li>}
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Recent Chats</h2>
          {chats.length > 0 && (
            <Link href={`/chats?scope=${project.id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              View All <ChevronRightIcon className="size-4" />
            </Link>
          )}
        </div>
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-24 text-center">
            <p className="font-medium">No chats yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Start a new chat to begin building</p>
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card dark:bg-neutral-950">
            {chats.slice(0, 8).map((chat) => (
              <li key={chat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50">
                <MessageSquareIcon className="size-4 text-muted-foreground" />
                <Link href={`/chat/${chat.id}`} className="min-w-0 flex-1 truncate text-sm">{chat.title}</Link>
                <span className="text-sm text-muted-foreground">{timeAgo(chat.updatedAt)}</span>
                <ChatActions chat={chat} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
