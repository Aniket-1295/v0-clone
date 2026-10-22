"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { showActionError } from "@/lib/show-action-error";
import { useDatabaseStatus, useDisconnectDatabase, useSetDatabaseUrl } from "@/modules/chats/hooks/chat";

/**
 * Connect or replace this chat's Postgres URL. The value is write-only; the UI
 * only ever shows the host. Used as DATABASE_URL in the app.
 */
const DatabaseSection = ({ chatId }) => {
  const router = useRouter();
  const { data: status } = useDatabaseStatus(chatId);
  const connect = useSetDatabaseUrl(chatId);
  const disconnect = useDisconnectDatabase(chatId);
  const [url, setUrl] = useState("");
  const busy = connect.isPending || disconnect.isPending;
  const connected = !!status?.connected;

  const save = async (event) => {
    event.preventDefault();
    try {
      await connect.mutateAsync(url);
      setUrl("");
    } catch (error) {
      showActionError(error, router, "Could not connect the database.");
    }
  };

  const clear = async () => {
    try {
      await disconnect.mutateAsync();
      setUrl("");
    } catch (error) {
      showActionError(error, router, "Could not disconnect the database.");
    }
  };

  return (
    <>
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">Database</p>
        <p className="text-xs text-muted-foreground">
          A Postgres connection for this chat. Used as DATABASE_URL in the preview and when you publish.
        </p>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {connected && (
          <div className="rounded-md border px-2.5 py-2">
            <p className="truncate font-mono text-xs">{status.host || "Connected"}</p>
            {status.database ? (
              <p className="truncate font-mono text-[11px] text-muted-foreground">{status.database}</p>
            ) : null}
          </div>
        )}

        <form onSubmit={save} className="flex flex-col gap-2">
          <Input
            type="password"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={connected ? "postgresql://… (replace)" : "postgresql://user:pass@host/db"}
            aria-label="Postgres connection URL"
            className="h-8 font-mono text-xs"
            autoComplete="off"
          />
          <div className="flex gap-2">
            {connected && (
              <Button type="button" variant="ghost" size="sm" className="flex-1" disabled={busy} onClick={clear}>
                {disconnect.isPending && <Spinner className="size-3.5" />}
                Disconnect
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              className="flex-1 gap-1.5 bg-foreground text-background hover:bg-foreground/90"
              disabled={!url.trim() || busy}
            >
              {connect.isPending && <Spinner className="size-3.5" />}
              {connected ? "Replace" : "Connect"}
            </Button>
          </div>
        </form>
        <p className="text-[11px] text-muted-foreground">
          Do not put this in Instructions. Works with Neon, Supabase or any Postgres. The URL cannot be viewed again.
        </p>
      </div>
    </>
  );
};

export default DatabaseSection;
