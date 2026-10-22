import { describe, expect, it } from "vitest";
import { copyTitle } from "@/lib/chat-copy";

describe("copyTitle", () => {
  it("adds a (copy) suffix", () => {
    expect(copyTitle("Landing page")).toBe("Landing page (copy)");
  });

  it("falls back for an empty title", () => {
    expect(copyTitle("   ")).toBe("Untitled (copy)");
  });

  it("keeps a very long title within the limit, ending in (copy)", () => {
    const title = copyTitle("x".repeat(200));
    expect(title.length).toBeLessThanOrEqual(120);
    expect(title.endsWith("... (copy)")).toBe(true);
  });
});
