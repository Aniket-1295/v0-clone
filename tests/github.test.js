import { describe, expect, it } from "vitest";
import { buildTree, repoNameFor } from "@/lib/github";

describe("buildTree", () => {
  it("keeps text files, drops dot files, unsafe paths and huge files", () => {
    const { tree, skipped } = buildTree({
      "app/page.tsx": "export default 1",
      "/package.json": "{}",
      ".env.local": "SECRET=1",
      "app/.hidden/x.ts": "x",
      "../outside.ts": "x",
      "public/big.txt": "x".repeat(1024 * 1024 + 1),
      "binary.png": null,
    });
    expect(tree.map((entry) => entry.path)).toEqual(["app/page.tsx", "package.json"]);
    expect(tree[0]).toEqual({ path: "app/page.tsx", mode: "100644", type: "blob", content: "export default 1" });
    expect(skipped.sort()).toEqual([".env.local", "../outside.ts", "app/.hidden/x.ts", "binary.png", "public/big.txt"].sort());
  });
});

describe("repoNameFor", () => {
  it("turns a chat title into a valid repository name", () => {
    expect(repoNameFor("Rosa's Bakery — landing page!")).toBe("rosa-s-bakery-landing-page");
    expect(repoNameFor("...")).toBe("draftsmith-app");
    expect(repoNameFor("x".repeat(200))).toHaveLength(80);
  });
});
