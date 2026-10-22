import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { MAX_FILE_BYTES, filesFromZipball, findNextApps, normalizeFolder, selectNextApp } from "@/lib/github-import";

const NEXT_PKG = JSON.stringify({ dependencies: { next: "15.0.0", react: "19.0.0" } });

// GitHub zipballs put everything under one "owner-repo-sha/" folder.
const zipball = (files) =>
  zipSync(Object.fromEntries(Object.entries(files).map(([path, content]) => [`me-repo-abc123/${path}`, typeof content === "string" ? strToU8(content) : content])));

describe("filesFromZipball", () => {
  it("strips the top folder and keeps text files", () => {
    const { files, skipped } = filesFromZipball(zipball({ "package.json": NEXT_PKG, "app/page.tsx": "export default 1" }));
    expect(files).toEqual({ "package.json": NEXT_PKG, "app/page.tsx": "export default 1" });
    expect(skipped).toBe(0);
  });

  it("skips dot files, node_modules, lockfiles, binaries and large files", () => {
    const { files, skipped } = filesFromZipball(
      zipball({
        "app/page.tsx": "ok",
        ".env": "SECRET=1",
        ".git/config": "x",
        "node_modules/a/index.js": "x",
        "package-lock.json": "{}",
        "public/logo.png": new Uint8Array([137, 80, 78, 71, 0, 1]),
        "big.txt": "a".repeat(MAX_FILE_BYTES + 1),
      })
    );
    expect(Object.keys(files)).toEqual(["app/page.tsx"]);
    expect(skipped).toBe(6);
  });
});

describe("findNextApps", () => {
  it("finds Next.js apps, shallowest first", () => {
    expect(
      findNextApps({
        "apps/web/package.json": NEXT_PKG,
        "package.json": JSON.stringify({ devDependencies: { next: "14" } }),
        "packages/ui/package.json": JSON.stringify({ dependencies: { react: "19" } }),
        "broken/package.json": "{",
      })
    ).toEqual(["", "apps/web"]);
  });
});

describe("selectNextApp", () => {
  it("uses the root when it is a Next.js app", () => {
    expect(selectNextApp({ "package.json": NEXT_PKG, "app/page.tsx": "x" })).toEqual({
      files: { "package.json": NEXT_PKG, "app/page.tsx": "x" },
      folder: "",
    });
  });

  it("picks the only Next.js app in a subfolder and re-roots its files", () => {
    const result = selectNextApp({ "README.md": "hi", "web/package.json": NEXT_PKG, "web/app/page.tsx": "x" });
    expect(result).toEqual({ files: { "package.json": NEXT_PKG, "app/page.tsx": "x" }, folder: "web" });
  });

  it("asks for a folder when there are several apps", () => {
    const result = selectNextApp({ "a/package.json": NEXT_PKG, "b/package.json": NEXT_PKG });
    expect(result.error).toMatch(/several/);
    expect(result.candidates).toEqual(["a", "b"]);
  });

  it("explains when there is no Next.js app or the folder is wrong", () => {
    expect(selectNextApp({ "index.html": "<p>" }).error).toMatch(/No Next.js app found/);
    expect(selectNextApp({ "a/package.json": NEXT_PKG }, "b").error).toMatch(/No Next.js app in "b"/);
  });
});

describe("normalizeFolder", () => {
  it("cleans valid folders and rejects unsafe ones", () => {
    expect(normalizeFolder(" /apps/web/ ")).toBe("apps/web");
    expect(normalizeFolder("")).toBe("");
    expect(normalizeFolder("../etc")).toBeNull();
    expect(normalizeFolder("a//b")).toBeNull();
    expect(normalizeFolder(".git")).toBeNull();
  });
});
