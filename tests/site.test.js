import { describe, expect, it } from "vitest";
import { SITE_NAME, SITE_SLUG } from "@/lib/site";
import { projectNameFor } from "@/lib/vercel";

describe("brand", () => {
  it("derives a URL-safe slug from the product name", () => {
    expect(SITE_NAME).toBe("Draftsmith");
    expect(SITE_SLUG).toBe("draftsmith");
    expect(SITE_SLUG).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("projectNameFor", () => {
  it("prefixes the slug and ends with the chat id tail", () => {
    expect(projectNameFor({ id: "cmabc123XYZ789", title: "Rosa's Bakery!" })).toBe("draftsmith-rosa-s-bakery-xyz789");
  });

  it("falls back to 'app' for an empty title and stays a valid project name", () => {
    const name = projectNameFor({ id: "cm0000000000aa", title: "" });
    expect(name).toBe("draftsmith-app-0000aa");
    expect(name.length).toBeLessThanOrEqual(100);
  });
});
