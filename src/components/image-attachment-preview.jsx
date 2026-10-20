"use client";

import { XIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

/** Thumbnail of the image attached to a prompt, with a remove button. */
export const ImageAttachmentPreview = ({ previewUrl, processing, onRemove }) => {
  if (!previewUrl && !processing) return null;

  return (
    <div className="pt-2.5">
      <div className="relative size-16 overflow-hidden rounded-lg border bg-muted">
        {processing ? (
          <div className="flex size-full items-center justify-center">
            <Spinner className="size-4 text-muted-foreground" />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Attached image" className="size-full object-cover" />
        )}
        {!processing && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove image"
            className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
          >
            <XIcon className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
};
