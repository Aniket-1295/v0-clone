"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLinkIcon, MoreHorizontalIcon, PencilIcon, StarIcon, StarOffIcon, Trash2Icon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { showActionError } from "@/lib/show-action-error";
import RenameDialog from "@/modules/app/components/rename-dialog";
import ConfirmDialog from "@/modules/app/components/confirm-dialog";
import { useDeleteProject, useRenameProject, useStarProject } from "../hooks/project";

/** The "..." menu for a project: open, rename, star, delete. */
export default function ProjectActions({ project, className, align = "end", showOpen = true }) {
  const router = useRouter();
  const pathname = usePathname();
  const [dialog, setDialog] = useState(null);
  const rename = useRenameProject();
  const star = useStarProject();
  const remove = useDeleteProject();

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
          aria-label={`Actions for ${project.name}`}
          className={cn("flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer", className)}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-48" onClick={(e) => e.stopPropagation()}>
          {showOpen && (
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}`}>
                <ExternalLinkIcon className="size-4" /> Open
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setDialog("rename")}>
            <PencilIcon className="size-4" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run(star.mutateAsync([project.id, !project.starred]), project.starred ? "Removed from favorites" : "Added to favorites")}>
            {project.starred ? <StarOffIcon className="size-4" /> : <StarIcon className="size-4" />}
            {project.starred ? "Unfavorite" : "Favorite"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialog("delete")} className="text-red-600 focus:text-red-600">
            <Trash2Icon className="size-4 text-red-600" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameDialog
        open={dialog === "rename"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Rename project"
        initialValue={project.name}
        onSubmit={async (name) => {
          await run(rename.mutateAsync([project.id, name]));
          setDialog(null);
        }}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Delete this project?"
        description={`"${project.name}" and every chat in it will be permanently deleted.`}
        onConfirm={async () => {
          await run(remove.mutateAsync([project.id]), "Project deleted");
          if (pathname.startsWith(`/projects/${project.id}`)) router.push("/projects");
        }}
      />
    </>
  );
}
