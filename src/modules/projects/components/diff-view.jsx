"use client";

import { useState } from "react";
import { FileDiffIcon, FileMinusIcon, FilePenLineIcon, FilePlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { diffVersions, numberHunkLines } from "@/lib/version-diff";

const STATUS_ICONS = { added: FilePlusIcon, modified: FilePenLineIcon, deleted: FileMinusIcon };
const STATUS_COLORS = { added: "text-emerald-500", modified: "text-amber-500", deleted: "text-red-500" };
const ROW_STYLES = {
  add: "bg-emerald-500/10",
  del: "bg-red-500/10",
  ctx: "",
  meta: "text-muted-foreground italic",
};
const ROW_SIGNS = { add: "+", del: "-", ctx: " ", meta: "" };

const Counts = ({ added, removed }) => (
  <span className="shrink-0 font-mono text-[11px] tabular-nums">
    {added > 0 && <span className="text-emerald-500">+{added}</span>}
    {added > 0 && removed > 0 && " "}
    {removed > 0 && <span className="text-red-500">-{removed}</span>}
  </span>
);

const Message = ({ children }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
    <div className="flex size-10 items-center justify-center rounded-lg border bg-background">
      <FileDiffIcon className="size-5" />
    </div>
    <p className="max-w-xs text-sm">{children}</p>
  </div>
);

const FileDiff = ({ change }) => {
  if (change.tooLarge) return <Message>This file is too large to show line by line.</Message>;

  return (
    <div className="min-w-max font-mono text-xs leading-5">
      {change.hunks.map((hunk, index) => (
        <div key={index}>
          <div className="sticky top-0 border-y bg-muted px-3 py-0.5 text-muted-foreground">
            @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
          </div>
          {numberHunkLines(hunk).map((row, rowIndex) => (
            <div key={rowIndex} className={cn("flex", ROW_STYLES[row.type])}>
              <span className="w-10 shrink-0 select-none pr-2 text-right text-muted-foreground/70">{row.oldLine ?? ""}</span>
              <span className="w-10 shrink-0 select-none pr-2 text-right text-muted-foreground/70">{row.newLine ?? ""}</span>
              <span className="w-4 shrink-0 select-none text-muted-foreground">{ROW_SIGNS[row.type]}</span>
              <span className="whitespace-pre pr-4">{row.text}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

/** The changed files between two versions; computed once per pair (the parent keys it). */
const VersionChanges = ({ baseFiles, files, header }) => {
  const [changes] = useState(() => diffVersions(baseFiles, files));
  const [selectedPath, setSelectedPath] = useState(null);
  const selected = changes.find((change) => change.path === selectedPath) ?? changes[0];
  const totals = changes.reduce((sum, change) => ({ added: sum.added + change.added, removed: sum.removed + change.removed }), {
    added: 0,
    removed: 0,
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
        {header}
        <span className="ml-auto">
          {changes.length} {changes.length === 1 ? "file" : "files"} changed <Counts {...totals} />
        </span>
      </div>

      {changes.length === 0 ? (
        <Message>No file changes between these versions.</Message>
      ) : (
        <div className="flex min-h-0 flex-1">
          <ul className="w-56 shrink-0 overflow-y-auto border-r py-1 text-xs">
            {changes.map((change) => {
              const Icon = STATUS_ICONS[change.status];
              return (
                <li key={change.path}>
                  <button
                    type="button"
                    title={`${change.path} (${change.status})`}
                    onClick={() => setSelectedPath(change.path)}
                    className={cn(
                      "flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left hover:bg-accent cursor-pointer",
                      selected?.path === change.path && "bg-accent"
                    )}
                  >
                    <Icon className={cn("size-3.5 shrink-0", STATUS_COLORS[change.status])} />
                    <span className={cn("min-w-0 flex-1 truncate", change.status === "deleted" && "line-through")}>
                      {change.path}
                    </span>
                    <Counts {...change} />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="min-w-0 flex-1 overflow-auto bg-background">{selected && <FileDiff key={selected.path} change={selected} />}</div>
        </div>
      )}
    </div>
  );
};

/**
 * What changed in a version: the files it added, changed or deleted compared with an
 * earlier version (the one before it by default), with a line-by-line diff of each file.
 * `versions` are the chat's fragments, oldest first.
 */
export default function DiffView({ versions, activeFragment }) {
  const index = versions.findIndex((version) => version.id === activeFragment?.id);
  const earlier = index > 0 ? versions.slice(0, index) : [];
  const [baseId, setBaseId] = useState(null);
  const base = earlier.find((version) => version.id === baseId) ?? earlier.at(-1);

  if (!activeFragment?.files) return <Message>Changes will appear here after the first version.</Message>;
  if (!base?.files) return <Message>This is the first version, so there is nothing earlier to compare it with.</Message>;

  return (
    <VersionChanges
      key={`${base.id}:${activeFragment.id}`}
      baseFiles={base.files}
      files={activeFragment.files}
      header={
        <>
          <span>Version {index + 1} compared with</span>
          <select
            aria-label="Compare with version"
            value={base.id}
            onChange={(event) => setBaseId(event.target.value)}
            className="h-7 max-w-56 truncate rounded-md border bg-background px-2 text-xs text-foreground"
          >
            {earlier
              .map((version, versionIndex) => (
                <option key={version.id} value={version.id}>
                  Version {versionIndex + 1}: {version.title}
                </option>
              ))
              .reverse()}
          </select>
        </>
      }
    />
  );
}
