"use client";

import { useMemo, useState } from "react";
import { MousePointerClickIcon, SparklesIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { applyElementEdit, findElementSource, readStyle, writeStyle } from "@/lib/design-source";

const shades = (prefix, list) => list.map((color) => `${prefix}-${color}`);
const OPTIONS = {
  textColor: ["text-white", "text-black", ...shades("text", ["gray-500", "gray-900", "slate-900", "red-600", "orange-500", "amber-500", "yellow-400", "green-600", "emerald-600", "teal-600", "sky-500", "blue-600", "indigo-600", "violet-600", "purple-600", "pink-600", "rose-600"])],
  background: ["bg-white", "bg-black", "bg-transparent", ...shades("bg", ["gray-50", "gray-100", "gray-900", "slate-900", "red-50", "red-600", "orange-500", "amber-100", "yellow-300", "green-50", "green-600", "emerald-600", "sky-50", "blue-50", "blue-600", "indigo-600", "violet-600", "purple-600", "pink-600", "rose-600"])],
  fontSize: ["text-xs", "text-sm", "text-base", "text-lg", "text-xl", "text-2xl", "text-3xl", "text-4xl", "text-5xl", "text-6xl", "text-7xl"],
  fontWeight: ["font-light", "font-normal", "font-medium", "font-semibold", "font-bold", "font-extrabold"],
  padding: ["p-0", "p-1", "p-2", "p-3", "p-4", "p-6", "p-8", "p-10", "p-12"],
  radius: ["rounded-none", "rounded-sm", "rounded", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl", "rounded-full"],
};
const LABELS = {
  textColor: "Text color",
  background: "Background",
  fontSize: "Font size",
  fontWeight: "Weight",
  padding: "Padding",
  radius: "Corners",
};

const StyleSelect = ({ group, className, onChange }) => {
  const value = readStyle(className, group);
  const options = OPTIONS[group].includes(value) || !value ? OPTIONS[group] : [value, ...OPTIONS[group]];
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{LABELS[group]}</span>
      <select
        value={value}
        onChange={(event) => onChange(writeStyle(className, group, event.target.value))}
        className="h-7 w-36 rounded-md border bg-background px-1.5 font-mono text-[11px]"
      >
        <option value="">(none)</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
};

/**
 * Design mode side panel for the element selected in the preview: edits its text and
 * Tailwind classes in the source (saved as a new version), or asks v0 when the element
 * cannot be located in the code.
 */
const DesignPanel = ({ selection, files, onApply, onAskV0, busy, onClose }) => {
  const found = useMemo(() => (selection ? findElementSource(files, selection) : null), [selection, files]);
  const [className, setClassName] = useState(selection?.className ?? "");
  const [text, setText] = useState(selection?.text?.trim() ?? "");
  const [request, setRequest] = useState("");

  const header = (
    <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
      <span className="text-xs font-medium">Design</span>
      <Button variant="ghost" size="icon" className="size-7" aria-label="Close design mode" onClick={onClose}>
        <XIcon className="size-3.5" />
      </Button>
    </div>
  );

  if (!selection) {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
          <MousePointerClickIcon className="size-5" />
          <p className="text-xs">Click an element in the preview to edit it.</p>
        </div>
      </div>
    );
  }

  const editable = found && !("matches" in found);
  const changed = className !== (selection.className ?? "") || (selection.text != null && text !== selection.text.trim());
  const label = `<${selection.tag}>${selection.text ? ` "${selection.text.trim().slice(0, 40)}"` : ""}`;

  const apply = () => {
    const source = applyElementEdit(files[found.path], found.element, {
      className: className !== (selection.className ?? "") ? className : null,
      text: selection.text != null && text !== selection.text.trim() ? text : null,
    });
    onApply(found.path, source);
  };

  return (
    <div className="flex h-full flex-col">
      {header}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <p className="truncate font-mono text-[11px] text-muted-foreground" title={label}>
          {label}
        </p>

        {editable ? (
          <>
            {selection.text != null && (
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-muted-foreground">Text</span>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={Math.min(4, Math.ceil(text.length / 28) || 1)}
                  className="resize-none rounded-md border bg-background px-2 py-1.5 text-xs"
                />
              </label>
            )}
            {Object.keys(OPTIONS).map((group) => (
              <StyleSelect key={group} group={group} className={className} onChange={setClassName} />
            ))}
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Classes</span>
              <textarea
                value={className}
                onChange={(event) => setClassName(event.target.value)}
                rows={3}
                className="resize-none rounded-md border bg-background px-2 py-1.5 font-mono text-[11px]"
              />
            </label>
            <p className="truncate text-[11px] text-muted-foreground">In {found.path}</p>
          </>
        ) : (
          <div className="flex flex-col gap-2 text-xs">
            <p className="text-muted-foreground">
              {found?.matches > 1
                ? "This element appears in several places in the code, so it can't be edited here."
                : "This element's code can't be edited here (it may come from a component, a list or computed classes)."}{" "}
              Describe the change and v0 will make it.
            </p>
            <textarea
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              rows={3}
              placeholder="e.g. make it blue and bigger"
              className="resize-none rounded-md border bg-background px-2 py-1.5 text-xs"
            />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t p-3">
        {editable ? (
          <Button
            size="sm"
            className="w-full gap-1.5 bg-foreground text-background hover:bg-foreground/90"
            disabled={!changed || busy}
            onClick={apply}
          >
            {busy && <Spinner className="size-3.5" />}
            Apply
          </Button>
        ) : (
          <Button
            size="sm"
            className="w-full gap-1.5 bg-foreground text-background hover:bg-foreground/90"
            disabled={!request.trim() || busy}
            onClick={() => onAskV0(`Change the ${label} element: ${request.trim()}`)}
          >
            {busy ? <Spinner className="size-3.5" /> : <SparklesIcon className="size-3.5" />}
            Ask v0 (1 credit)
          </Button>
        )}
      </div>
    </div>
  );
};

export default DesignPanel;
