"use client";
import React, { useState } from "react";
import Link from "next/link";
import { SignedIn } from "@clerk/nextjs";
import {
  ChevronRight,
  Clapperboard,
  FolderOpen,
  House,
  LayoutDashboard,
  MonitorPlay,
  Music,
  ShoppingBag,
  Shuffle,
  Sparkles,
  SquareKanban,
} from "lucide-react";

import { PROJECT_TEMPLATES } from "@/constant";
import ProjectsForm, { usePromptForm } from "./ProjectsForm";
import ProjectList from "./project-list";
import IdeaGrid from "./idea-grid";

const CHIP_ICONS = {
  media: Clapperboard,
  dashboard: LayoutDashboard,
  kanban: SquareKanban,
  files: FolderOpen,
  video: MonitorPlay,
  store: ShoppingBag,
  listings: House,
  music: Music,
};

const CHIPS_PER_PAGE = 4;

const HomeView = () => {
  const form = usePromptForm();
  const [chipPage, setChipPage] = useState(0);

  const pageCount = Math.ceil(PROJECT_TEMPLATES.length / CHIPS_PER_PAGE);
  const chips = PROJECT_TEMPLATES.slice(
    chipPage * CHIPS_PER_PAGE,
    (chipPage + 1) * CHIPS_PER_PAGE
  );

  const pickPrompt = (prompt) => {
    form.setValue("content", prompt, { shouldValidate: true, shouldDirty: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
    form.setFocus("content");
  };

  return (
    <div className="w-full px-4">
      <section className="mx-auto flex max-w-2xl flex-col items-center pt-16 pb-20 md:pt-24 md:pb-28">
        <Link
          href="/pricing"
          className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs md:text-sm text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/30"
        >
          <Sparkles className="size-3.5" />
          <span>
            Free credits to start. <span className="text-foreground font-medium">See plans</span>
          </span>
          <ChevronRight className="size-3.5" />
        </Link>

        <h1 className="mb-6 text-center text-3xl md:text-4xl font-semibold tracking-tight text-balance">
          What do you want to create?
        </h1>

        <div className="w-full">
          <ProjectsForm form={form} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {chips.map((template) => {
            const Icon = CHIP_ICONS[template.preview];
            return (
              <button
                key={template.label}
                type="button"
                onClick={() => pickPrompt(template.prompt)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-background px-3 text-xs md:text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
              >
                <Icon className="size-3.5" />
                {template.label}
              </button>
            );
          })}
          <button
            type="button"
            aria-label="Show other ideas"
            onClick={() => setChipPage((page) => (page + 1) % pageCount)}
            className="inline-flex size-8 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
          >
            <Shuffle className="size-3.5" />
          </button>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 pb-24">
        {/* getProjects requires a session; anonymous visitors used to trigger a 500 per visit. */}
        <SignedIn>
          <ProjectList />
        </SignedIn>

        <IdeaGrid onPick={pickPrompt} />
      </div>
    </div>
  );
};

export default HomeView;
