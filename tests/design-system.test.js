import { describe, expect, it } from "vitest";
import {
  applyBrandCss,
  buildDesignSystemNote,
  contrastForeground,
  parseShadcnCss,
  tokenSummary,
  validateDesignSystem,
  validateImportedDesignSystem,
} from "@/lib/design-system";

const ds = { name: "Ocean", primaryColor: "#2563eb", accentColor: "#f59e0b", radius: "lg", font: "serif" };

describe("validateDesignSystem", () => {
  it("accepts good input, lowercases colors and marks it as simple", () => {
    expect(validateDesignSystem({ ...ds, primaryColor: "#2563EB" }).data).toEqual({ ...ds, primaryColor: "#2563eb", tokens: null });
  });

  it("rejects bad input", () => {
    expect(validateDesignSystem({ ...ds, name: "" }).error).toMatch(/name/i);
    expect(validateDesignSystem({ ...ds, name: "x".repeat(61) }).error).toMatch(/under/i);
    expect(validateDesignSystem({ ...ds, primaryColor: "blue" }).error).toMatch(/hex/i);
    expect(validateDesignSystem({ ...ds, radius: "huge" }).error).toMatch(/radius/i);
    expect(validateDesignSystem({ ...ds, font: "comic" }).error).toMatch(/font/i);
  });
});

describe("contrastForeground", () => {
  it("picks a readable text color", () => {
    expect(contrastForeground("#ffffff")).toBe("#000000");
    expect(contrastForeground("#000000")).toBe("#ffffff");
    expect(contrastForeground("#f59e0b")).toBe("#000000"); // light amber → black text
    expect(contrastForeground("#2563eb")).toBe("#ffffff"); // mid blue → white text
  });
});

describe("applyBrandCss (simple)", () => {
  const base = ":root {\n  --primary: oklch(0.2 0 0);\n  --radius: 0.5rem;\n}\n";

  it("appends a marker block with the brand overrides", () => {
    const out = applyBrandCss(base, ds);
    expect(out).toContain(base.trimEnd());
    expect(out).toContain("/* v0-design-system:start */");
    expect(out).toContain("--primary: #2563eb;");
    expect(out).toContain("--radius: 0.75rem;"); // lg
    expect(out).toContain("ui-serif");
    expect(out).toMatch(/\.dark \{/);
  });

  it("replaces an existing block instead of duplicating it", () => {
    const once = applyBrandCss(base, ds);
    const twice = applyBrandCss(once, { ...ds, primaryColor: "#10b981" });
    expect(twice.match(/v0-design-system:start/g)).toHaveLength(1);
    expect(twice).toContain("--primary: #10b981;");
    expect(twice).not.toContain("--primary: #2563eb;");
  });

  it("returns the css unchanged when there is no design system", () => {
    expect(applyBrandCss(base, null)).toBe(base);
  });
});

describe("parseShadcnCss", () => {
  const css = `@layer base {
  :root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --radius: 0.625rem;
  }
  .dark {
    --background: oklch(0.145 0 0);
    --primary: oklch(0.985 0 0);
  }
}`;

  it("parses :root and .dark token maps", () => {
    const { data } = parseShadcnCss(css);
    expect(data.light.primary).toBe("oklch(0.205 0 0)");
    expect(data.light.radius).toBe("0.625rem");
    expect(Object.keys(data.light)).toHaveLength(4);
    expect(data.dark.background).toBe("oklch(0.145 0 0)");
    expect(data.dark.primary).toBe("oklch(0.985 0 0)");
  });

  it("errors on empty or variable-free input", () => {
    expect(parseShadcnCss("").error).toBeTruthy();
    expect(parseShadcnCss(":root { color: red; }").error).toMatch(/no shadcn variables/i);
  });

  it("drops unsafe declarations that could break out of the block", () => {
    const { data } = parseShadcnCss(":root { --primary: oklch(0.2 0 0); --evil: red; } html { display: none; }");
    expect(data.light.primary).toBe("oklch(0.2 0 0)");
    expect(JSON.stringify(data)).not.toContain("display");
  });
});

describe("validateImportedDesignSystem", () => {
  it("sanitizes tokens and derives the summary", () => {
    const { data } = validateImportedDesignSystem({
      name: "Brand",
      tokens: { light: { primary: "oklch(0.55 0.18 250)", radius: "0.75rem", bad: "a;b" }, dark: { primary: "oklch(0.6 0.1 250)" } },
    });
    expect(data.name).toBe("Brand");
    expect(data.tokens.light.primary).toBe("oklch(0.55 0.18 250)");
    expect(data.tokens.light.bad).toBeUndefined(); // value with ; is dropped
    expect(data.primaryColor).toBe("oklch(0.55 0.18 250)"); // summary swatch
    expect(data.radius).toBe("lg"); // 0.75rem → lg
    expect(data.tokens.dark.primary).toBe("oklch(0.6 0.1 250)");
  });

  it("rejects a missing name or empty tokens", () => {
    expect(validateImportedDesignSystem({ name: "", tokens: { light: { primary: "red" } } }).error).toMatch(/name/i);
    expect(validateImportedDesignSystem({ name: "X", tokens: { light: {} } }).error).toMatch(/variable/i);
  });
});

describe("tokenSummary", () => {
  it("falls back to defaults when tokens are missing", () => {
    expect(tokenSummary({})).toEqual({ primaryColor: "#2563eb", accentColor: "#f59e0b", radius: "md", font: "sans" });
  });
});

describe("applyBrandCss (full tokens)", () => {
  const base = ":root {\n  --primary: oklch(0.2 0 0);\n}\n";
  const imported = { name: "Brand", tokens: { light: { primary: "oklch(0.55 0.18 250)", background: "oklch(1 0 0)" }, dark: { primary: "oklch(0.65 0.17 250)" } } };

  it("writes every token into :root and .dark", () => {
    const out = applyBrandCss(base, imported);
    expect(out).toContain("--primary: oklch(0.55 0.18 250);");
    expect(out).toContain("--background: oklch(1 0 0);");
    expect(out).toMatch(/\.dark \{\n {2}--primary: oklch\(0\.65 0\.17 250\);/);
  });

  it("omits an empty .dark block", () => {
    const out = applyBrandCss(base, { name: "X", tokens: { light: { primary: "red" }, dark: {} } });
    expect(out).not.toMatch(/\.dark \{/);
  });
});

describe("buildDesignSystemNote", () => {
  it("is empty without a design system", () => {
    expect(buildDesignSystemNote(null)).toBe("");
  });

  it("names the theme and steers the agent to semantic tokens (simple)", () => {
    const note = buildDesignSystemNote(ds);
    expect(note).toContain('"Ocean"');
    expect(note).toContain("#2563eb");
    expect(note).toContain("bg-primary");
    expect(note).toContain("bg-blue-600"); // mentioned as what to avoid
    expect(note).toContain("Serif");
  });

  it("describes a full imported theme", () => {
    const note = buildDesignSystemNote({ name: "Brand", tokens: { light: { primary: "red" }, dark: {} } });
    expect(note).toContain('"Brand"');
    expect(note).toContain("bg-background");
    expect(note).toContain("light and dark");
  });
});
