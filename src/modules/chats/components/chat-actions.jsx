"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CopyIcon, FolderIcon, FolderInputIcon, InboxIcon, MoreHorizontalIcon, PencilIcon, StarIcon, StarOffIcon, Trash2Icon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { showActionError } from "@/lib/show-action-error";
import { useGetProjects } from "@/modules/projects/hooks/project";
import RenameDialog from "@/modules/app/components/rename-dialog";
import ConfirmDialog from "@/modules/app/components/confirm-dialog";
import { useDeleteChat, useDuplicateChat, useMoveChat, useRenameChat, useStarChat } from "../hooks/chat";

/** The "..." menu for a chat: rename, favorite, duplicate, move to a project or drafts, delete. */
export default function ChatActions({ chat, className, align = "end" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [dialog, setDialog] = useState(null);
  const { data: projects } = useGetProjects();
  const rename = useRenameChat();
  const move = useMoveChat();
  const remove = useDeleteChat();
  const star = useStarChat();
  const duplicate = useDuplicateChat();

  const duplicateAndOpen = async () => {
    try {
      const copy = await duplicate.mutateAsync([chat.id]);
      toast.success("Chat duplicated");
      router.push(`/chat/${copy.id}`);
    } catch (error) {
      showActionError(error, router);
    }
  };

  const run = async (promise, success) => {
    try {
      await promise;
      if (success) toast.success(success);
    } catch (error) {
      showActionError(error, router);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${chat.title}`}
          className={cn("flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer", className)}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-48" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setDialog("rename")}>
            <PencilIcon className="size-4" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run(star.mutateAsync([chat.id, !chat.starred]), chat.starred ? "Removed from favorites" : "Added to favorites")}>
            {chat.starred ? <StarOffIcon className="size-4" /> : <StarIcon className="size-4" />}
            {chat.starred ? "Unfavorite" : "Favorite"}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={duplicate.isPending} onSelect={duplicateAndOpen}>
            <CopyIcon className="size-4" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <FolderInputIcon className="size-4 text-muted-foreground" /> Move to
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="max-h-72 w-52 overflow-y-auto">
                <DropdownMenuItem disabled={!chat.projectId} onSelect={() => run(move.mutateAsync([chat.id, null]), "Moved to drafts")}>
                  <InboxIcon className="size-4" /> Drafts
                </DropdownMenuItem>
                {projects?.length > 0 && <DropdownMenuSeparator />}
                {projects?.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    disabled={project.id === chat.projectId}
                    onSelect={() => run(move.mutateAsync([chat.id, project.id]), `Moved to ${project.name}`)}
                  >
                    <FolderIcon className="size-4" /> <span className="truncate">{project.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialog("delete")} className="text-red-600 focus:text-red-600">
            <Trash2Icon className="size-4 text-red-600" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameDialog
        open={dialog === "rename"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Rename chat"
        initialValue={chat.title}
        onSubmit={async (title) => {
          await run(rename.mutateAsync([chat.id, title]));
          setDialog(null);
        }}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Delete this chat?"
        description={`"${chat.title}" and all of its versions will be permanently deleted.`}
        onConfirm={async () => {
          await run(remove.mutateAsync([chat.id]), "Chat deleted");
          if (pathname === `/chat/${chat.id}`) router.push("/");
        }}
      />
    </>
  );
}
