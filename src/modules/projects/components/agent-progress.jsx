"use client";

import { useEffect, useState } from "react";
import {
  BoxIcon,
  ChevronRightIcon,
  CircleSlashIcon,
  FilePenLineIcon,
  FileTextIcon,
  ImageIcon,
  ScanSearchIcon,
  SparklesIcon,
  SquareTerminalIcon,
  XCircleIcon,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const KIND_ICONS = {
  setup: BoxIcon,
  read: FileTextIcon,
  write: FilePenLineIcon,
  command: SquareTerminalIcon,
  check: ScanSearchIcon,
  image: ImageIcon,
  finish: SparklesIcon,
};

const formatDuration = (ms) => {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
};

const useNow = (enabled) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [enabled]);
  return now;
};

const StepRow = ({ step }) => {
  const Icon = KIND_ICONS[step.kind] ?? SparklesIcon;
  const running = step.status === "running";

  return (
    <li className="flex min-w-0 items-center gap-2 py-1 text-xs">
      <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
        {running ? (
          <Spinner className="size-3.5" />
        ) : step.status === "error" ? (
          <XCircleIcon className="size-3.5 text-red-500" />
        ) : step.status === "stopped" ? (
          <CircleSlashIcon className="size-3.5" />
        ) : (
          <Icon className="size-3.5" />
        )}
      </span>
      <span className={cn("truncate text-muted-foreground", running && "text-foreground")}>{step.label}</span>
    </li>
  );
};

/**
 * The agent's steps for one prompt. Live: expanded, with a ticking timer and a "Thinking"
 * row while the model works. Finished: a collapsed "Worked for 42s" toggle.
 */
const AgentProgress = ({ steps = [], live = false, startedAt }) => {
  const [open, setOpen] = useState(false);
  const now = useNow(live);

  // Model turns ("think") are only shown as the trailing "Thinking" row, which stands in
  // whenever no visible step is running, so a live run never looks stalled.
  const visible = steps.filter((step) => step.kind !== "think");
  const last = steps[steps.length - 1];
  const thinking = live && !visible.some((step) => step.status === "running");

  const start = new Date(steps[0]?.createdAt ?? startedAt ?? now).getTime();
  const end = live ? now : new Date(last?.updatedAt ?? start).getTime();
  const expanded = live || open;

  if (!live && visible.length === 0) return null;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => !live && setOpen(!open)}
        aria-expanded={expanded}
        className={cn(
          "flex w-fit items-center gap-1 text-xs text-muted-foreground",
          !live && "hover:text-foreground cursor-pointer"
        )}
      >
        {live ? (
          <span>Working… {formatDuration(end - start)}</span>
        ) : (
          <>
            <span>
              Worked for {formatDuration(end - start)} · {visible.length} {visible.length === 1 ? "step" : "steps"}
            </span>
            <ChevronRightIcon className={cn("size-3.5 transition-transform", open && "rotate-90")} />
          </>
        )}
      </button>

      {expanded && (
        <ul className="mt-1.5 flex flex-col border-l pl-3">
          {visible.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
          {thinking && (
            <li className="flex items-center gap-2 py-1 text-xs">
              <span className="flex size-4 shrink-0 items-center justify-center">
                <SparklesIcon className="size-3.5 animate-pulse text-muted-foreground" />
              </span>
              <span className="animate-pulse text-foreground">Thinking…</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default AgentProgress;
