"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { CheckIcon, ChevronsUpDownIcon, CrownIcon, PlusIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { showActionError } from "@/lib/show-action-error";
import { PERSONAL_WORKSPACE } from "@/lib/teams";
import RenameDialog from "@/modules/app/components/rename-dialog";
import { useActiveWorkspace, useCreateTeam, useListWorkspaces } from "../hooks";

const displayName = (user) =>
  user?.username || user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "You";

export default function WorkspaceSwitcher() {
  const { user } = useUser();
  const name = displayName(user);
  const { data } = useListWorkspaces();
  const { workspace, team, isPersonal, switchTo } = useActiveWorkspace();
  const createTeam = useCreateTeam();
  const [newOpen, setNewOpen] = useState(false);
  const label = isPersonal ? name : team?.name || "Team";

  const onSwitch = async (id) => {
    try {
      await switchTo(id);
    } catch (error) {
      showActionError(error, undefined, "Could not switch workspace.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-sidebar-accent cursor-pointer">
          <span className="size-6 shrink-0 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-sky-400" />
          <span className="truncate">{label}</span>
          {!isPersonal && <span className="truncate text-xs text-muted-foreground">Team</span>}
          <ChevronsUpDownIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => onSwitch(PERSONAL_WORKSPACE)}>
            <span className="size-5 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-sky-400" />
            <span className="truncate">{name}</span>
            <span className="ml-1 text-xs text-muted-foreground">Personal</span>
            {isPersonal && <CheckIcon className="ml-auto size-4" />}
          </DropdownMenuItem>
          {data?.teams?.map((row) => (
            <DropdownMenuItem key={row.id} onSelect={() => onSwitch(row.id)}>
              <UsersIcon className="size-4" />
              <span className="truncate">{row.name}</span>
              {workspace === row.id && <CheckIcon className="ml-auto size-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setNewOpen(true)}>
            <PlusIcon className="size-4" /> New team
          </DropdownMenuItem>
          {!isPersonal && (
            <DropdownMenuItem asChild>
              <Link href="/team"><UsersIcon className="size-4" /> Team settings</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/pricing"><CrownIcon className="size-4" /> Upgrade plan</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        title="New team"
        placeholder="Team name"
        submitLabel="Create"
        onSubmit={async (teamName) => {
          try {
            const created = await createTeam.mutateAsync(teamName);
            setNewOpen(false);
            toast.success(`Created ${created.name}`);
          } catch (error) {
            showActionError(error, undefined, "Could not create the team.");
          }
        }}
      />
    </>
  );
}
