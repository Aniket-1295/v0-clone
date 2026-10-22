"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { PromptLength } from "@/components/prompt-length";
import { showActionError } from "@/lib/show-action-error";
import { MAX_INSTRUCTIONS_LENGTH } from "@/lib/instructions";
import { useUpdateChatInstructions } from "@/modules/chats/hooks/chat";
import { useUpdateProjectInstructions } from "@/modules/projects/hooks/project";

/**
 * Standing rules editor for a chat or a project. Empty clears the rules.
 * Changes apply on the next generation.
 */
const InstructionsSection = ({
  scope,
  id,
  value = "",
  title = "Instructions",
  description = "Rules v0 follows on every generation.",
}) => {
  const router = useRouter();
  const incoming = value ?? "";
  const [draft, setDraft] = useState(incoming);
  const [synced, setSynced] = useState({ id, incoming });
  const chatSave = useUpdateChatInstructions(scope === "chat" ? id : null);
  const projectSave = useUpdateProjectInstructions(scope === "project" ? id : null);
  const saveMutation = scope === "chat" ? chatSave : projectSave;

  if (id !== synced.id || incoming !== synced.incoming) {
    setSynced({ id, incoming });
    setDraft(incoming);
  }

  const trimmed = draft.trim();
  const saved = incoming.trim();
  const overLimit = trimmed.length > MAX_INSTRUCTIONS_LENGTH;
  const unchanged = trimmed === saved;
  const busy = saveMutation.isPending;

  const save = async () => {
    if (unchanged || overLimit || !id) return;
    try {
      await saveMutation.mutateAsync(draft);
    } catch (error) {
      showActionError(error, router, "Could not save the instructions.");
    }
  };

  return (
    <>
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="e.g. Use a dark theme, Inter for body text, and never add a footer."
          aria-label={title}
          rows={5}
          className="min-h-28 resize-y font-mono text-xs"
        />
        <div className="flex items-center gap-2">
          <PromptLength text={draft} max={MAX_INSTRUCTIONS_LENGTH} className="mr-auto" />
          <Button
            size="sm"
            className="gap-1.5 bg-foreground text-background hover:bg-foreground/90"
            disabled={unchanged || overLimit || busy || !id}
            onClick={save}
          >
            {busy && <Spinner className="size-3.5" />}
            Save
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Do not put API keys here. Use Environment variables. Changes apply to the next generation.
          {scope === "chat" ? " Chat instructions override project instructions when they conflict." : null}
        </p>
      </div>
    </>
  );
};

export default InstructionsSection;
