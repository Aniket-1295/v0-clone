import Link from "next/link";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { TEMPLATES } from "@/templates/registry";
import AppPrompt from "./app-prompt";

/** Signed-in home: what v0 shows after sign-in, a single prompt to start a chat. */
export default function AppHome({ projectId }) {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center px-4 pb-24">
      <div className="flex w-full max-w-[44rem] flex-col items-center">
        <Link
          href="/templates"
          className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs md:text-sm text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/30 dark:bg-black"
        >
          <LayoutGrid className="size-3.5" />
          <span>
            Start from <span className="font-medium text-foreground">{TEMPLATES.length} templates</span>
          </span>
          <ChevronRight className="size-3.5" />
        </Link>
        <h1 className="mb-6 text-center text-3xl md:text-4xl font-semibold tracking-tight">What do you want to create?</h1>
        <AppPrompt initialProjectId={projectId ?? null} />
      </div>
    </div>
  );
}
