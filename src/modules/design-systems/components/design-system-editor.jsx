"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  DEFAULT_DESIGN_SYSTEM,
  DESIGN_SYSTEM_PRESETS,
  FONT_OPTIONS,
  MAX_NAME_LENGTH,
  parseShadcnCss,
  RADIUS_OPTIONS,
  validateDesignSystem,
  validateImportedDesignSystem,
} from "@/lib/design-system";
import { showActionError } from "@/lib/show-action-error";
import { useCreateDesignSystem, useUpdateDesignSystem } from "../hooks/design-system";
import DesignSystemPreview from "./design-system-preview";

const selectClass = "h-9 w-full rounded-md border bg-background px-2 text-sm";

// Serializes a stored token set back into CSS so an imported system can be re-edited in place.
const tokensToCss = (tokens) => {
  const block = (selector, obj) =>
    obj && Object.keys(obj).length
      ? `${selector} {\n${Object.entries(obj).map(([k, v]) => `  --${k}: ${v};`).join("\n")}\n}`
      : "";
  return [block(":root", tokens?.light), block(".dark", tokens?.dark)].filter(Boolean).join("\n");
};

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
      <Input value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className="h-9 font-mono text-xs" />
    </div>
  </div>
);

const ModeTab = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
    )}
  >
    {children}
  </button>
);

/** Create or edit a design system. `system` is null for a new one. */
const DesignSystemEditor = ({ open, onOpenChange, system }) => {
  const router = useRouter();
  const create = useCreateDesignSystem();
  const update = useUpdateDesignSystem();

  const [mode, setMode] = useState(system?.tokens ? "import" : "simple");
  const [name, setName] = useState(system?.name ?? "");
  const [form, setForm] = useState(() =>
    system && !system.tokens
      ? { primaryColor: system.primaryColor, accentColor: system.accentColor, radius: system.radius, font: system.font }
      : { primaryColor: DEFAULT_DESIGN_SYSTEM.primaryColor, accentColor: DEFAULT_DESIGN_SYSTEM.accentColor, radius: DEFAULT_DESIGN_SYSTEM.radius, font: DEFAULT_DESIGN_SYSTEM.font }
  );
  const [css, setCss] = useState(() => (system?.tokens ? tokensToCss(system.tokens) : ""));
  const [error, setError] = useState(null);

  const setField = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };
  const busy = create.isPending || update.isPending;

  // Live parse of the pasted CSS, for the preview and the variable count.
  const parsed = useMemo(() => (css.trim() ? parseShadcnCss(css) : null), [css]);
  const lightCount = parsed?.data ? Object.keys(parsed.data.light).length : 0;
  const darkCount = parsed?.data ? Object.keys(parsed.data.dark).length : 0;

  const previewProps = mode === "import" ? { name, tokens: parsed?.data } : { name, ...form };

  const save = async () => {
    const input =
      mode === "import"
        ? (() => {
            const result = parseShadcnCss(css);
            return result.error ? { error: result.error } : { input: { name, tokens: result.data } };
          })()
        : { input: { name, ...form } };
    if (input.error) {
      setError(input.error);
      return;
    }
    const check = mode === "import" ? validateImportedDesignSystem(input.input) : validateDesignSystem(input.input);
    if (check.error) {
      setError(check.error);
      return;
    }
    try {
      if (system?.id) await update.mutateAsync([system.id, input.input]);
      else await create.mutateAsync([input.input]);
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

        <div className="flex gap-1 rounded-lg border bg-muted p-1">
          <ModeTab active={mode === "simple"} onClick={() => { setMode("simple"); setError(null); }}>Simple</ModeTab>
          <ModeTab active={mode === "import"} onClick={() => { setMode("import"); setError(null); }}>Import from CSS</ModeTab>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs" htmlFor="ds-name">Name</Label>
              <Input
                id="ds-name"
                value={name}
                maxLength={MAX_NAME_LENGTH}
                onChange={(event) => { setName(event.target.value); setError(null); }}
                placeholder="e.g. Acme brand"
              />
            </div>

            {mode === "simple" ? (
              <>
                <ColorField label="Primary color" value={form.primaryColor} onChange={setField("primaryColor")} />
                <ColorField label="Accent color" value={form.accentColor} onChange={setField("accentColor")} />
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs" htmlFor="ds-radius">Border radius</Label>
                  <select id="ds-radius" value={form.radius} onChange={(event) => setField("radius")(event.target.value)} className={selectClass}>
                    {Object.entries(RADIUS_OPTIONS).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs" htmlFor="ds-font">Font</Label>
                  <select id="ds-font" value={form.font} onChange={(event) => setField("font")(event.target.value)} className={selectClass}>
                    {Object.entries(FONT_OPTIONS).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs" htmlFor="ds-css">Theme CSS</Label>
                    {parsed?.data && (
                      <span className="text-[11px] text-muted-foreground">
                        {lightCount} variable{lightCount === 1 ? "" : "s"}{darkCount ? ` · ${darkCount} dark` : ""}
                      </span>
                    )}
                  </div>
                  <textarea
                    id="ds-css"
                    value={css}
                    onChange={(event) => { setCss(event.target.value); setError(null); }}
                    spellCheck={false}
                    placeholder={":root {\n  --primary: oklch(0.55 0.18 250);\n  --background: oklch(1 0 0);\n  ...\n}\n.dark { ... }"}
                    className="h-44 w-full rounded-md border bg-background p-2 font-mono text-[11px] leading-relaxed"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Paste a shadcn <code>globals.css</code> (e.g. from tweakcn). Variables like <code>--primary</code> and <code>--background</code> under <code>:root</code> and <code>.dark</code> are used.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Start from a theme</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DESIGN_SYSTEM_PRESETS.map((preset) => (
                      <Button
                        key={preset.key}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setCss(preset.css); if (!name.trim()) setName(preset.label); setError(null); }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Preview</Label>
            <DesignSystemPreview {...previewProps} className="rounded-xl" />
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
