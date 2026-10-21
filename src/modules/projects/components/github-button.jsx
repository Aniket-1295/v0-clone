"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExternalLinkIcon, GithubIcon, UploadIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { showActionError } from "@/lib/show-action-error";
import { useDisconnectGithub, useGithubStatus, usePushToGithub } from "@/modules/chats/hooks/chat";

const RETURN_MESSAGES = {
  connected: ["success", "GitHub connected"],
  cancelled: ["info", "GitHub connection cancelled"],
  failed: ["error", "Could not connect GitHub. Please try again."],
  "not-configured": ["error", "GitHub export is not set up yet."],
};

/**
 * Push to GitHub: connect the user's own GitHub account (OAuth), create a repository for
 * the chat's app, and push later versions to it as new commits.
 */
const GithubButton = ({ chatId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: github } = useGithubStatus(chatId);
  const push = usePushToGithub(chatId);
  const disconnect = useDisconnectGithub(chatId);
  const [repoName, setRepoName] = useState(null);
  const [isPrivate, setIsPrivate] = useState(true);

  // Coming back from GitHub's approval page (?github=connected and so on).
  const returned = searchParams.get("github");
  useEffect(() => {
    if (!returned || !RETURN_MESSAGES[returned]) return;
    const [kind, message] = RETURN_MESSAGES[returned];
    toast[kind](message);
    router.replace(pathname, { scroll: false });
  }, [returned, pathname, router]);

  if (!github) return null;

  const name = repoName ?? github.suggestedName;
  const pushNow = () =>
    push.mutate(
      { repoName: name, isPrivate },
      {
        onSuccess: (data) => toast.success(`Pushed to ${data.repo}`),
        onError: (error) => showActionError(error, router, "Could not push to GitHub."),
      }
    );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1.5">
          <GithubIcon className="size-3.5" />
          GitHub
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-medium">GitHub</p>
          <p className="text-xs text-muted-foreground">
            {github.repo
              ? `Linked to ${github.repo}.${github.pushedAt ? ` Pushed ${formatDistanceToNow(new Date(github.pushedAt), { addSuffix: true })}.` : ""}`
              : "Put this app's code in a repository in your own GitHub account."}
          </p>
        </div>

        <div className="flex flex-col gap-3 p-4">
          {!github.configured ? (
            <p className="text-xs text-muted-foreground">GitHub export is not set up yet (GITHUB_CLIENT_ID).</p>
          ) : !github.connected ? (
            <Button asChild size="sm" className="w-full gap-1.5 bg-foreground text-background hover:bg-foreground/90">
              <a href={`/api/github/connect?chatId=${encodeURIComponent(chatId)}`}>
                <GithubIcon className="size-3.5" /> Connect GitHub
              </a>
            </Button>
          ) : !github.canPush ? (
            <p className="text-xs text-muted-foreground">Send a prompt first: there is no generated app to push yet.</p>
          ) : (
            <>
              {github.repo ? (
                <a
                  href={github.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 truncate rounded-md border bg-muted/50 px-2.5 py-1.5 text-xs hover:text-foreground"
                >
                  <span className="truncate">{github.repo}</span>
                  <ExternalLinkIcon className="ml-auto size-3.5 shrink-0" />
                </a>
              ) : (
                <>
                  <Input
                    value={name}
                    onChange={(event) => setRepoName(event.target.value)}
                    aria-label="Repository name"
                    placeholder="repository-name"
                    className="h-8 font-mono text-xs"
                  />
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} />
                    Private repository
                  </label>
                </>
              )}
              <Button
                size="sm"
                className="w-full gap-1.5 bg-foreground text-background hover:bg-foreground/90"
                disabled={push.isPending || (github.repo && github.upToDate) || (!github.repo && !name.trim())}
                onClick={pushNow}
              >
                {push.isPending ? <Spinner className="size-3.5" /> : <UploadIcon className="size-3.5" />}
                {github.repo ? (github.upToDate ? "Up to date" : "Push latest version") : "Create repository and push"}
              </Button>
            </>
          )}

          {github.connected && (
            <p className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Connected as @{github.login}</span>
              <button
                type="button"
                className="underline-offset-2 hover:text-foreground hover:underline cursor-pointer"
                disabled={disconnect.isPending}
                onClick={() => disconnect.mutate(undefined, { onError: (error) => showActionError(error, router) })}
              >
                Disconnect
              </button>
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default GithubButton;
