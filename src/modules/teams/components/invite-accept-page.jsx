"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { UsersIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { visibleActionError } from "@/lib/action-result";
import { useAcceptInvite, useInvitePreview } from "../hooks";

export default function InviteAcceptPage({ token }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { data, isPending, error } = useInvitePreview(token);
  const accept = useAcceptInvite();
  const started = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !data || data.expired || data.accepted || started.current) return;
    started.current = true;
    accept.mutate(token, {
      onSuccess: () => router.replace("/projects"),
    });
  }, [accept, data, isLoaded, isSignedIn, router, token]);

  const message = accept.error
    ? visibleActionError(accept.error, "Could not accept this invite.")
    : error
      ? visibleActionError(error, "Invite not found.")
      : data?.accepted
        ? "This invite has already been used."
        : data?.expired
          ? "This invite has expired."
          : null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <UsersIcon className="size-5" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">
        {data?.teamName ? `Join ${data.teamName}` : "Team invite"}
      </h1>
      {data?.email && (
        <p className="mt-2 text-sm text-muted-foreground">This invite was sent to {data.email}.</p>
      )}

      {isPending || !isLoaded || (isSignedIn && data && !message && (accept.isPending || !accept.error)) ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" /> {isSignedIn ? "Accepting…" : "Loading…"}
        </p>
      ) : message ? (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">{message}</p>
      ) : null}

      {!isSignedIn && isLoaded && data && !data.expired && !data.accepted && (
        <Button asChild className="mt-6">
          <Link href={`/sign-in?redirect_url=/invite/${token}`}>Sign in to accept</Link>
        </Button>
      )}

      {message && (
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">Home</Link>
        </Button>
      )}
    </div>
  );
}
