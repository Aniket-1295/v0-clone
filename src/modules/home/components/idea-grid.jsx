"use client";
import React from "react";
import { ArrowUpRight } from "lucide-react";
import { PROJECT_TEMPLATES } from "@/constant";
import { cn } from "@/lib/utils";

// Tiny wireframe mock-ups drawn with divs, so each card has a preview without screenshots.
const Block = ({ className }) => (
  <div className={cn("rounded-[3px] bg-foreground/10", className)} />
);

const Sidebar = ({ rows = 4 }) => (
  <div className="w-1/5 shrink-0 space-y-1.5 border-r border-foreground/5 p-1.5">
    {Array.from({ length: rows }, (_, i) => (
      <Block key={i} className="h-1.5 w-full" />
    ))}
  </div>
);

const Tiles = ({ count, className, tileClassName }) => (
  <div className={cn("grid gap-1.5", className)}>
    {Array.from({ length: count }, (_, i) => (
      <Block key={i} className={cn("aspect-video", tileClassName)} />
    ))}
  </div>
);

const PREVIEWS = {
  media: (
    <div className="flex h-full flex-col gap-1.5 p-2">
      <div className="h-1/2 rounded-[3px] bg-gradient-to-br from-foreground/25 via-foreground/10 to-transparent" />
      <Block className="h-1.5 w-1/4" />
      <Tiles count={4} className="grid-cols-4" />
    </div>
  ),
  dashboard: (
    <div className="flex h-full">
      <Sidebar rows={5} />
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <Block key={i} className="h-5" />
          ))}
        </div>
        <div className="flex flex-1 items-end gap-1 rounded-[3px] border border-foreground/5 p-1.5">
          {[40, 65, 30, 80, 55, 90, 45].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-[2px] bg-foreground/20" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  ),
  kanban: (
    <div className="grid h-full grid-cols-3 gap-1.5 p-2">
      {[3, 2, 1].map((cards, col) => (
        <div key={col} className="space-y-1.5 rounded-[3px] bg-foreground/5 p-1.5">
          <Block className="h-1.5 w-1/2" />
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className="h-6 rounded-[3px] border border-foreground/10 bg-background/60" />
          ))}
        </div>
      ))}
    </div>
  ),
  files: (
    <div className="flex h-full">
      <Sidebar rows={6} />
      <div className="grid flex-1 grid-cols-4 content-start gap-2 p-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="space-y-1">
            <div className="aspect-[4/3] rounded-[3px] bg-foreground/15" />
            <Block className="h-1 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  ),
  video: (
    <div className="flex h-full">
      <Sidebar rows={6} />
      <Tiles count={6} className="flex-1 grid-cols-3 content-start p-2" />
    </div>
  ),
  store: (
    <div className="flex h-full flex-col gap-1.5 p-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <Block key={i} className="h-2 w-8 rounded-full" />
        ))}
      </div>
      <Tiles count={6} className="grid-cols-3" tileClassName="aspect-square" />
    </div>
  ),
  listings: (
    <div className="flex h-full">
      <Sidebar rows={5} />
      <div className="grid flex-1 grid-cols-3 content-start gap-1.5 p-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-1">
            <div className="aspect-[4/3] rounded-[3px] bg-gradient-to-br from-foreground/20 to-foreground/5" />
            <Block className="h-1 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  ),
  music: (
    <div className="flex h-full flex-col">
      <div className="flex flex-1">
        <Sidebar rows={5} />
        <div className="flex flex-1 items-center gap-2 p-2">
          <div className="aspect-square h-3/4 rounded-[3px] bg-gradient-to-br from-foreground/30 to-foreground/5" />
          <div className="flex-1 space-y-1.5">
            <Block className="h-2 w-3/4" />
            <Block className="h-1.5 w-1/2" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 border-t border-foreground/5 p-1.5">
        <div className="size-3 rounded-full bg-foreground/25" />
        <Block className="h-1 flex-1" />
      </div>
    </div>
  ),
};

const IdeaGrid = ({ onPick }) => {
  return (
    <section className="w-full">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
            Start with an idea
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pick one to fill in the prompt, then make it your own.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6">
        {PROJECT_TEMPLATES.map((template) => (
          <button
            key={template.label}
            type="button"
            onClick={() => onPick(template.prompt)}
            className="group text-left cursor-pointer focus-visible:outline-none"
          >
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg border bg-card transition-colors group-hover:border-foreground/30 group-focus-visible:ring-2 group-focus-visible:ring-ring">
              {PREVIEWS[template.preview]}
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <span className="inline-flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background">
                  Use this idea <ArrowUpRight className="size-3.5" />
                </span>
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-sm font-medium">{template.label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {template.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default IdeaGrid;
