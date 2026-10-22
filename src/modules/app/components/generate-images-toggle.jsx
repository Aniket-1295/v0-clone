"use client";

import { ImageIcon, XIcon } from "lucide-react";

import { DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useGenerateImages } from "@/hooks/use-stored-preference";

/** "+" menu switch: lets the agent generate images for the next prompts. */
export function GenerateImagesMenuItem() {
  const [on, setOn] = useGenerateImages();
  return (
    <DropdownMenuCheckboxItem checked={on} onCheckedChange={setOn} onSelect={(event) => event.preventDefault()}>
      <ImageIcon className="size-4" /> Generate images
    </DropdownMenuCheckboxItem>
  );
}

/** Shown next to the model picker while "Generate images" is on; clicking turns it off. */
export function GenerateImagesChip({ className }) {
  const [on, setOn] = useGenerateImages();
  if (!on) return null;
  return (
    <button
      type="button"
      onClick={() => setOn(false)}
      aria-label="Turn off image generation"
      title="The agent may generate images. Click to turn off."
      className={cn(
        "group inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer",
        className
      )}
    >
      <ImageIcon className="size-3.5" /> Images
      <XIcon className="size-3 opacity-60 group-hover:opacity-100" />
    </button>
  );
}
