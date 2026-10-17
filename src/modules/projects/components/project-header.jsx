import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  EditIcon,
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
import { useGetProjectById } from "../hooks/project";
import { Spinner } from "@/components/ui/spinner";

const ProjectHeader = ({ projectId, children }) => {
  const { data: project, isPending } = useGetProjectById(projectId);
  const { setTheme, theme } = useTheme();

  return (
    <header className="h-12 shrink-0 px-2 flex justify-between items-center gap-2 border-b">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={"ghost"}
            size={"sm"}
            className={
              "h-8 min-w-0 gap-2 !pl-1.5 focus-visible:ring-0"
            }
          >
            <Image
              src={"/logo.svg"}
              alt="v0"
              width={24}
              height={24}
              className="shrink-0 invert dark:invert-0"
            />
            <span className="text-muted-foreground/60">/</span>
            <span className="truncate text-sm font-medium">
              {isPending ? <Spinner /> : project?.name || "Untitled Project"}
            </span>
            <ChevronDownIcon className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent side={"bottom"} align={"start"}>
          <DropdownMenuItem asChild>
            <Link href={"/"}>
              <ChevronLeftIcon className="size-4" />
              <span>All projects</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={"gap-2"}>
              <SunMoonIcon className="size-4 text-muted-foreground" />
              <span>Appearance</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent sideOffset={5}>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="light">
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </header>
  );
};

export default ProjectHeader;