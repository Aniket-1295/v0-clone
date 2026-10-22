import { strFromU8, unzipSync } from "fflate";

// Import from GitHub: a repository's zipball becomes a chat's first version. Only what a
// version can hold is kept: text files, no dot files (.git, .next, .env secrets), no
// node_modules or lockfiles (npm install rebuilds them), nothing large.
export const MAX_ZIP_BYTES = 30 * 1024 * 1024;
export const MAX_FILE_BYTES = 200 * 1024;
export const MAX_FILES = 1500;
export const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

const SKIP_DIRS = new Set(["node_modules"]);
const SKIP_FILES = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lock", "bun.lockb"]);

/** A safe relative folder ("apps/web") or "" for the repository root; null when invalid. */
export const normalizeFolder = (value) => {
  const folder = String(value ?? "").trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!folder) return "";
  const parts = folder.split("/");
  if (parts.some((part) => !part || part === "." || part === ".." || part.startsWith("."))) return null;
  return folder;
};

const isNextPackageJson = (content) => {
  try {
    const pkg = JSON.parse(content);
    return !!(pkg.dependencies?.next || pkg.devDependencies?.next);
  } catch {
    return false;
  }
};

/**
 * The repository's files from its zipball ({ path: content }, paths relative to the repo
 * root, without GitHub's "owner-repo-sha/" prefix). Returns { files, skipped } where skipped
 * counts files left out (binary, too large, dot files, lockfiles, over the limits).
 */
export const filesFromZipball = (zipBytes) => {
  let skipped = 0;
  const entries = unzipSync(zipBytes, {
    // Skip directories, and anything too large before inflating it.
    filter: (file) => {
      if (file.name.endsWith("/")) return false;
      if (file.originalSize > MAX_FILE_BYTES) {
        skipped++;
        return false;
      }
      return true;
    },
  });

  const files = {};
  let total = 0;
  for (const [name, bytes] of Object.entries(entries)) {
    const path = name.split("/").slice(1).join("/");
    const parts = path.split("/");
    if (
      !path ||
      parts.some((part) => part.startsWith(".") || SKIP_DIRS.has(part)) ||
      SKIP_FILES.has(parts.at(-1)) ||
      bytes.includes(0) ||
      Object.keys(files).length >= MAX_FILES ||
      total + bytes.length > MAX_TOTAL_BYTES
    ) {
      skipped++;
      continue;
    }
    files[path] = strFromU8(bytes);
    total += bytes.length;
  }
  return { files, skipped };
};

/** Folders ("" for the root) whose package.json depends on Next.js, shallowest first. */
export const findNextApps = (files) =>
  Object.entries(files)
    .filter(([path, content]) => (path === "package.json" || path.endsWith("/package.json")) && isNextPackageJson(content))
    .map(([path]) => path.slice(0, -"package.json".length).replace(/\/$/, ""))
    .sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));

/**
 * Picks the Next.js app to import: `folder` when given, the root when it is a Next.js app,
 * or the only Next.js app in the repository. Returns { files } re-rooted at that folder, or
 * { error, candidates } explaining what to choose.
 */
export const selectNextApp = (files, folder = "") => {
  const apps = findNextApps(files);
  const chosen = folder || (apps.includes("") ? "" : apps.length === 1 ? apps[0] : null);

  if (chosen === null) {
    return apps.length
      ? { error: "This repository has several Next.js apps. Choose the folder to import.", candidates: apps }
      : { error: "No Next.js app found. Only Next.js apps (a package.json that depends on next) can be imported." };
  }
  if (!apps.includes(chosen)) {
    return { error: `No Next.js app in "${chosen}". Check the folder name.`, candidates: apps };
  }

  const prefix = chosen ? `${chosen}/` : "";
  const selected = Object.fromEntries(
    Object.entries(files)
      .filter(([path]) => path.startsWith(prefix))
      .map(([path, content]) => [path.slice(prefix.length), content])
  );
  return { files: selected, folder: chosen };
};
