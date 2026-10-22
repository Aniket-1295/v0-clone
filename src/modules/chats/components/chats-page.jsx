"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckIcon, ChevronDownIcon, FolderIcon, InboxIcon, MessageSquareIcon, MessageSquarePlusIcon, SearchIcon, StarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/time-ago";
import { useGetProjects } from "@/modules/projects/hooks/project";
import { useGetChats } from "../hooks/chat";
import ChatActions from "./chat-actions";

/** All chats, filterable by project or drafts, with search. */
export default function ChatsPage({ initialScope = "all" }) {
  const router = useRouter();
  const [scope, setScope] = useState(initialScope);
  const [query, setQuery] = useState("");
  const { data: chats, isPending } = useGetChats(scope);
  const { data: projects } = useGetProjects();

  const pickScope = (next) => {
    setScope(next);
    router.replace(next === "all" ? "/chats" : `/chats?scope=${next}`, { scroll: false });
  };

  const scopeLabel = scope === "all" ? "All chats" : scope === "drafts" ? "Drafts" : projects?.find((p) => p.id === scope)?.name ?? "Project";
  const q = query.trim().toLowerCase();
  const visible = (chats ?? []).filter((c) => !q || c.title.toLowerCase().includes(q));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Chats</h1>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-card px-3 text-sm focus-within:border-foreground/30 dark:bg-neutral-950">
          <SearchIcon className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Chats"
            aria-label="Search chats"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 max-w-60 dark:bg-neutral-950">
              <span className="truncate">{scopeLabel}</span> <ChevronDownIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
            <DropdownMenuItem onSelect={() => pickScope("all")}>
              <MessageSquareIcon className="size-4" /> All chats {scope === "all" && <CheckIcon className="ml-auto size-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => pickScope("drafts")}>
              <InboxIcon className="size-4" /> Drafts {scope === "drafts" && <CheckIcon className="ml-auto size-4" />}
            </DropdownMenuItem>
            {projects?.length > 0 && <DropdownMenuSeparator />}
            {projects?.map((p) => (
              <DropdownMenuItem key={p.id} onSelect={() => pickScope(p.id)}>
                <FolderIcon className="size-4" /> <span className="truncate">{p.name}</span>
                {scope === p.id && <CheckIcon className="ml-auto size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button asChild className="h-10 bg-foreground text-background hover:bg-foreground/90">
          <Link href={scope !== "all" && scope !== "drafts" ? `/?project=${scope}` : "/"}>
            <MessageSquarePlusIcon className="size-4" /> New Chat
          </Link>
        </Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card dark:bg-neutral-950">
        {isPending ? (
          <div className="divide-y">
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-4 py-4"><Skeleton className="h-4 w-64" /></div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-muted-foreground">{chats?.length ? "No chats match your search." : "No chats yet."}</p>
        ) : (
          <ul className="divide-y">
            {visible.map((chat) => (
              <li key={chat.id} onClick={() => router.push(`/chat/${chat.id}`)} className="flex cursor-pointer items-center gap-3 px-4 py-3.5 hover:bg-accent/50">
                <MessageSquareIcon className="size-4 shrink-0 text-muted-foreground" />
                <Link href={`/chat/${chat.id}`} onClick={(e) => e.stopPropagation()} className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{chat.title}</span>
                  {chat.starred && <StarIcon aria-label="Favorite" className="size-3.5 shrink-0 fill-current text-amber-500" />}
                </Link>
                <span className="hidden max-w-48 items-center gap-1.5 truncate text-sm text-muted-foreground sm:flex">
                  {chat.project ? <FolderIcon className="size-3.5 shrink-0" /> : <InboxIcon className="size-3.5 shrink-0" />}
                  <span className="truncate">{chat.project?.name ?? "Drafts"}</span>
                </span>
                <span className="w-16 text-right text-sm text-muted-foreground">{timeAgo(chat.updatedAt)}</span>
                <ChatActions chat={chat} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
