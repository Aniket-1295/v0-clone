"use client";

import { contrastForeground, DEFAULT_DESIGN_SYSTEM, FONT_OPTIONS, RADIUS_OPTIONS } from "@/lib/design-system";

// Resolves the preview's CSS variables from either a full token set (imported theme) or the
// simple color/radius/font fields. Imported themes show their real background/card/muted colors;
// simple themes show brand colors on a neutral surface.
const resolveStyle = ({
  primaryColor = DEFAULT_DESIGN_SYSTEM.primaryColor,
  accentColor = DEFAULT_DESIGN_SYSTEM.accentColor,
  radius = DEFAULT_DESIGN_SYSTEM.radius,
  font = DEFAULT_DESIGN_SYSTEM.font,
  tokens,
}) => {
  const light = tokens?.light;
  if (light && Object.keys(light).length) {
    return {
      "--bg": light.background ?? "#ffffff",
      "--fg": light.foreground ?? "#171717",
      "--card": light.card ?? light.background ?? "#ffffff",
      "--cardfg": light["card-foreground"] ?? light.foreground ?? "#171717",
      "--muted": light.muted ?? "#f5f5f5",
      "--mutedfg": light["muted-foreground"] ?? "#737373",
      "--border": light.border ?? "#e5e5e5",
      "--p": light.primary ?? "#2563eb",
      "--pf": light["primary-foreground"] ?? "#ffffff",
      "--a": light.accent ?? light.secondary ?? "#f1f5f9",
      "--af": light["accent-foreground"] ?? light.foreground ?? "#171717",
      "--r": light.radius ?? "0.5rem",
      fontFamily: light["font-sans"] || FONT_OPTIONS.sans.stack,
    };
  }
  return {
    "--bg": "#ffffff",
    "--fg": "#171717",
    "--card": "#ffffff",
    "--cardfg": "#171717",
    "--muted": "#fafafa",
    "--mutedfg": "#737373",
    "--border": "#e5e5e5",
    "--p": primaryColor,
    "--pf": contrastForeground(primaryColor),
    "--a": accentColor,
    "--af": contrastForeground(accentColor),
    "--r": RADIUS_OPTIONS[radius]?.value ?? RADIUS_OPTIONS.md.value,
    fontFamily: FONT_OPTIONS[font]?.stack ?? FONT_OPTIONS.sans.stack,
  };
};

/** A small mock app styled with a design system's tokens, so the user sees the theme live. */
const DesignSystemPreview = (props) => {
  const style = resolveStyle(props);
  const pill = { borderRadius: "var(--r)" };

  return (
    <div style={{ ...style, background: "var(--bg)", color: "var(--fg)" }} className={`border p-4 ${props.className ?? ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold">Dashboard</p>
        <span style={{ background: "var(--a)", color: "var(--af)", ...pill }} className="px-2 py-0.5 text-[11px] font-medium">
          New
        </span>
      </div>
      <p className="mt-0.5 text-xs" style={{ color: "var(--mutedfg)" }}>The quick brown fox jumps over the lazy dog.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" style={{ background: "var(--p)", color: "var(--pf)", ...pill }} className="px-3 py-1.5 text-sm font-medium">
          Primary
        </button>
        <button type="button" style={{ ...pill, borderWidth: 1, borderColor: "var(--p)", color: "var(--p)" }} className="px-3 py-1.5 text-sm font-medium">
          Outline
        </button>
      </div>
      <input
        readOnly
        placeholder="Search…"
        style={{ ...pill, background: "var(--muted)", borderWidth: 1, borderColor: "var(--border)", color: "var(--fg)" }}
        className="mt-3 w-full px-3 py-1.5 text-sm"
      />
      <div style={{ ...pill, background: "var(--card)", color: "var(--cardfg)", borderWidth: 1, borderColor: "var(--border)" }} className="mt-3 p-3">
        <p className="text-sm font-medium">Card title</p>
        <p className="text-xs" style={{ color: "var(--mutedfg)" }}>Supporting text inside a card.</p>
      </div>
    </div>
  );
};

export default DesignSystemPreview;
