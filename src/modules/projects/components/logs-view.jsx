"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon, ScrollTextIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/hint";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { filterAppLogs, parseAppLogs } from "@/lib/app-logs";
import { useAppLogs } from "@/modules/chats/hooks/chat";

const LEVEL_FILTERS = [
  { value: "all", label: "All" },
  { value: "warnings", label: "Warnings" },
  { value: "errors", label: "Errors" },
];
const SOURCE_FILTERS = [
  { value: "all", label: "Server and browser" },
  { value: "server", label: "Server" },
  { value: "browser", label: "Browser" },
];
const LEVEL_ROW = {
  error: "bg-red-500/10 text-red-600 dark:text-red-400",
  warn: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const Message = ({ children, busy }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
    <div className="flex size-10 items-center justify-center rounded-lg border bg-background">
      {busy ? <Spinner className="size-5" /> : <ScrollTextIcon className="size-5" />}
    </div>
    <p className="max-w-xs text-sm">{children}</p>
  </div>
);

const Segmented = ({ options, value, onChange, label }) => (
  <div role="radiogroup" aria-label={label} className="flex rounded-md border p-0.5">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={value === option.value}
        onClick={() => onChange(option.value)}
        className={cn(
          "h-6 rounded px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer",
          value === option.value && "bg-accent text-foreground"
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);

/**
 * Live dev-server logs of the chat's app: the Next.js server output and the preview's
 * browser console, refreshed every few seconds while the tab is open.
 */
export default function LogsView({ chatId, active }) {
  const { data, isPending, isError, error } = useAppLogs(chatId, { enabled: active });
  const [level, setLevel] = useState("all");
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef(null);
  const atBottomRef = useRef(true);

  const entries = data?.state === "ok" ? parseAppLogs(data.text) : [];
  const visible = filterAppLogs(entries, { level, source, query });
  const lastId = visible.at(-1)?.id;
  const lastLength = visible.at(-1)?.message.length;

  // Follow new entries, unless the user has scrolled up to read.
  useEffect(() => {
    const element = scrollRef.current;
    if (element && atBottomRef.current) element.scrollTop = element.scrollHeight;
  }, [lastId, lastLength, visible.length]);

  if (isPending) return <Message busy>Loading logs...</Message>;
  if (isError) return <Message>{error?.message || "Could not read the logs."}</Message>;
  if (data.state === "none") return <Message>Logs will appear here once your app is running in a preview.</Message>;
  if (data.state === "asleep") return <Message>The preview is asleep. Open the Preview tab to start it again, then come back.</Message>;

  const onCopy = () => {
    navigator.clipboard.writeText(visible.map((entry) => `[${entry.time}] ${entry.source} ${entry.level} ${entry.message}`).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2">
        <Segmented options={LEVEL_FILTERS} value={level} onChange={setLevel} label="Level" />
        <select
          aria-label="Source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="h-7 rounded-md border bg-background px-2 text-xs"
        >
          {SOURCE_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="flex h-7 min-w-32 flex-1 items-center gap-1.5 rounded-md border bg-background px-2 text-xs">
          <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter logs"
            aria-label="Filter logs"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </label>
        <Hint text={copied ? "Copied" : "Copy logs"} side="bottom">
          <Button variant="ghost" size="icon" className="size-7" aria-label="Copy logs" onClick={onCopy} disabled={!visible.length}>
            {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          </Button>
        </Hint>
      </div>

      {visible.length === 0 ? (
        <Message>{entries.length ? "No log entries match these filters." : "No logs yet. Use the preview and its output shows up here."}</Message>
      ) : (
        <div
          ref={scrollRef}
          onScroll={(event) => {
            const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
            atBottomRef.current = scrollHeight - scrollTop - clientHeight < 24;
          }}
          className="min-h-0 flex-1 overflow-auto bg-background py-1 font-mono text-xs leading-5"
        >
          {visible.map((entry) => (
            <div key={entry.id} className={cn("flex gap-3 px-3", LEVEL_ROW[entry.level])}>
              <span className="shrink-0 select-none text-muted-foreground">{entry.time}</span>
              <span className="w-14 shrink-0 select-none text-muted-foreground">{entry.source}</span>
              <span className="min-w-0 whitespace-pre-wrap break-words">{entry.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
