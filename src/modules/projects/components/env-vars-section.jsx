"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { showActionError } from "@/lib/show-action-error";
import { useDeleteEnvVar, useEnvVars, useSetEnvVar } from "@/modules/chats/hooks/chat";

/**
 * Environment variables (API keys and other secrets) of the chat's app. Values are shown
 * masked once saved; they can be replaced or deleted, never read back.
 */
const EnvVarsSection = ({ chatId }) => {
  const router = useRouter();
  const { data } = useEnvVars(chatId);
  const setVar = useSetEnvVar(chatId);
  const deleteVar = useDeleteEnvVar(chatId);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [editingKey, setEditingKey] = useState(null);

  const vars = data?.vars ?? [];
  const busy = setVar.isPending || deleteVar.isPending;

  const save = async (event) => {
    event.preventDefault();
    try {
      await setVar.mutateAsync([key, value]);
      setKey("");
      setValue("");
      setEditingKey(null);
    } catch (error) {
      showActionError(error, router, "Could not save the variable.");
    }
  };

  const remove = async (name) => {
    try {
      await deleteVar.mutateAsync([name]);
      if (editingKey === name) setEditingKey(null);
    } catch (error) {
      showActionError(error, router, "Could not delete the variable.");
    }
  };

  return (
    <>
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">Environment variables</p>
        <p className="text-xs text-muted-foreground">
          API keys and other secrets for this app. Used by the preview and when you publish. Values are encrypted and
          can&apos;t be viewed again.
        </p>
      </div>

      {data && !data.configured ? (
        <p className="p-4 text-xs text-muted-foreground">Environment variables are not set up yet (ENV_VARS_SECRET).</p>
      ) : (
        <div className="flex flex-col gap-3 p-4">
          {vars.length > 0 && (
            <ul className="flex max-h-48 flex-col divide-y overflow-y-auto rounded-md border">
              {vars.map((item) => (
                <li key={item.key} className="flex items-center gap-2 px-2.5 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs">{item.key}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{item.masked}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    aria-label={`Replace ${item.key}`}
                    disabled={busy}
                    onClick={() => {
                      setEditingKey(item.key);
                      setKey(item.key);
                      setValue("");
                    }}
                  >
                    <PencilIcon className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-red-600"
                    aria-label={`Delete ${item.key}`}
                    disabled={busy}
                    onClick={() => remove(item.key)}
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={save} className="flex flex-col gap-2">
            <Input
              value={key}
              onChange={(event) => setKey(event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
              placeholder="NAME, e.g. OPENAI_API_KEY"
              aria-label="Variable name"
              readOnly={!!editingKey}
              className="h-8 font-mono text-xs"
              autoComplete="off"
            />
            <Input
              type="password"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={editingKey ? `New value for ${editingKey}` : "Value"}
              aria-label="Variable value"
              className="h-8 font-mono text-xs"
              autoComplete="new-password"
            />
            <div className="flex gap-2">
              {editingKey && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setEditingKey(null);
                    setKey("");
                    setValue("");
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                className="flex-1 gap-1.5 bg-foreground text-background hover:bg-foreground/90"
                disabled={!key || !value || busy}
              >
                {setVar.isPending && <Spinner className="size-3.5" />}
                {editingKey ? "Replace value" : "Add variable"}
              </Button>
            </div>
          </form>
          <p className="text-[11px] text-muted-foreground">
            Only names starting with <span className="font-mono">NEXT_PUBLIC_</span> are visible in the browser; others stay
            on the server. Publish again after changing variables.
          </p>
        </div>
      )}
    </>
  );
};

export default EnvVarsSection;
