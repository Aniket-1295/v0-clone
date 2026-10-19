"use client";

import { useRouter } from "next/navigation";
import { FolderIcon, HomeIcon, LayoutTemplateIcon, MessageSquareIcon, MessagesSquareIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { timeAgo } from "@/lib/time-ago";
import { useGetChats } from "@/modules/chats/hooks/chat";
import { useGetProjects } from "@/modules/projects/hooks/project";

const PAGES = [
  { label: "Home", href: "/", icon: HomeIcon },
  { label: "Projects", href: "/projects", icon: FolderIcon },
  { label: "Chats", href: "/chats", icon: MessagesSquareIcon },
  { label: "Templates", href: "/templates", icon: LayoutTemplateIcon },
];

/** Cmd+K palette over chats, projects and pages. */
export default function SearchDialog({ open, onOpenChange }) {
  const router = useRouter();
  const { data: chats } = useGetChats("all", { enabled: open });
  const { data: projects } = useGetProjects({ enabled: open });

  const go = (href) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Search chats, projects and pages">
      <CommandInput placeholder="Search chats and projects..." />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {chats?.length > 0 && (
          <CommandGroup heading="Chats">
            {chats.slice(0, 20).map((chat) => (
              <CommandItem key={chat.id} value={`chat ${chat.title} ${chat.id}`} onSelect={() => go(`/chat/${chat.id}`)}>
                <MessageSquareIcon className="size-4" />
                <span className="truncate">{chat.title}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {chat.project?.name ?? "Drafts"} · {timeAgo(chat.updatedAt)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {projects?.length > 0 && (
          <CommandGroup heading="Projects">
            {projects.map((project) => (
              <CommandItem key={project.id} value={`project ${project.name} ${project.id}`} onSelect={() => go(`/projects/${project.id}`)}>
                <FolderIcon className="size-4" />
                <span className="truncate">{project.name}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{timeAgo(project.updatedAt)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Go to">
          {PAGES.map(({ label, href, icon: Icon }) => (
            <CommandItem key={href} value={`page ${label}`} onSelect={() => go(href)}>
              <Icon className="size-4" /> {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
