"use client";

import { contrastForeground, FONT_OPTIONS, RADIUS_OPTIONS } from "@/lib/design-system";

/** A small mock app styled with a design system's tokens, so the user sees the theme live. */
const DesignSystemPreview = ({ primaryColor, accentColor, radius, font, className = "" }) => {
  const r = RADIUS_OPTIONS[radius]?.value ?? RADIUS_OPTIONS.md.value;
  const style = {
    "--p": primaryColor,
    "--pf": contrastForeground(primaryColor),
    "--a": accentColor,
    "--af": contrastForeground(accentColor),
    "--r": r,
    fontFamily: FONT_OPTIONS[font]?.stack ?? FONT_OPTIONS.sans.stack,
  };
  const pill = { borderRadius: "var(--r)" };

  return (
    <div style={style} className={`border bg-white p-4 text-neutral-900 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold">Dashboard</p>
        <span style={{ background: "var(--a)", color: "var(--af)", ...pill }} className="px-2 py-0.5 text-[11px] font-medium">
          New
        </span>
      </div>
      <p className="mt-0.5 text-xs text-neutral-500">The quick brown fox jumps over the lazy dog.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" style={{ background: "var(--p)", color: "var(--pf)", ...pill }} className="px-3 py-1.5 text-sm font-medium">
          Primary
        </button>
        <button type="button" style={{ ...pill, borderWidth: 1, borderColor: "var(--p)", color: "var(--p)" }} className="px-3 py-1.5 text-sm font-medium">
          Outline
        </button>
      </div>
      <input readOnly placeholder="Search…" style={pill} className="mt-3 w-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm" />
      <div style={pill} className="mt-3 border border-neutral-200 p-3">
        <p className="text-sm font-medium">Card title</p>
        <p className="text-xs text-neutral-500">Supporting text inside a card.</p>
      </div>
    </div>
  );
};

export default DesignSystemPreview;
