import { describe, expect, it } from "vitest";
import { MAX_DIFF_BYTES, diffVersions, numberHunkLines } from "@/lib/version-diff";

describe("diffVersions", () => {
  it("lists added, modified and deleted files with line counts, modified first", () => {
    const changes = diffVersions(
      { "app/page.tsx": "a\nb\nc\n", "old.ts": "x\n", "same.ts": "s\n" },
      { "app/page.tsx": "a\nB\nc\nd\n", "new.ts": "n\nm\n", "same.ts": "s\n" }
    );
    expect(changes.map(({ path, status, added, removed }) => ({ path, status, added, removed }))).toEqual([
      { path: "app/page.tsx", status: "modified", added: 2, removed: 1 },
      { path: "new.ts", status: "added", added: 2, removed: 0 },
      { path: "old.ts", status: "deleted", added: 0, removed: 1 },
    ]);
  });

  it("returns nothing for identical versions and ignores non-text entries", () => {
    expect(diffVersions({ a: "1", bin: { size: 3 } }, { a: "1", bin: { size: 4 } })).toEqual([]);
  });

  it("handles a missing earlier version", () => {
    expect(diffVersions(null, { a: "1\n" })).toMatchObject([{ path: "a", status: "added", added: 1 }]);
  });

  it("does not diff very large files line by line", () => {
    const [change] = diffVersions({ big: "a" }, { big: "b".repeat(MAX_DIFF_BYTES) });
    expect(change).toMatchObject({ status: "modified", tooLarge: true, hunks: [] });
  });
});

describe("numberHunkLines", () => {
  it("numbers old and new lines", () => {
    const [change] = diffVersions({ f: "a\nb\nc\n" }, { f: "a\nB\nc\n" });
    expect(numberHunkLines(change.hunks[0])).toEqual([
      { type: "ctx", oldLine: 1, newLine: 1, text: "a" },
      { type: "del", oldLine: 2, newLine: null, text: "b" },
      { type: "add", oldLine: null, newLine: 2, text: "B" },
      { type: "ctx", oldLine: 3, newLine: 3, text: "c" },
    ]);
  });
});
