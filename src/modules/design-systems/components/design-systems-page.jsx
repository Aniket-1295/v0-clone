"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaletteIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FONT_OPTIONS, RADIUS_OPTIONS } from "@/lib/design-system";
import { showActionError } from "@/lib/show-action-error";
import { useDeleteDesignSystem, useDesignSystems } from "../hooks/design-system";
import DesignSystemEditor from "./design-system-editor";

const Swatch = ({ color, title }) => (
  <span title={title} className="size-5 rounded-md border" style={{ backgroundColor: color }} />
);

export default function DesignSystemsPage() {
  const router = useRouter();
  const { data: systems, isPending } = useDesignSystems();
  const del = useDeleteDesignSystem();
  const [editor, setEditor] = useState(null); // { system } | null
  const [confirmId, setConfirmId] = useState(null);

  const remove = async (id) => {
    try {
      await del.mutateAsync([id]);
      setConfirmId(null);
    } catch (error) {
      showActionError(error, router, "Could not delete the design system.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Design Systems</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Save a theme — brand colors, radius and font — and apply it to a chat or a project so new apps are built in that look.
          </p>
        </div>
        <Button className="h-10 gap-1.5 bg-foreground text-background hover:bg-foreground/90" onClick={() => setEditor({ system: null })}>
          <PlusIcon className="size-4" /> New design system
        </Button>
      </div>

      <div className="mt-8">
        {isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : !systems?.length ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-16 text-center dark:bg-neutral-950">
            <span className="flex size-10 items-center justify-center rounded-lg border bg-background">
              <PaletteIcon className="size-5 text-muted-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">No design systems yet.</p>
            <Button variant="outline" onClick={() => setEditor({ system: null })}>
              <PlusIcon className="size-4" /> Create your first one
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {systems.map((system) => (
              <div key={system.id} className="flex flex-col rounded-xl border bg-card p-4 dark:bg-neutral-950">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-medium">{system.name}</p>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="size-7" aria-label="Edit" onClick={() => setEditor({ system })}>
                      <PencilIcon className="size-3.5" />
                    </Button>
                    {confirmId === system.id ? (
                      <Button
                        size="sm"
                        className="h-7 bg-red-600 px-2 text-xs text-white hover:bg-red-600/90"
                        disabled={del.isPending}
                        onClick={() => remove(system.id)}
                      >
                        Confirm
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-red-600"
                        aria-label="Delete"
                        onClick={() => setConfirmId(system.id)}
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <Swatch color={system.primaryColor} title="Primary" />
                  <Swatch color={system.accentColor} title="Accent" />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {RADIUS_OPTIONS[system.radius]?.label} · {FONT_OPTIONS[system.font]?.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editor && (
        <DesignSystemEditor
          key={editor.system?.id ?? "new"}
          open
          onOpenChange={(open) => !open && setEditor(null)}
          system={editor.system}
        />
      )}
    </div>
  );
}
