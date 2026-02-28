"use client";

import { cn } from "@/lib/utils";

export function ProgressiveBlur({
  className,
  direction = "left",
  blurIntensity = 1,
  ...props
}) {
  const layers = 8;

  const gradientDirectionMap = {
    left: "to right",
    right: "to left",
    top: "to bottom",
    bottom: "to top",
  };

  const gradientDir = gradientDirectionMap[direction] ?? "to right";

  return (
    <div className={cn("absolute", className)} {...props}>
      {Array.from({ length: layers }).map((_, i) => {
        const progress = i / (layers - 1);
        const blur = progress * blurIntensity * 8;
        const opacity = 1 - progress;

        return (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: `linear-gradient(${gradientDir}, rgba(0,0,0,${opacity}) ${progress * 100}%, rgba(0,0,0,0) ${(progress + 1 / layers) * 100}%)`,
              WebkitMaskImage: `linear-gradient(${gradientDir}, rgba(0,0,0,${opacity}) ${progress * 100}%, rgba(0,0,0,0) ${(progress + 1 / layers) * 100}%)`,
            }}
          />
        );
      })}
    </div>
  );
}
