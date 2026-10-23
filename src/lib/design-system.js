// A design system is a saved theme (brand colors, border radius, font) the user applies to
// chats and projects. Two things use it: the agent's system prompt (so it builds in-brand),
// and app/globals.css in the sandbox (so every shadcn component inherits the brand). This
// module is pure — no database or network — so it is easy to unit test.

export const MAX_NAME_LENGTH = 60;

// Border-radius choices, mapped to the generated app's --radius token.
export const RADIUS_OPTIONS = {
  none: { label: "None", value: "0rem" },
  sm: { label: "Small", value: "0.25rem" },
  md: { label: "Medium", value: "0.5rem" },
  lg: { label: "Large", value: "0.75rem" },
  xl: { label: "Extra large", value: "1rem" },
};

// Font choices as system/web stacks that need no font files, mapped to --font-sans.
export const FONT_OPTIONS = {
  sans: { label: "Sans", stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
  serif: { label: "Serif", stack: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' },
  mono: { label: "Mono", stack: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace' },
  rounded: { label: "Rounded", stack: 'ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, system-ui, sans-serif' },
};

export const DEFAULT_DESIGN_SYSTEM = { name: "", primaryColor: "#2563eb", accentColor: "#f59e0b", radius: "md", font: "sans" };

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Validates a design system's fields. Returns { data } (trimmed) or { error }. */
export const validateDesignSystem = (input) => {
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  if (!name) return { error: "Give the design system a name." };
  if (name.length > MAX_NAME_LENGTH) return { error: `Keep the name under ${MAX_NAME_LENGTH} characters.` };
  for (const key of ["primaryColor", "accentColor"]) {
    if (!HEX.test(input?.[key] ?? "")) return { error: "Colors must be hex values like #2563eb." };
  }
  if (!RADIUS_OPTIONS[input?.radius]) return { error: "Pick a border radius." };
  if (!FONT_OPTIONS[input?.font]) return { error: "Pick a font." };
  return {
    data: {
      name,
      primaryColor: input.primaryColor.toLowerCase(),
      accentColor: input.accentColor.toLowerCase(),
      radius: input.radius,
      font: input.font,
    },
  };
};

const toRgb = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

// WCAG relative luminance of a hex color (0 = black, 1 = white).
const luminance = (hex) => {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Black or white, whichever reads better on `hex`. */
export const contrastForeground = (hex) => {
  const l = luminance(hex);
  // Contrast ratio against white vs black; pick the higher.
  return (l + 0.05) / 0.05 > 1.05 / (l + 0.05) ? "#000000" : "#ffffff";
};

const BRAND_START = "/* v0-design-system:start */";
const BRAND_END = "/* v0-design-system:end */";

const brandBlock = (ds) => {
  const primaryFg = contrastForeground(ds.primaryColor);
  const accentFg = contrastForeground(ds.accentColor);
  const radius = RADIUS_OPTIONS[ds.radius]?.value ?? RADIUS_OPTIONS.md.value;
  const font = FONT_OPTIONS[ds.font]?.stack ?? FONT_OPTIONS.sans.stack;
  const colorVars = [
    `  --primary: ${ds.primaryColor};`,
    `  --primary-foreground: ${primaryFg};`,
    `  --ring: ${ds.primaryColor};`,
    `  --accent: ${ds.accentColor};`,
    `  --accent-foreground: ${accentFg};`,
    `  --sidebar-primary: ${ds.primaryColor};`,
    `  --sidebar-primary-foreground: ${primaryFg};`,
  ];
  return [
    BRAND_START,
    ":root {",
    ...colorVars,
    `  --radius: ${radius};`,
    `  --font-sans: ${font};`,
    "}",
    ".dark {",
    ...colorVars,
    "}",
    BRAND_END,
  ].join("\n");
};

/**
 * Returns `css` (an app's globals.css) with the design system's brand block applied. A block
 * already present is replaced (so editing a system re-themes), otherwise it is appended. Later
 * CSS wins, so these overrides take effect over the base theme. Idempotent.
 */
export const applyBrandCss = (css, ds) => {
  const base = typeof css === "string" ? css : "";
  if (!ds) return base;
  const block = brandBlock(ds);
  const start = base.indexOf(BRAND_START);
  if (start !== -1) {
    const end = base.indexOf(BRAND_END, start);
    if (end !== -1) return base.slice(0, start) + block + base.slice(end + BRAND_END.length);
  }
  return `${base.trimEnd()}\n\n${block}\n`;
};

/** System-prompt block describing the brand. Empty when no design system is set. */
export const buildDesignSystemNote = (ds) => {
  if (!ds) return "";
  const radius = RADIUS_OPTIONS[ds.radius]?.label ?? "Medium";
  const font = FONT_OPTIONS[ds.font]?.label ?? "Sans";
  return [
    "",
    `A design system named "${ds.name}" is set for this app. Build it to match this brand. The theme tokens are already configured in app/globals.css, so use the semantic tokens below rather than hardcoded Tailwind colors like bg-blue-600:`,
    `- Primary color ${ds.primaryColor}: use bg-primary / text-primary-foreground / border-primary.`,
    `- Accent color ${ds.accentColor}: use bg-accent / text-accent-foreground.`,
    `- Border radius: ${radius} — use rounded-lg / rounded-md, which follow the theme radius.`,
    `- Font: ${font} — the body already uses it via font-sans.`,
  ].join("\n");
};

/**
 * The design system that applies to a chat: its own, or its project's default, or null.
 * The chat's own system wins. Never throws.
 */
export const loadChatDesignSystem = async (db, chatId) => {
  if (!chatId) return null;
  const row = await db.chat.findFirst({
    where: { id: chatId },
    select: {
      designSystem: true,
      project: { select: { designSystem: true } },
    },
  });
  return row?.designSystem ?? row?.project?.designSystem ?? null;
};
