import db from "@/lib/db";

// Agent progress shown live in the chat (AgentStep rows). Only call these inside a
// step.run: code outside steps runs again on every replay of the function.

const shortPath = (filePath) => filePath.replace(/^\/home\/user\//, "");

const listNames = (names) => {
  const shown = names.slice(0, 2).map(shortPath).join(", ");
  return names.length > 2 ? `${shown} and ${names.length - 2} more` : shown;
};

/** What a tool call does, in a few words: { kind, label }. */
export const describeCall = ({ name, args = {} }) => {
  switch (name) {
    case "readFiles":
      return { kind: "read", label: `Read ${listNames(args.files ?? []) || "files"}` };
    case "createOrUpdateFiles":
      return { kind: "write", label: `Wrote ${listNames((args.files ?? []).map((file) => file.path)) || "files"}` };
    case "generateImage": {
      const prompt = String(args.prompt ?? "").trim();
      return { kind: "image", label: `Generating an image: ${prompt.length > 60 ? `${prompt.slice(0, 57)}...` : prompt}` };
    }
    case "terminal": {
      const command = String(args.command ?? "").trim();
      return { kind: "command", label: `Ran ${command.length > 80 ? `${command.slice(0, 77)}...` : command}` };
    }
    default:
      return { kind: "command", label: name };
  }
};

/**
 * Starts one step of a run ({ kind, label }, status "running"). `run` is { runId, chatId,
 * promptId }; `key` is unique within the run, so a retried Inngest step reuses its row.
 */
export const startStep = ({ runId, chatId, promptId }, key, { kind, label }) =>
  db.agentStep.upsert({
    where: { runId_key: { runId, key } },
    create: { runId, key, chatId, promptId, kind, label, status: "running" },
    update: { kind, label, status: "running" },
  });

/**
 * Ends one step of a run with `status` ("done" or "error"), optionally with a new label.
 * Only a running step changes: a step the user stopped while in flight stays "stopped".
 */
export const finishStep = ({ runId }, key, status, label) =>
  db.agentStep.updateMany({ where: { runId, key, status: "running" }, data: { status, ...(label ? { label } : {}) } });

/**
 * Marks unfinished steps, e.g. as "error" or "stopped". `where` must name a runId or a
 * promptId (an undefined value would match every run).
 */
export const closeRunningSteps = (where, status) => {
  if (!where.runId && !where.promptId) throw new Error("closeRunningSteps needs a runId or promptId");
  return db.agentStep.updateMany({ where: { ...where, status: "running" }, data: { status } });
};
