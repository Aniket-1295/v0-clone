import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPEN,
  closePanel,
  closedPanels,
  nextActive,
  openPanel,
  parseOpenPanels,
  parseTabParam,
  storageKey,
} from "@/lib/workspace-panels";

describe("parseTabParam", () => {
  it("accepts every known panel id", () => {
    expect(parseTabParam("settings")).toBe("settings");
    expect(parseTabParam("code")).toBe("code");
    expect(parseTabParam("terminal")).toBe("terminal");
  });

  it("falls back to preview for missing or unknown values", () => {
    expect(parseTabParam("nope")).toBe("preview");
    expect(parseTabParam(undefined)).toBe("preview");
    expect(parseTabParam("")).toBe("preview");
  });
});

describe("parseOpenPanels", () => {
  it("keeps preview, drops unknown ids and de-dupes", () => {
    expect(parseOpenPanels(["code", "nope", "code", "logs"])).toEqual(["preview", "code", "logs"]);
  });

  it("returns only preview for empty or garbage input", () => {
    expect(parseOpenPanels([])).toEqual(["preview"]);
    expect(parseOpenPanels(undefined)).toEqual(["preview"]);
    expect(parseOpenPanels("{not json")).toEqual(["preview"]);
    expect(parseOpenPanels('{"open":["code"]}')).toEqual(["preview"]);
  });

  it("parses a stored JSON array and keeps order after preview", () => {
    expect(parseOpenPanels('["settings","preview","diff"]')).toEqual(["settings", "preview", "diff"]);
  });
});

describe("openPanel and closePanel", () => {
  it("appends a closed panel and ignores unknown ids", () => {
    expect(openPanel(DEFAULT_OPEN, "settings")).toEqual(["preview", "code", "settings"]);
    expect(openPanel(DEFAULT_OPEN, "code")).toEqual(["preview", "code"]);
    expect(openPanel(DEFAULT_OPEN, "nope")).toEqual(["preview", "code"]);
  });

  it("cannot close Preview", () => {
    expect(closePanel(["preview", "code"], "preview")).toEqual(["preview", "code"]);
  });

  it("closes a closeable panel", () => {
    expect(closePanel(["preview", "code", "diff"], "code")).toEqual(["preview", "diff"]);
  });
});

describe("nextActive", () => {
  it("keeps the current tab when another one is closed", () => {
    expect(nextActive({ open: ["preview", "code", "diff"], active: "diff", closing: "code" })).toBe("diff");
  });

  it("falls back to preview when the active tab is closed", () => {
    expect(nextActive({ open: ["preview", "code", "logs"], active: "logs", closing: "logs" })).toBe("preview");
  });
});

describe("closedPanels", () => {
  it("lists panels that are not open, in registry order", () => {
    expect(closedPanels(["preview", "code"]).map((panel) => panel.id)).toEqual([
      "diff",
      "logs",
      "terminal",
      "settings",
    ]);
  });
});

describe("storageKey", () => {
  it("namespaces the key per chat", () => {
    expect(storageKey("abc")).toBe("v0:panels:abc");
  });
});
