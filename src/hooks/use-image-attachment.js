"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
// Big enough to read a full-page screenshot, small enough to upload and store cheaply.
const MAX_SIDE = 1600;

/** Resizes an image file to at most MAX_SIDE px and re-encodes it as JPEG. */
const compressImage = async (file) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  // Transparent PNG areas would turn black in a JPEG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { mimeType: "image/jpeg", data: btoa(binary), previewUrl: URL.createObjectURL(blob) };
};

/**
 * One image attached to a prompt: from a file picker, a paste or a drop. `image` is
 * { mimeType, data: base64 } ready for createChat / createMessages.
 */
export const useImageAttachment = () => {
  const [attachment, setAttachment] = useState(null);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef(null);

  // Free the preview URL when the image is replaced or the composer goes away.
  useEffect(() => () => attachment && URL.revokeObjectURL(attachment.previewUrl), [attachment]);

  const attach = async (file) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return toast.error("Attach a PNG, JPEG or WebP image.");
    if (file.size > MAX_SOURCE_BYTES) return toast.error("That image is over 20 MB.");
    setProcessing(true);
    try {
      setAttachment(await compressImage(file));
    } catch {
      toast.error("Could not read that image.");
    } finally {
      setProcessing(false);
    }
  };

  const imageFrom = (items) => [...(items ?? [])].find((file) => file.type?.startsWith("image/"));

  return {
    image: attachment && { mimeType: attachment.mimeType, data: attachment.data },
    previewUrl: attachment?.previewUrl,
    processing,
    clear: () => setAttachment(null),
    // Hidden <input type="file"> props, and a function to open it.
    inputProps: {
      ref: inputRef,
      type: "file",
      accept: ACCEPTED.join(","),
      hidden: true,
      onChange: (event) => {
        attach(event.target.files?.[0]);
        event.target.value = "";
      },
    },
    openPicker: () => inputRef.current?.click(),
    onPaste: (event) => {
      const file = imageFrom(event.clipboardData?.files);
      if (file) {
        event.preventDefault();
        attach(file);
      }
    },
    dropProps: {
      onDragOver: (event) => event.dataTransfer?.types?.includes("Files") && event.preventDefault(),
      onDrop: (event) => {
        const file = imageFrom(event.dataTransfer?.files);
        if (file) {
          event.preventDefault();
          attach(file);
        }
      },
    },
  };
};
