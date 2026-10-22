import { structuredPatch } from "diff";

// Files bigger than this are listed as changed but not diffed line by line.
export const MAX_DIFF_BYTES = 200_000;

const STATUS_ORDER = { modified: 0, added: 1, deleted: 2 };

const textFiles = (files) =>
  Object.fromEntries(Object.entries(files || {}).filter(([, content]) => typeof content === "string"));

/**
 * The changes between two versions' file maps ({ path: content }), one entry per changed
 * file: { path, status: added | modified | deleted, added, removed, hunks, tooLarge }.
 * Hunks are jsdiff hunks ({ oldStart, newStart, lines: ["+x", "-y", " z"] }).
 */
export const diffVersions = (oldFiles, newFiles) => {
  const before = textFiles(oldFiles);
  const after = textFiles(newFiles);
  const paths = [...new Set([...Object.keys(before), ...Object.keys(after)])];

  return paths
    .filter((path) => before[path] !== after[path])
    .map((path) => {
      const status = !(path in before) ? "added" : !(path in after) ? "deleted" : "modified";
      const oldText = before[path] ?? "";
      const newText = after[path] ?? "";

      if (oldText.length + newText.length > MAX_DIFF_BYTES) {
        return { path, status, added: 0, removed: 0, hunks: [], tooLarge: true };
      }

      const { hunks } = structuredPatch(path, path, oldText, newText, "", "", { context: 3 });
      let added = 0;
      let removed = 0;
      for (const hunk of hunks) {
        for (const line of hunk.lines) {
          if (line[0] === "+") added++;
          else if (line[0] === "-") removed++;
        }
      }
      return { path, status, added, removed, hunks, tooLarge: false };
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.path.localeCompare(b.path));
};

/**
 * Numbers the lines of a hunk for display: [{ type: add | del | ctx | meta, oldLine, newLine, text }].
 * jsdiff's "\ No newline at end of file" markers become meta rows.
 */
export const numberHunkLines = (hunk) => {
  let oldLine = hunk.oldStart;
  let newLine = hunk.newStart;
  return hunk.lines.map((line) => {
    const text = line.slice(1);
    if (line[0] === "+") return { type: "add", oldLine: null, newLine: newLine++, text };
    if (line[0] === "-") return { type: "del", oldLine: oldLine++, newLine: null, text };
    if (line[0] === "\\") return { type: "meta", oldLine: null, newLine: null, text: line };
    return { type: "ctx", oldLine: oldLine++, newLine: newLine++, text };
  });
};
