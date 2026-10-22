// The Next.js dev server in a chat's sandbox (Next 16) writes its server output and the
// browser's console to this file, one entry per line: "[hh:mm:ss.mmm] Server  ERROR   message".
export const APP_LOG_FILE = "/home/user/.next/dev/logs/next-development.log";
export const APP_LOG_LINES = 400;

const ENTRY = /^\[(\d{2}:\d{2}:\d{2}\.\d{3})\] (Server|Browser)\s+([A-Z]+) *(.*)$/;
// Terminal colour codes some messages carry.
const ANSI = /\u001b\[[0-9;]*m/g;

const LEVELS = { ERROR: "error", WARN: "warn", WARNING: "warn", INFO: "info", LOG: "log", DEBUG: "debug" };

/**
 * Parses the log file into entries { id, time, source: server | browser, level, message }.
 * Lines that do not start a new entry (stack traces, multi-line messages) belong to the
 * entry before them. Text before the first entry is dropped (a partial first line from tail).
 */
export const parseAppLogs = (text) => {
  const entries = [];
  for (const rawLine of (text || "").replace(ANSI, "").split("\n")) {
    const match = rawLine.match(ENTRY);
    if (match) {
      const [, time, source, level, message] = match;
      entries.push({
        id: entries.length,
        time,
        source: source.toLowerCase(),
        level: LEVELS[level] ?? "log",
        message,
      });
    } else if (entries.length && rawLine.trim()) {
      entries[entries.length - 1].message += `\n${rawLine}`;
    }
  }
  return entries;
};

/** Entries matching the panel's filters: level "all" | "errors" | "warnings", source "all" | "server" | "browser". */
export const filterAppLogs = (entries, { level = "all", source = "all", query = "" } = {}) => {
  const needle = query.trim().toLowerCase();
  return entries.filter(
    (entry) =>
      (level === "all" || (level === "errors" ? entry.level === "error" : entry.level === "error" || entry.level === "warn")) &&
      (source === "all" || entry.source === source) &&
      (!needle || entry.message.toLowerCase().includes(needle))
  );
};
