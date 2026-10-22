"use client";

import { DatabaseIcon } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { visibleActionError } from "@/lib/action-result";
import { useDatabaseSchema, useDatabaseStatus } from "@/modules/chats/hooks/chat";

const Message = ({ children, busy }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
    <div className="flex size-10 items-center justify-center rounded-lg border bg-background">
      {busy ? <Spinner className="size-5" /> : <DatabaseIcon className="size-5" />}
    </div>
    <p className="max-w-xs text-sm">{children}</p>
  </div>
);

const tableLabel = (table) =>
  table.schema && table.schema !== "public" ? `${table.schema}.${table.name}` : table.name;

/**
 * Read-only table and column list for the chat's connected Postgres database.
 */
const DatabaseView = ({ chatId }) => {
  const { data: status, isPending: statusPending } = useDatabaseStatus(chatId);
  const connected = !!status?.connected;
  const { data, isPending, isError, error } = useDatabaseSchema(chatId, { enabled: connected });

  if (statusPending) return <Message busy>Loading database…</Message>;
  if (!connected) return <Message>Connect a database in Settings.</Message>;
  if (isPending) return <Message busy>Reading tables…</Message>;
  if (isError) {
    return <Message>{visibleActionError(error, "Could not read the database schema.")}</Message>;
  }

  const tables = data?.tables ?? [];
  if (tables.length === 0) {
    return <Message>Connected{status.host ? ` to ${status.host}` : ""}. No user tables yet.</Message>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">Database</p>
        <p className="truncate text-xs text-muted-foreground">
          {status.host}
          {status.database ? ` / ${status.database}` : ""}
        </p>
      </div>
      <ul className="min-h-0 flex-1 overflow-auto p-3">
        {tables.map((table) => (
          <li key={`${table.schema}.${table.name}`} className="mb-3">
            <p className="font-mono text-xs font-medium">{tableLabel(table)}</p>
            <ul className="mt-1 border-l pl-3">
              {(table.columns ?? []).map((column) => (
                <li key={column.name} className="flex justify-between gap-3 py-0.5 font-mono text-[11px]">
                  <span>{column.name}</span>
                  <span className="text-muted-foreground">{column.type}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DatabaseView;
