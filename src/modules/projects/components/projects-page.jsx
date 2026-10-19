"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  FolderIcon,
  FolderPlusIcon,
  ListFilterIcon,
  MessageSquarePlusIcon,
  SearchIcon,
  StarIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/time-ago";
import { useAppShell } from "@/modules/app/components/app-shell";
import { useGetProjects } from "../hooks/project";
import ProjectActions from "./project-actions";

const SORTS = {
  updated: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
  created: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  name: (a, b) => a.name.localeCompare(b.name),
};

export default function ProjectsPage() {
  const router = useRouter();
  const { openNewProject } = useAppShell();
  const { data: projects, isPending } = useGetProjects();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("updated");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const searchRef = useRef(null);

  // "/" focuses search, like v0.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const q = query.trim().toLowerCase();
  const visible = (projects ?? [])
    .filter((p) => (!favoritesOnly || p.starred) && (!q || p.name.toLowerCase().includes(q)))
    .sort((a, b) => (b.starred - a.starred) || SORTS[sort](a, b));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Projects</h1>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-card px-3 text-sm focus-within:border-foreground/30 dark:bg-neutral-950">
          <SearchIcon className="size-4 text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Projects"
            aria-label="Search projects"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border px-1.5 font-mono text-xs text-muted-foreground">/</kbd>
        </label>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 dark:bg-neutral-950">
              <ListFilterIcon className="size-4" /> Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
              <DropdownMenuRadioItem value="updated">Recently updated</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="created">Recently created</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={favoritesOnly} onCheckedChange={setFavoritesOnly}>
              Favorites only
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-10 bg-foreground text-background hover:bg-foreground/90">
              Add New <ChevronDownIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={openNewProject}>
              <FolderPlusIcon className="size-4" /> Project
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/"><MessageSquarePlusIcon className="size-4" /> Chat</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card dark:bg-neutral-950">
        {isPending ? (
          <div className="divide-y">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <Skeleton className="size-7 rounded-md" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">{projects?.length ? "No projects match your filters." : "No projects yet."}</p>
            {!projects?.length && (
              <Button variant="outline" onClick={openNewProject}>
                <FolderPlusIcon className="size-4" /> New project
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y">
            {visible.map((project) => (
              <li
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="group grid cursor-pointer grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-4 py-3.5 hover:bg-accent/50 md:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto_auto]"
              >
                <span className="flex size-7 items-center justify-center rounded-md border bg-background dark:bg-black">
                  <FolderIcon className="size-4 text-muted-foreground" />
                </span>
                <Link href={`/projects/${project.id}`} onClick={(e) => e.stopPropagation()} className="flex min-w-0 items-center gap-2 font-medium">
                  <span className="truncate">{project.name}</span>
                  {project.starred && <StarIcon className="size-3.5 shrink-0 fill-current text-amber-400" />}
                </Link>
                <span className="hidden items-center gap-2 whitespace-nowrap text-sm text-muted-foreground md:flex">
                  <span className="size-2 rounded-full bg-muted-foreground/40" /> Not published
                </span>
                <span className="hidden truncate text-sm text-muted-foreground md:block">
                  {project._count.chats} {project._count.chats === 1 ? "chat" : "chats"}
                </span>
                <span className="text-sm text-muted-foreground">{timeAgo(project.updatedAt)}</span>
                <ProjectActions project={project} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
