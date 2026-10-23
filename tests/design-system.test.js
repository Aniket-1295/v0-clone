import { describe, expect, it } from "vitest";
import {
  applyBrandCss,
  buildDesignSystemNote,
  contrastForeground,
  validateDesignSystem,
} from "@/lib/design-system";

const ds = { name: "Ocean", primaryColor: "#2563eb", accentColor: "#f59e0b", radius: "lg", font: "serif" };

describe("validateDesignSystem", () => {
  it("accepts good input and lowercases colors", () => {
    expect(validateDesignSystem({ ...ds, primaryColor: "#2563EB" }).data).toEqual({ ...ds, primaryColor: "#2563eb" });
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

describe("applyBrandCss", () => {
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

describe("buildDesignSystemNote", () => {
  it("is empty without a design system", () => {
    expect(buildDesignSystemNote(null)).toBe("");
  });

  it("names the theme and steers the agent to semantic tokens", () => {
    const note = buildDesignSystemNote(ds);
    expect(note).toContain('"Ocean"');
    expect(note).toContain("#2563eb");
    expect(note).toContain("bg-primary");
    expect(note).toContain("bg-blue-600"); // mentioned as what to avoid
    expect(note).toContain("Serif");
  });
});
