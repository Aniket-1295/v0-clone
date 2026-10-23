"use client";

import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FigmaImportForm from "./figma-import-form";

/**
 * v0-style Import from Figma. On the home prompt it starts a chat; in a chat it
 * sends a follow-up with the exported frame.
 */
export default function FigmaImportDialog({
  open,
  onOpenChange,
  chatId = null,
  initialProjectId = null,
}) {
  const router = useRouter();

  const handleImported = (result) => {
    onOpenChange?.(false);
    if (!chatId && result?.id) router.push(`/chat/${result.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Figma</DialogTitle>
          <DialogDescription>
            Paste a Figma file or frame link. We export the frame and the agent builds it.
          </DialogDescription>
        </DialogHeader>
        <FigmaImportForm
          chatId={chatId}
          initialProjectId={initialProjectId}
          onImported={handleImported}
        />
      </DialogContent>
    </Dialog>
  );
}
