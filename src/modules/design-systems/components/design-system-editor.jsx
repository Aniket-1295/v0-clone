"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEFAULT_DESIGN_SYSTEM, FONT_OPTIONS, MAX_NAME_LENGTH, RADIUS_OPTIONS, validateDesignSystem } from "@/lib/design-system";
import { showActionError } from "@/lib/show-action-error";
import { useCreateDesignSystem, useUpdateDesignSystem } from "../hooks/design-system";
import DesignSystemPreview from "./design-system-preview";

const selectClass = "h-9 w-full rounded-md border bg-background px-2 text-sm";

const ColorField = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <Label className="text-xs">{label}</Label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${label} swatch`}
        className="size-9 shrink-0 cursor-pointer rounded-md border bg-background p-0.5"
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="h-9 font-mono text-xs"
      />
    </div>
  </div>
);

/** Create or edit a design system. `system` is null for a new one. */
const DesignSystemEditor = ({ open, onOpenChange, system }) => {
  const router = useRouter();
  const create = useCreateDesignSystem();
  const update = useUpdateDesignSystem();
  const [form, setForm] = useState(() =>
    system
      ? { name: system.name, primaryColor: system.primaryColor, accentColor: system.accentColor, radius: system.radius, font: system.font }
      : { ...DEFAULT_DESIGN_SYSTEM }
  );
  const [error, setError] = useState(null);

  const set = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };
  const busy = create.isPending || update.isPending;

  const save = async () => {
    const result = validateDesignSystem(form);
    if (result.error) {
      setError(result.error);
      return;
    }
    try {
      if (system?.id) await update.mutateAsync([system.id, result.data]);
      else await create.mutateAsync([result.data]);
      onOpenChange(false);
    } catch (err) {
      showActionError(err, router, "Could not save the design system.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{system ? "Edit design system" : "New design system"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs" htmlFor="ds-name">Name</Label>
              <Input
                id="ds-name"
                value={form.name}
                maxLength={MAX_NAME_LENGTH}
                onChange={(event) => set("name")(event.target.value)}
                placeholder="e.g. Acme brand"
              />
            </div>
            <ColorField label="Primary color" value={form.primaryColor} onChange={set("primaryColor")} />
            <ColorField label="Accent color" value={form.accentColor} onChange={set("accentColor")} />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs" htmlFor="ds-radius">Border radius</Label>
              <select id="ds-radius" value={form.radius} onChange={(event) => set("radius")(event.target.value)} className={selectClass}>
                {Object.entries(RADIUS_OPTIONS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs" htmlFor="ds-font">Font</Label>
              <select id="ds-font" value={form.font} onChange={(event) => set("font")(event.target.value)} className={selectClass}>
                {Object.entries(FONT_OPTIONS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Preview</Label>
            <DesignSystemPreview {...form} className="rounded-xl" />
          </div>
        </div>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button className="gap-1.5 bg-foreground text-background hover:bg-foreground/90" onClick={save} disabled={busy}>
            {busy && <Spinner className="size-3.5" />}
            {system ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DesignSystemEditor;
