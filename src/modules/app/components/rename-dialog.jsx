"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** A small "name it" dialog used for creating and renaming projects and chats. */
export default function RenameDialog({ open, onOpenChange, title, initialValue = "", submitLabel = "Save", placeholder, onSubmit }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Remounts with each opening so the field starts from initialValue. */}
        {open && (
          <RenameForm
            title={title}
            initialValue={initialValue}
            submitLabel={submitLabel}
            placeholder={placeholder}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({ title, initialValue, submitLabel, placeholder, onSubmit, onCancel }) {
  const [value, setValue] = useState(initialValue);
  const [pending, setPending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!value.trim() || pending) return;
    setPending(true);
    try {
      await onSubmit(value.trim());
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <Input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} aria-label={title} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={!value.trim() || pending}>{submitLabel}</Button>
      </DialogFooter>
    </form>
  );
}
