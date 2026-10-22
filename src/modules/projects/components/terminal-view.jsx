"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRightIcon, TerminalIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/hint";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ActionErrorCode } from "@/lib/action-result";
import { useRunTerminalCommand } from "@/modules/chats/hooks/chat";

const Message = ({ children }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
    <div className="flex size-10 items-center justify-center rounded-lg border bg-background">
      <TerminalIcon className="size-5" />
    </div>
    <p className="max-w-xs text-sm">{children}</p>
  </div>
);

// One finished command: the command line, its output, and how it ended.
const Entry = ({ entry }) => (
  <div className="px-3 py-1">
    <div className="flex items-center gap-1.5 text-foreground">
      <ChevronRightIcon className="size-3.5 shrink-0 text-emerald-500" />
      <span className="whitespace-pre-wrap break-words">{entry.command}</span>
    </div>
    {entry.stdout && <pre className="whitespace-pre-wrap break-words pl-5 text-foreground/90">{entry.stdout}</pre>}
    {entry.stderr && <pre className="whitespace-pre-wrap break-words pl-5 text-red-500/90">{entry.stderr}</pre>}
    {entry.note && <p className="pl-5 text-muted-foreground">{entry.note}</p>}
  </div>
);

const describe = (result) => {
  if (result.timedOut) return "Command timed out and was stopped (60s limit). Long-running processes like a dev server are not supported here.";
  if (result.exitCode && result.exitCode !== 0) return `Exited with code ${result.exitCode}`;
  if (!result.stdout && !result.stderr) return "(no output)";
  return null;
};

/**
 * A shell inside the chat's sandbox: type a command, see its output. One-shot commands run
 * in the app root; there is no persistent shell session, so each command starts fresh.
 */
export default function TerminalView({ chatId, active }) {
  const run = useRunTerminalCommand(chatId);
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState([]); // finished entries
  const [recall, setRecall] = useState({ list: [], at: -1 }); // past commands for Up/Down
  const [unavailable, setUnavailable] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [history, run.isPending]);

  useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);

  const submit = async () => {
    const value = command.trim();
    if (!value || run.isPending) return;
    setCommand("");
    setRecall((prev) => ({ list: [...prev.list, value], at: -1 }));
    try {
      const result = await run.mutateAsync(value);
      if (result.state !== "ok") {
        setUnavailable(result.state);
        return;
      }
      setUnavailable(null);
      setHistory((prev) => [...prev, { command: value, stdout: result.stdout, stderr: result.stderr, note: describe(result) }]);
    } catch (error) {
      const message = error?.code === ActionErrorCode.GENERATION_IN_PROGRESS ? error.message : error?.message || "Could not run the command.";
      setHistory((prev) => [...prev, { command: value, stdout: "", stderr: "", note: message }]);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    } else if (event.key === "ArrowUp" && recall.list.length) {
      event.preventDefault();
      const at = recall.at === -1 ? recall.list.length - 1 : Math.max(0, recall.at - 1);
      setRecall((prev) => ({ ...prev, at }));
      setCommand(recall.list[at]);
    } else if (event.key === "ArrowDown" && recall.at !== -1) {
      event.preventDefault();
      const at = recall.at + 1;
      if (at >= recall.list.length) {
        setRecall((prev) => ({ ...prev, at: -1 }));
        setCommand("");
      } else {
        setRecall((prev) => ({ ...prev, at }));
        setCommand(recall.list[at]);
      }
    }
  };

  if (unavailable === "none") return <Message>The terminal opens once your app is running in a preview.</Message>;
  if (unavailable === "asleep") return <Message>The preview is asleep. Open the Preview tab to start it again, then come back.</Message>;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background font-mono text-xs leading-5">
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
        <span className="text-xs text-muted-foreground">Runs in the app sandbox · {"/home/user"}</span>
        <Hint text="Clear" side="bottom">
          <Button variant="ghost" size="icon" className="size-6" aria-label="Clear terminal" onClick={() => setHistory([])} disabled={!history.length}>
            <Trash2Icon className="size-3.5" />
          </Button>
        </Hint>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto py-1" onClick={() => inputRef.current?.focus()}>
        {history.length === 0 && !run.isPending && (
          <p className="px-3 py-2 text-muted-foreground">Type a command and press Enter. For example: <span className="text-foreground">ls</span>, <span className="text-foreground">cat package.json</span>, <span className="text-foreground">npm run build</span>.</p>
        )}
        {history.map((entry, index) => (
          <Entry key={index} entry={entry} />
        ))}
        {run.isPending && (
          <div className="flex items-center gap-1.5 px-3 py-1 text-muted-foreground">
            <Spinner className="size-3.5" /> Running…
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 border-t px-3 py-2">
        <ChevronRightIcon className={cn("size-3.5 shrink-0", run.isPending ? "text-muted-foreground" : "text-emerald-500")} />
        <input
          ref={inputRef}
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={run.isPending}
          spellCheck={false}
          autoComplete="off"
          aria-label="Command"
          placeholder={run.isPending ? "Running…" : "Run a command"}
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
      </div>
    </div>
  );
}
