"use client";

import { useState } from "react";
import {
  Activity,
  Brain,
  Calculator,
  CloudSun,
  GalleryHorizontal,
  Gamepad2,
  ImagePlus,
  LayoutTemplate,
  ListTodo,
  Mail,
  MessagesSquare,
  RotateCw,
  Send,
} from "lucide-react";
import { PROMPT_SUGGESTIONS } from "@/constant";

const ICONS = {
  Activity,
  Brain,
  Calculator,
  CloudSun,
  GalleryHorizontal,
  Gamepad2,
  ImagePlus,
  LayoutTemplate,
  ListTodo,
  Mail,
  MessagesSquare,
  Send,
};

const PER_PAGE = 4;

export default function PromptChips({ onPick }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(PROMPT_SUGGESTIONS.length / PER_PAGE);
  const chips = PROMPT_SUGGESTIONS.slice((page % pageCount) * PER_PAGE, (page % pageCount + 1) * PER_PAGE);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      {chips.map((chip) => {
        const Icon = ICONS[chip.icon];
        return (
          <button
            key={chip.label}
            type="button"
            onClick={() => onPick(chip.prompt)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-background px-3 text-xs md:text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer animate-in fade-in duration-300 dark:bg-black"
          >
            <Icon className="size-3.5" />
            {chip.label}
          </button>
        );
      })}
      <button
        type="button"
        aria-label="Show other suggestions"
        onClick={() => setPage((p) => p + 1)}
        className="inline-flex size-8 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer dark:bg-black"
      >
        <RotateCw className="size-3.5 transition-transform duration-500" style={{ transform: `rotate(${page * 360}deg)` }} />
      </button>
    </div>
  );
}
