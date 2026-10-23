"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GithubIcon, LockIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time-ago";
import { useGetProjects } from "@/modules/projects/hooks/project";
import { useActiveWorkspace } from "@/modules/teams/hooks";
import { useGithubBranches, useGithubRepos, useImportGithubRepo, useImportStatus } from "../hooks";

const GITHUB_NOTICES = {
  connected: ["success", "GitHub connected."],
  cancelled: ["error", "GitHub connection was cancelled."],
  failed: ["error", "Could not connect GitHub. Please try again."],
  "not-configured": ["error", "GitHub is not set up on this server."],
};

const Field = ({ label, hint, children }) => (
  <label className="block space-y-1.5">
    <span className="text-sm font-medium">{label}</span>
    {children}
    {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
  </label>
);

const inputClass = "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/30";

const ConnectCard = ({ configured }) => (
  <div className="rounded-xl border bg-card p-8 text-center">
    <GithubIcon className="mx-auto size-8" />
    <h2 className="mt-4 font-medium">Connect your GitHub account</h2>
    <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
      {configured
        ? "Connect GitHub to see your repositories. You can disconnect it at any time from a chat's Settings."
        : "GitHub is not set up on this server (GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET)."}
    </p>
    {configured && (
      <Button asChild className="mt-6">
        <a href="/api/github/connect?return=import">
          <GithubIcon className="size-4" /> Connect GitHub
        </a>
      </Button>
    )}
  </div>
);

/** Import from GitHub: pick a repository, a branch and optionally a folder; it becomes a new chat. */
export default function ImportPage({ githubNotice }) {
  const router = useRouter();
  const status = useImportStatus();
  const connected = !!status.data?.connected;
  const repos = useGithubRepos({ enabled: connected });
  const { data: projects } = useGetProjects();
  const { isPersonal } = useActiveWorkspace();
  const importRepo = useImportGithubRepo();

  const [query, setQuery] = useState("");
  const [repo, setRepo] = useState(null);
  const [branch, setBranch] = useState("");
  const [folder, setFolder] = useState("");
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState(null);
  const branches = useGithubBranches(repo?.fullName);

  useEffect(() => {
    const notice = GITHUB_NOTICES[githubNotice];
    if (notice) toast[notice[0]](notice[1]);
  }, [githubNotice]);

  if (status.isPending) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-5" />
      </div>
    );
  }

  const needle = query.trim().toLowerCase();
  const visibleRepos = (repos.data ?? []).filter((r) => !needle || r.fullName.toLowerCase().includes(needle));

  const chooseRepo = (next) => {
    setRepo(next);
    setBranch(next.defaultBranch);
    setFolder("");
    setError(null);
  };

  const submit = async () => {
    if (!repo || importRepo.isPending) return;
    if (!isPersonal && !projectId) {
      setError("Pick a project first. Team chats cannot be drafts.");
      return;
    }
    setError(null);
    try {
      const chat = await importRepo.mutateAsync({
        repo: repo.fullName,
        branch: branch || repo.defaultBranch,
        folder,
        projectId: projectId || null,
      });
      router.push(`/chat/${chat.id}`);
    } catch (importError) {
      setError(importError.message || "Could not import the repository.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Import from GitHub</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start a chat from an existing Next.js app. Its code becomes the first version, with a live preview you can keep
        changing by chat.
      </p>

      <div className="mt-8">
        {!connected ? (
          <ConnectCard configured={!!status.data?.configured} />
        ) : (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
            <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center gap-2 border-b px-3 py-2">
                <SearchIcon className="size-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Search ${status.data.login ? `@${status.data.login}'s ` : ""}repositories`}
                  aria-label="Search repositories"
                  className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <ul className="max-h-[26rem] overflow-y-auto">
                {repos.isPending && (
                  <li className="flex justify-center py-10">
                    <Spinner className="size-4" />
                  </li>
                )}
                {repos.isError && <li className="px-4 py-6 text-sm text-red-500">{repos.error.message}</li>}
                {repos.data && visibleRepos.length === 0 && (
                  <li className="px-4 py-6 text-sm text-muted-foreground">No repositories match.</li>
                )}
                {visibleRepos.map((item) => (
                  <li key={item.fullName}>
                    <button
                      type="button"
                      onClick={() => chooseRepo(item)}
                      aria-pressed={repo?.fullName === item.fullName}
                      className={cn(
                        "flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-accent cursor-pointer",
                        repo?.fullName === item.fullName && "bg-accent"
                      )}
                    >
                      <GithubIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm">
                          <span className="truncate">{item.fullName}</span>
                          {item.private && <LockIcon className="size-3 shrink-0 text-muted-foreground" />}
                        </span>
                        {item.description && <span className="block truncate text-xs text-muted-foreground">{item.description}</span>}
                      </span>
                      {item.pushedAt && <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(item.pushedAt)}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              {repo ? (
                <>
                  <p className="truncate text-sm">
                    Importing <span className="font-medium">{repo.fullName}</span>
                  </p>
                  <Field label="Branch">
                    <select value={branch} onChange={(event) => setBranch(event.target.value)} className={inputClass} disabled={branches.isPending}>
                      {(branches.data ?? [repo.defaultBranch]).map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Folder" hint="Leave empty for the repository root, or name the app folder in a monorepo (e.g. apps/web).">
                    <input value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="Repository root" className={inputClass} />
                  </Field>
                  <Field label="Project">
                    <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className={inputClass}>
                      {isPersonal ? <option value="">No project (Drafts)</option> : <option value="">Pick a project</option>}
                      {projects?.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {error && <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
                  <Button className="w-full" onClick={submit} disabled={importRepo.isPending}>
                    {importRepo.isPending ? (
                      <>
                        <Spinner className="size-4" /> Importing...
                      </>
                    ) : (
                      "Import"
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Only Next.js apps. Text files are imported; images and other binary files, lockfiles and hidden files
                    (like .env) are left out. Importing costs no credits.
                  </p>
                </>
              ) : (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Choose a repository to import.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
