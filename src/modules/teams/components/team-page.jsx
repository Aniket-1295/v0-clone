"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckIcon, CopyIcon, MailPlusIcon, Trash2Icon, UsersIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { showActionError } from "@/lib/show-action-error";
import { PERSONAL_WORKSPACE } from "@/lib/teams";
import RenameDialog from "@/modules/app/components/rename-dialog";
import {
  useActiveWorkspace,
  useDeleteTeam,
  useGetTeam,
  useInviteToTeam,
  useLeaveTeam,
  useRemoveMember,
  useRenameTeam,
  useRevokeInvite,
} from "../hooks";

export default function TeamPage() {
  const router = useRouter();
  const { workspace, isPersonal, switchTo } = useActiveWorkspace();
  const { data: team, isPending } = useGetTeam(isPersonal ? null : workspace, { enabled: !isPersonal });
  const invite = useInviteToTeam();
  const revoke = useRevokeInvite();
  const remove = useRemoveMember();
  const leave = useLeaveTeam();
  const destroy = useDeleteTeam();
  const rename = useRenameTeam();
  const [email, setEmail] = useState("");
  const [acceptUrl, setAcceptUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  if (isPersonal) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Select a team in the sidebar, or create one, to invite people and share projects.
        </p>
        <Button asChild className="mt-6">
          <Link href="/projects">Back to projects</Link>
        </Button>
      </div>
    );
  }

  if (isPending || !team) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
        <p className="mt-4 text-sm text-muted-foreground">{isPending ? "Loading…" : "Team not found."}</p>
      </div>
    );
  }

  const onError = (error) => showActionError(error, router, "Could not update the team.");

  const sendInvite = async (event) => {
    event.preventDefault();
    try {
      const result = await invite.mutateAsync([team.id, email]);
      setAcceptUrl(result.acceptUrl);
      setEmail("");
      toast.success("Invite link ready — copy it and send it yourself.");
    } catch (error) {
      onError(error);
    }
  };

  const copy = () => {
    if (!acceptUrl) return;
    navigator.clipboard.writeText(acceptUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Team</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{team.name}</h1>
        </div>
        {team.isOwner && (
          <Button variant="outline" onClick={() => setRenameOpen(true)}>Rename</Button>
        )}
      </div>

      {team.isOwner && (
        <section className="mt-10 rounded-xl border p-5">
          <div className="flex items-center gap-2">
            <MailPlusIcon className="size-4" />
            <h2 className="text-sm font-medium">Invite</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Members can open and edit every project in this team. Credits stay on each person&apos;s account.
          </p>
          <form onSubmit={sendInvite} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="invite-email" className="sr-only">Email</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
              />
            </div>
            <Button type="submit" disabled={invite.isPending || !email.trim()}>
              {invite.isPending && <Spinner className="size-3.5" />}
              Invite
            </Button>
          </form>
          {acceptUrl && (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="min-w-0 flex-1 truncate rounded-md border bg-muted/50 px-2.5 py-1.5 text-xs">{acceptUrl}</span>
              <Button type="button" variant="outline" size="icon" className="size-8 shrink-0" aria-label="Copy invite link" onClick={copy}>
                {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
              </Button>
            </div>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <UsersIcon className="size-4" /> Members
        </h2>
        <ul className="mt-3 divide-y rounded-xl border">
          {team.members.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{member.name || member.email}</p>
                <p className="truncate text-xs text-muted-foreground">{member.email} · {member.role}</p>
              </div>
              {team.isOwner && member.role !== "owner" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-500/10 hover:text-red-600"
                  disabled={remove.isPending}
                  onClick={() => remove.mutateAsync([team.id, member.userId]).catch(onError)}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {team.isOwner && team.invites.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium">Pending invites</h2>
          <ul className="mt-3 divide-y rounded-xl border">
            {team.invites.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{row.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(row.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Revoke invite for ${row.email}`}
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutateAsync(row.id).catch(onError)}
                >
                  <XIcon className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={leave.isPending}
          onClick={async () => {
            try {
              await leave.mutateAsync(team.id);
              await switchTo(PERSONAL_WORKSPACE);
              toast.success("You left the team.");
              router.push("/projects");
            } catch (error) {
              onError(error);
            }
          }}
        >
          Leave team
        </Button>
        {team.isOwner && (
          <Button
            variant="ghost"
            className="text-red-600 hover:bg-red-500/10 hover:text-red-600"
            disabled={destroy.isPending}
            onClick={async () => {
              if (!window.confirm(`Delete ${team.name}? Its projects move back to each creator's Personal workspace.`)) return;
              try {
                await destroy.mutateAsync(team.id);
                toast.success("Team deleted. Projects are back in Personal.");
                router.push("/projects");
              } catch (error) {
                onError(error);
              }
            }}
          >
            <Trash2Icon className="size-4" /> Delete team
          </Button>
        )}
      </section>

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename team"
        initialValue={team.name}
        submitLabel="Save"
        placeholder="Team name"
        onSubmit={async (name) => {
          try {
            await rename.mutateAsync([team.id, name]);
            setRenameOpen(false);
            toast.success("Team renamed.");
          } catch (error) {
            onError(error);
          }
        }}
      />
    </div>
  );
}
