"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  CrownIcon,
  FolderIcon,
  FolderPlusIcon,
  HomeIcon,
  LayoutTemplateIcon,
  ListFilterIcon,
  LogOutIcon,
  MessageSquarePlusIcon,
  MessagesSquareIcon,
  PanelLeftIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  SunMoonIcon,
  UserIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Hint } from "@/components/ui/hint";
import { cn } from "@/lib/utils";
import { useGetChats } from "@/modules/chats/hooks/chat";
import { useGetProjects } from "@/modules/projects/hooks/project";
import { useStatus } from "@/modules/usage/hooks/usage";
import ChatActions from "@/modules/chats/components/chat-actions";
import { useAppShell } from "./app-shell";

const NAV = [
  { label: "Home", href: "/", icon: HomeIcon },
  { label: "Projects", href: "/projects", icon: FolderIcon },
  { label: "Chats", href: "/chats", icon: MessagesSquareIcon },
  { label: "Templates", href: "/templates", icon: LayoutTemplateIcon },
];

const isActive = (pathname, href) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

const displayName = (user) =>
  user?.username || user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "You";

const WorkspaceSwitcher = () => {
  const { user } = useUser();
  const name = displayName(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-sidebar-accent cursor-pointer">
        <span className="size-6 shrink-0 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-sky-400" />
        <span className="truncate">{name}</span>
        <ChevronsUpDownIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
        <DropdownMenuItem>
          <span className="size-5 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-sky-400" />
          <span className="truncate">{name}</span>
          <span className="ml-1 text-xs text-muted-foreground">Personal</span>
          <CheckIcon className="ml-auto size-4" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/pricing"><CrownIcon className="size-4" /> Upgrade plan</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const NewChatButton = () => {
  const { openNewProject } = useAppShell();

  return (
    <div className="flex h-8 overflow-hidden rounded-md border bg-background text-sm font-medium dark:bg-neutral-900">
      <Link href="/" className="flex flex-1 items-center justify-center text-foreground hover:bg-accent">
        New Chat
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="More ways to start" className="flex w-8 items-center justify-center border-l hover:bg-accent cursor-pointer">
          <ChevronDownIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href="/"><MessageSquarePlusIcon className="size-4" /> New Chat</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openNewProject}>
            <FolderPlusIcon className="size-4" /> New Project
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/templates"><LayoutTemplateIcon className="size-4" /> From Template</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const EmptyBox = ({ children }) => (
  <div className="mx-2 rounded-md border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">{children}</div>
);

const DraftsGroup = ({ pathname }) => {
  const [open, setOpen] = useState(true);
  const { data: drafts, isPending } = useGetChats("drafts");

  return (
    <SidebarGroup>
      <SidebarGroupLabel asChild>
        <button type="button" onClick={() => setOpen(!open)} className="flex w-fit items-center gap-1 cursor-pointer">
          Drafts <ChevronDownIcon className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
        </button>
      </SidebarGroupLabel>
      <SidebarGroupAction asChild title="New chat">
        <Link href="/" aria-label="New draft chat"><PlusIcon /></Link>
      </SidebarGroupAction>
      {open && (
        <SidebarGroupContent>
          {!isPending && !drafts?.length ? (
            <EmptyBox>No drafts yet</EmptyBox>
          ) : (
            <SidebarMenu>
              {drafts?.slice(0, 15).map((chat) => (
                <SidebarMenuItem key={chat.id} className="group/item">
                  <SidebarMenuButton asChild isActive={pathname === `/chat/${chat.id}`} className="pr-8">
                    <Link href={`/chat/${chat.id}`}><span className="truncate">{chat.title}</span></Link>
                  </SidebarMenuButton>
                  <ChatActions
                    chat={chat}
                    className="absolute right-1 top-1 opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100"
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          )}
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
};

const ProjectsGroup = ({ pathname }) => {
  const [sort, setSort] = useState("recent");
  const { data: projects, isPending } = useGetProjects();
  const sorted = [...(projects ?? [])].sort((a, b) =>
    sort === "name" ? a.name.localeCompare(b.name) : 0
  );

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarGroupAction title="Sort projects"><ListFilterIcon /></SidebarGroupAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
            <DropdownMenuRadioItem value="recent">Recently updated</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <SidebarGroupContent>
        {!isPending && !sorted.length ? (
          <EmptyBox>No projects yet</EmptyBox>
        ) : (
          <SidebarMenu>
            {sorted.map((project) => (
              <SidebarMenuItem key={project.id}>
                <SidebarMenuButton asChild isActive={pathname.startsWith(`/projects/${project.id}`)}>
                  <Link href={`/projects/${project.id}`}>
                    <FolderIcon />
                    <span className="truncate">{project.name}</span>
                    {project.starred && <StarIcon className="ml-auto size-3 fill-current text-amber-400" />}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

const AccountRow = () => {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { theme, setTheme } = useTheme();
  const { data: usage } = useStatus();
  const credits = usage?.remainingPoints;

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent cursor-pointer">
          {user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.imageUrl} alt="" className="size-6 shrink-0 rounded-full" />
          ) : (
            <UserIcon className="size-5" />
          )}
          <span className="truncate">{displayName(user)}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
            {user?.primaryEmailAddress?.emailAddress}
          </DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => openUserProfile()}>
            <UserIcon className="size-4" /> Manage account
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <SunMoonIcon className="size-4 text-muted-foreground" /> Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem asChild>
            <Link href="/pricing"><CrownIcon className="size-4" /> Upgrade plan</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => signOut({ redirectUrl: "/" })}>
            <LogOutIcon className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {credits !== undefined && (
        <Hint text={`${credits} credits remaining`} side="top">
          <Link href="/pricing" className="flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium hover:bg-accent">
            {credits}
          </Link>
        </Hint>
      )}
    </div>
  );
};

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const { openSearch } = useAppShell();

  return (
    <Sidebar collapsible="offcanvas" className="dark:bg-black [&_[data-sidebar=sidebar]]:dark:bg-black">
      <SidebarHeader className="gap-2">
        <div className="flex items-center gap-1">
          <WorkspaceSwitcher />
          <Hint text="Toggle sidebar (⌘B)" side="bottom">
            <button type="button" onClick={toggleSidebar} aria-label="Toggle sidebar" className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground cursor-pointer">
              <PanelLeftIcon className="size-4" />
            </button>
          </Hint>
        </div>
        <NewChatButton />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={openSearch}>
                <SearchIcon /> Search
                <kbd className="ml-auto rounded border px-1 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {NAV.map(({ label, href, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton asChild isActive={isActive(pathname, href)}>
                  <Link href={href} onClick={() => href === pathname && router.refresh()}>
                    <Icon /> {label}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <DraftsGroup pathname={pathname} />
        <ProjectsGroup pathname={pathname} />
      </SidebarContent>

      <SidebarFooter>
        <AccountRow />
      </SidebarFooter>
    </Sidebar>
  );
}
