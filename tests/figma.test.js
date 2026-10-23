import { describe, expect, it } from "vitest";
import { MAX_PROMPT_LENGTH } from "@/lib/generation-limits";
import {
  DEFAULT_FIGMA_REQUEST,
  FIGMA_PROMPT_PREFIX,
  MAX_TOP_FRAMES,
  buildFigmaPrompt,
  figmaErrorMessage,
  isFigmaPrompt,
  listTopFrames,
  normalizeNodeId,
  parseFigmaUrl,
  rgbToHex,
  summarizeNode,
} from "@/lib/figma";

describe("parseFigmaUrl", () => {
  it("parses a design frame URL and normalizes node-id", () => {
    expect(
      parseFigmaUrl("https://www.figma.com/design/HqrxTMOdk3yuRNWoMbPLuE/Checkout?node-id=12-34")
    ).toEqual({ fileKey: "HqrxTMOdk3yuRNWoMbPLuE", nodeId: "12:34" });
  });

  it("parses file and proto links, and URLs without a scheme", () => {
    expect(parseFigmaUrl("https://figma.com/file/AbC123/Name?node-id=0:1")).toEqual({
      fileKey: "AbC123",
      nodeId: "0:1",
    });
    expect(parseFigmaUrl("https://www.figma.com/proto/AbC123/Flow")).toEqual({
      fileKey: "AbC123",
      nodeId: null,
    });
    expect(parseFigmaUrl("figma.com/design/AbC123/Home")).toEqual({ fileKey: "AbC123", nodeId: null });
  });

  it("rejects empty, non-strings, other hosts and unknown paths", () => {
    expect(parseFigmaUrl("").error).toMatch(/Paste a Figma/);
    expect(parseFigmaUrl("   ").error).toMatch(/Paste a Figma/);
    expect(parseFigmaUrl(null).error).toMatch(/Paste a Figma/);
    expect(parseFigmaUrl(12).error).toMatch(/must be text/);
    expect(parseFigmaUrl("not a url").error).toMatch(/not a valid Figma link/);
    expect(parseFigmaUrl("https://evil.com/design/AbC123/x").error).toMatch(/figma.com/);
    expect(parseFigmaUrl("https://www.figma.com/community/file/1/x").error).toMatch(/file or frame/);
    expect(parseFigmaUrl("https://www.figma.com/design/").error).toMatch(/file or frame/);
  });
});

describe("normalizeNodeId", () => {
  it("turns URL hyphens into API colons", () => {
    expect(normalizeNodeId("12-34")).toBe("12:34");
    expect(normalizeNodeId("12:34")).toBe("12:34");
    expect(normalizeNodeId("")).toBeNull();
    expect(normalizeNodeId(null)).toBeNull();
  });
});

describe("listTopFrames", () => {
  const document = {
    children: [
      {
        name: "Desktop",
        children: [
          { id: "1:1", name: "Home", type: "FRAME" },
          { id: "1:2", name: "Title", type: "TEXT" },
          { id: "1:3", name: "Button", type: "COMPONENT" },
        ],
      },
      {
        name: "Mobile",
        children: [{ id: "2:1", name: "Menu", type: "COMPONENT_SET" }],
      },
    ],
  };

  it("keeps page-level frames, components and sets", () => {
    expect(listTopFrames(document)).toEqual([
      { id: "1:1", name: "Home", page: "Desktop", type: "FRAME" },
      { id: "1:3", name: "Button", page: "Desktop", type: "COMPONENT" },
      { id: "2:1", name: "Menu", page: "Mobile", type: "COMPONENT_SET" },
    ]);
  });

  it("caps the list", () => {
    const kids = Array.from({ length: MAX_TOP_FRAMES + 5 }, (_, i) => ({
      id: `1:${i}`,
      name: `F${i}`,
      type: "FRAME",
    }));
    expect(listTopFrames({ children: [{ name: "P", children: kids }] })).toHaveLength(MAX_TOP_FRAMES);
  });
});

describe("summarizeNode", () => {
  it("keeps layout, text, fills and drops unused fields", () => {
    const summary = summarizeNode({
      id: "1:1",
      name: "Card",
      type: "FRAME",
      absoluteBoundingBox: { x: 0, y: 0, width: 320, height: 80 },
      layoutMode: "VERTICAL",
      paddingTop: 8,
      paddingRight: 12,
      paddingBottom: 8,
      paddingLeft: 12,
      itemSpacing: 4,
      fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0 } }],
      pluginData: { secret: true },
      children: [
        { name: "Title", type: "TEXT", characters: "Hello", fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }] },
      ],
    });
    expect(summary.tree).toMatchObject({
      name: "Card",
      type: "FRAME",
      size: "320x80",
      layout: "col",
      pad: "8/12/8/12",
      gap: 4,
      fill: "#ff0000",
    });
    expect(summary.tree.children[0].text).toBe("Hello");
    expect(summary.colors).toEqual(["#ff0000", "#000000"]);
    expect(summary.text).not.toContain("pluginData");
    expect(summary.text).not.toContain("secret");
  });

  it("caps a huge tree so the JSON stays small", () => {
    const children = Array.from({ length: 40 }, (_, i) => ({
      name: `Row ${i}`,
      type: "TEXT",
      characters: "x".repeat(300),
    }));
    const summary = summarizeNode({ name: "Huge", type: "FRAME", children }, { maxChars: 400 });
    expect(summary.text.length).toBeLessThanOrEqual(400);
  });
});

describe("rgbToHex", () => {
  it("converts Figma 0-1 RGB", () => {
    expect(rgbToHex({ r: 1, g: 0.5, b: 0 })).toBe("#ff8000");
    expect(rgbToHex(null)).toBeNull();
  });
});

describe("buildFigmaPrompt", () => {
  const summary = { tree: { name: "Home", type: "FRAME" }, colors: ["#111111"], text: '{"name":"Home","type":"FRAME"}' };

  it("starts with Figma: and uses the default request when the extra text is empty", () => {
    const prompt = buildFigmaPrompt({
      fileName: "Checkout",
      nodeName: "Home",
      fileKey: "AbC123",
      nodeId: "12:34",
      summary,
      userText: "  ",
    });
    expect(prompt.startsWith(`${FIGMA_PROMPT_PREFIX} Recreate Home`)).toBe(true);
    expect(isFigmaPrompt(prompt)).toBe(true);
    expect(prompt).toContain("File: Checkout (AbC123)");
    expect(prompt).toContain("Frame: Home (12:34)");
    expect(prompt).toContain(DEFAULT_FIGMA_REQUEST);
    expect(prompt).toContain("## Structure");
    expect(prompt).toContain("## Colors");
    expect(prompt).toContain("#111111");
    expect(prompt.length).toBeLessThanOrEqual(MAX_PROMPT_LENGTH);
  });

  it("keeps the user's extra text and stays under the prompt limit", () => {
    const prompt = buildFigmaPrompt({
      fileName: "App",
      nodeName: "Pay",
      fileKey: "AbC",
      nodeId: "1:2",
      summary: { text: "n".repeat(8000), colors: ["#000"] },
      userText: "Build the checkout flow only.",
    });
    expect(prompt).toContain("Build the checkout flow only.");
    expect(prompt).not.toContain(DEFAULT_FIGMA_REQUEST);
    expect(prompt.length).toBeLessThanOrEqual(MAX_PROMPT_LENGTH);
  });
});

describe("isFigmaPrompt", () => {
  it("detects the marker and ignores other prompts", () => {
    expect(isFigmaPrompt("Figma: Recreate Home")).toBe(true);
    expect(isFigmaPrompt("  Figma: Recreate Home")).toBe(true);
    expect(isFigmaPrompt("Recreate this design.")).toBe(false);
    expect(isFigmaPrompt("")).toBe(false);
  });
});

describe("figmaErrorMessage", () => {
  it("maps Figma HTTP statuses", () => {
    expect(figmaErrorMessage(401)).toMatch(/invalid or expired/);
    expect(figmaErrorMessage(403)).toMatch(/cannot open/);
    expect(figmaErrorMessage(404)).toMatch(/not found/);
    expect(figmaErrorMessage(429)).toMatch(/rate limit/);
    expect(figmaErrorMessage(413)).toMatch(/too large/);
    expect(figmaErrorMessage(500)).toMatch(/Could not read/);
  });
});
