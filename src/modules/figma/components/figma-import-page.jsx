"use client";

import FigmaImportForm from "./figma-import-form";

/** Bookmarkable Import from Figma, same flow as the prompt dialog. */
export default function FigmaImportPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Import from Figma</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Paste a Figma file or frame link. We export that frame as an image plus its structure, then
        the agent builds a matching Next.js app. This uses one generation credit.
      </p>
      <div className="mt-8">
        <FigmaImportForm />
      </div>
    </div>
  );
}
