import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  ChevronDownIcon,
  FolderIcon,
  HomeIcon,
  MessagesSquareIcon,
  SunMoonIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { useGetChat } from "@/modules/chats/hooks/chat";

/** Top bar of the chat workspace: app menu, then Project (or Drafts) / chat title. */
const ProjectHeader = ({ chatId, children }) => {
  const { data: chat, isPending } = useGetChat(chatId);
  const { setTheme, theme } = useTheme();

  return (
    <header className="h-12 shrink-0 px-2 flex justify-between items-center gap-2 border-b">
      <div className="flex min-w-0 items-center gap-1 text-sm">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 !pl-1.5 focus-visible:ring-0" aria-label="App menu">
              <Image src="/logo.svg" alt="v0" width={24} height={24} className="shrink-0 invert dark:invert-0" />
              <ChevronDownIcon className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start">
            <DropdownMenuItem asChild>
              <Link href="/"><HomeIcon className="size-4" /> Home</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/projects"><FolderIcon className="size-4" /> Projects</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/chats"><MessagesSquareIcon className="size-4" /> Chats</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                <SunMoonIcon className="size-4 text-muted-foreground" />
                <span>Appearance</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent sideOffset={5}>
                  <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                    <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-muted-foreground/60">/</span>
        {chat?.project ? (
          <Link href={`/projects/${chat.project.id}`} className="truncate rounded px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            {chat.project.name}
          </Link>
        ) : (
          <Link href="/chats?scope=drafts" className="rounded px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            Drafts
          </Link>
        )}
        <span className="text-muted-foreground/60">/</span>
        <span className="truncate px-1.5 font-medium">{isPending ? <Spinner /> : chat?.title || "Untitled chat"}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </header>
  );
};

export default ProjectHeader;
