// A design system is a saved theme the user applies to chats and projects. Two things use it:
// the agent's system prompt (so it builds in-brand), and app/globals.css in the sandbox (so every
// shadcn component inherits the brand). A system is either "simple" (brand colors + radius + font)
// or a full theme imported from a shadcn globals.css (`tokens`: every CSS variable, light + dark).
// This module is pure — no database or network — so it is easy to unit test.

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

/** Validates a simple (color + radius + font) design system. Returns { data } (trimmed) or { error }. */
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
      tokens: null,
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

// ── Import from CSS ────────────────────────────────────────────────────────────────────────
// Parse a shadcn-style globals.css into a token map. We keep only CSS custom properties and
// guard every name and value, because these strings are written into the sandbox's globals.css.

const TOKEN_NAME = /^[a-z0-9-]+$/i;
// Safe CSS value: colors (hex/rgb/hsl/oklch), numbers with units, and var() refs. No ; { } @ * < >
// so a pasted value can never break out of the brand block or inject rules/comments.
const TOKEN_VALUE = /^[\w\s.,#%()/'"-]+$/;
const MAX_TOKENS = 100;
const MAX_VALUE_LENGTH = 200;

const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);

// Returns the inner text of the first `selector { ... }` rule, matching nested braces, or null.
const extractBlock = (css, selector) => {
  const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^{}]*\\{", "i");
  const match = re.exec(css);
  if (!match) return null;
  let depth = 1;
  const start = match.index + match[0].length;
  let i = start;
  for (; i < css.length && depth > 0; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") depth--;
  }
  return css.slice(start, i - 1);
};

// Pulls `--name: value;` declarations from a CSS block into a { name: value } map (name without --).
const parseDeclarations = (blockText) => {
  const vars = {};
  const re = /--([a-z0-9-]+)\s*:\s*([^;{}]+)\s*;/gi;
  let m;
  while ((m = re.exec(blockText)) && Object.keys(vars).length < MAX_TOKENS) {
    const name = m[1].toLowerCase();
    const value = m[2].trim();
    if (TOKEN_NAME.test(name) && TOKEN_VALUE.test(value) && value.length <= MAX_VALUE_LENGTH) {
      vars[name] = value;
    }
  }
  return vars;
};

/**
 * Parses a pasted shadcn globals.css into { light, dark } token maps. Reads the `:root` rule for
 * light tokens and the `.dark` rule for dark tokens (dark is optional). Returns { data } or { error }.
 */
export const parseShadcnCss = (css) => {
  if (typeof css !== "string" || !css.trim()) return { error: "Paste a CSS theme first." };
  const rootText = extractBlock(css, ":root") ?? css;
  const darkText = extractBlock(css, ".dark");
  const light = parseDeclarations(rootText);
  if (!Object.keys(light).length) {
    return { error: "No shadcn variables found. Include a :root block with tokens like --primary and --background." };
  }
  return { data: { light, dark: darkText ? parseDeclarations(darkText) : {} } };
};

// Keeps only safe, well-formed custom properties — defence in depth for tokens that arrive from a client.
const sanitizeTokens = (obj) => {
  const out = {};
  if (!isPlainObject(obj)) return out;
  for (const [rawName, rawValue] of Object.entries(obj)) {
    const name = String(rawName).toLowerCase();
    const value = typeof rawValue === "string" ? rawValue.trim() : "";
    if (TOKEN_NAME.test(name) && TOKEN_VALUE.test(value) && value.length <= MAX_VALUE_LENGTH) {
      out[name] = value;
      if (Object.keys(out).length >= MAX_TOKENS) break;
    }
  }
  return out;
};

const nearestRadiusKey = (value) => {
  const rem = parseFloat(value);
  if (!Number.isFinite(rem)) return "md";
  let best = "md";
  let bestDistance = Infinity;
  for (const [key, { value: v }] of Object.entries(RADIUS_OPTIONS)) {
    const distance = Math.abs(parseFloat(v) - rem);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = key;
    }
  }
  return best;
};

/** Derives the simple summary fields (used for swatches and the agent note) from light tokens. */
export const tokenSummary = (light = {}) => ({
  primaryColor: light.primary ?? DEFAULT_DESIGN_SYSTEM.primaryColor,
  accentColor: light.accent ?? light.secondary ?? DEFAULT_DESIGN_SYSTEM.accentColor,
  radius: nearestRadiusKey(light.radius),
  font: "sans",
});

/**
 * Validates a design system imported from CSS. Re-sanitizes the tokens (they may come from a client)
 * and derives the summary fields. Returns { data } (ready for the database) or { error }.
 */
export const validateImportedDesignSystem = (input) => {
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  if (!name) return { error: "Give the design system a name." };
  if (name.length > MAX_NAME_LENGTH) return { error: `Keep the name under ${MAX_NAME_LENGTH} characters.` };
  const light = sanitizeTokens(input?.tokens?.light);
  if (!Object.keys(light).length) return { error: "Import a CSS theme with at least one variable in :root." };
  const dark = sanitizeTokens(input?.tokens?.dark);
  return { data: { name, tokens: { light, dark }, ...tokenSummary(light) } };
};

// ── Applying a design system to an app's globals.css ─────────────────────────────────────────

const BRAND_START = "/* v0-design-system:start */";
const BRAND_END = "/* v0-design-system:end */";

const hasTokens = (ds) => isPlainObject(ds?.tokens?.light) && Object.keys(ds.tokens.light).length > 0;

const simpleBlock = (ds) => {
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
  return [BRAND_START, ":root {", ...colorVars, `  --radius: ${radius};`, `  --font-sans: ${font};`, "}", ".dark {", ...colorVars, "}", BRAND_END].join("\n");
};

const tokenBlock = (tokens) => {
  const decls = (obj) => Object.entries(obj).map(([name, value]) => `  --${name}: ${value};`).join("\n");
  const parts = [BRAND_START, ":root {", decls(sanitizeTokens(tokens.light)), "}"];
  const dark = sanitizeTokens(tokens.dark);
  if (Object.keys(dark).length) parts.push(".dark {", decls(dark), "}");
  parts.push(BRAND_END);
  return parts.join("\n");
};

/**
 * Returns `css` (an app's globals.css) with the design system's brand block applied. A block
 * already present is replaced (so editing a system re-themes), otherwise it is appended. Later
 * CSS wins, so these overrides take effect over the base theme. Idempotent.
 */
export const applyBrandCss = (css, ds) => {
  const base = typeof css === "string" ? css : "";
  if (!ds) return base;
  const block = hasTokens(ds) ? tokenBlock(ds.tokens) : simpleBlock(ds);
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
  if (hasTokens(ds)) {
    return [
      "",
      `A full design system theme named "${ds.name}" is configured in app/globals.css: the complete shadcn token set (colors, radius, fonts) is set for both light and dark mode. Style the whole app with the semantic tokens — bg-background / text-foreground, bg-card / text-card-foreground, bg-primary / text-primary-foreground, bg-secondary, bg-muted / text-muted-foreground, bg-accent, border-border, rounded-lg (which follows the theme --radius) — and never hardcode Tailwind colors like bg-blue-600 or bg-white. The theme already handles light and dark mode, so the app will match this brand automatically.`,
    ].join("\n");
  }
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

// ── Starter themes ───────────────────────────────────────────────────────────────────────────
// A few ready-made shadcn themes users can load into the import box as a starting point. Each is a
// plain globals.css snippet, so parseShadcnCss turns it into a full token set like any other paste.

export const DESIGN_SYSTEM_PRESETS = [
  {
    key: "base",
    label: "Base",
    css: `:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}`,
  },
  {
    key: "ocean",
    label: "Ocean",
    css: `:root {
  --background: oklch(0.99 0.005 240);
  --foreground: oklch(0.2 0.03 250);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.2 0.03 250);
  --primary: oklch(0.55 0.18 250);
  --primary-foreground: oklch(0.99 0.01 240);
  --secondary: oklch(0.95 0.02 240);
  --secondary-foreground: oklch(0.3 0.04 250);
  --muted: oklch(0.96 0.01 240);
  --muted-foreground: oklch(0.5 0.03 250);
  --accent: oklch(0.7 0.15 190);
  --accent-foreground: oklch(0.2 0.03 250);
  --destructive: oklch(0.58 0.22 25);
  --border: oklch(0.9 0.02 240);
  --input: oklch(0.9 0.02 240);
  --ring: oklch(0.55 0.18 250);
  --radius: 0.75rem;
}
.dark {
  --background: oklch(0.18 0.03 250);
  --foreground: oklch(0.95 0.01 240);
  --card: oklch(0.23 0.03 250);
  --card-foreground: oklch(0.95 0.01 240);
  --primary: oklch(0.65 0.17 250);
  --primary-foreground: oklch(0.15 0.03 250);
  --secondary: oklch(0.3 0.03 250);
  --secondary-foreground: oklch(0.95 0.01 240);
  --muted: oklch(0.3 0.03 250);
  --muted-foreground: oklch(0.7 0.03 250);
  --accent: oklch(0.72 0.15 190);
  --accent-foreground: oklch(0.15 0.03 250);
  --destructive: oklch(0.7 0.19 22);
  --border: oklch(1 0 0 / 12%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.65 0.17 250);
}`,
  },
];
