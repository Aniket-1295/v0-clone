"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FigmaIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { showActionError } from "@/lib/show-action-error";
import { useConnectFigma, useDisconnectFigma, useFigmaStatus } from "@/modules/figma/hooks";

/**
 * User-level Figma connection (Settings → Integrations). The token is write-only.
 */
const FigmaSection = () => {
  const router = useRouter();
  const { data: status } = useFigmaStatus();
  const connect = useConnectFigma();
  const disconnect = useDisconnectFigma();
  const [token, setToken] = useState("");
  const busy = connect.isPending || disconnect.isPending;
  const connected = !!status?.connected;

  const save = async (event) => {
    event.preventDefault();
    try {
      await connect.mutateAsync(token);
      setToken("");
    } catch (error) {
      showActionError(error, router, "Could not connect Figma.");
    }
  };

  const clear = async () => {
    try {
      await disconnect.mutateAsync();
      setToken("");
    } catch (error) {
      showActionError(error, router, "Could not disconnect Figma.");
    }
  };

  return (
    <>
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">Figma</p>
        <p className="text-xs text-muted-foreground">
          {connected
            ? `Connected as ${status.handle || "Figma"}. Used to import frames into a chat.`
            : "Connect a personal access token to import Figma frames."}
        </p>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {connected ? (
          <div className="flex items-center gap-2 rounded-md border px-2.5 py-2">
            <FigmaIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <p className="truncate text-xs">{status.handle || "Connected"}</p>
          </div>
        ) : (
          <form onSubmit={save} className="flex flex-col gap-2">
            <Input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="figd_…"
              aria-label="Figma personal access token"
              className="h-8 font-mono text-xs"
              autoComplete="off"
            />
            <Button
              type="submit"
              size="sm"
              className="w-full gap-1.5 bg-foreground text-background hover:bg-foreground/90"
              disabled={!token.trim() || busy}
            >
              {connect.isPending && <Spinner className="size-3.5" />}
              Connect Figma
            </Button>
          </form>
        )}
        {connected && (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={clear}>
            {disconnect.isPending && <Spinner className="size-3.5" />}
            Disconnect
          </Button>
        )}
        <p className="text-[11px] text-muted-foreground">
          Create a token in Figma → Settings → Security. The token cannot be viewed again.
        </p>
      </div>
    </>
  );
};

export default FigmaSection;
