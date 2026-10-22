import { describe, expect, it } from "vitest";
import { filterAppLogs, parseAppLogs } from "@/lib/app-logs";

const LOG = [
  "ial line cut by tail",
  "[00:00:06.889] Server  LOG     ✓ Ready in 6.1s",
  "[00:00:09.958] Server  ERROR   Error: boom",
  "    at Page (app/page.tsx:3:9)",
  "    at render",
  "[00:00:10.100] Browser WARN    \u001b[33mKey prop missing\u001b[39m",
  "[00:00:11.000] Browser INFO    clicked",
  "",
].join("\n");

describe("parseAppLogs", () => {
  it("parses entries, joins continuation lines and strips colour codes", () => {
    expect(parseAppLogs(LOG)).toEqual([
      { id: 0, time: "00:00:06.889", source: "server", level: "log", message: "✓ Ready in 6.1s" },
      { id: 1, time: "00:00:09.958", source: "server", level: "error", message: "Error: boom\n    at Page (app/page.tsx:3:9)\n    at render" },
      { id: 2, time: "00:00:10.100", source: "browser", level: "warn", message: "Key prop missing" },
      { id: 3, time: "00:00:11.000", source: "browser", level: "info", message: "clicked" },
    ]);
  });

  it("returns nothing for an empty or missing log", () => {
    expect(parseAppLogs("")).toEqual([]);
    expect(parseAppLogs(undefined)).toEqual([]);
  });
});

describe("filterAppLogs", () => {
  const entries = parseAppLogs(LOG);

  it("filters by level", () => {
    expect(filterAppLogs(entries, { level: "errors" }).map((e) => e.id)).toEqual([1]);
    expect(filterAppLogs(entries, { level: "warnings" }).map((e) => e.id)).toEqual([1, 2]);
  });

  it("filters by source and search text", () => {
    expect(filterAppLogs(entries, { source: "browser" }).map((e) => e.id)).toEqual([2, 3]);
    expect(filterAppLogs(entries, { query: "PAGE.TSX" }).map((e) => e.id)).toEqual([1]);
  });
});
