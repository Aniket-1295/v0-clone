"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A live, non-interactive render of a template: the real preview page in an iframe at
 * desktop (or phone) size, scaled down to fit its box.
 */
export default function TemplateThumbnail({ slug, mobile = false, className }) {
  const boxRef = useRef(null);
  const [scale, setScale] = useState(0);
  const width = mobile ? 390 : 1280;
  const height = mobile ? 844 : 800;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / width));
    observer.observe(box);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div
      ref={boxRef}
      className={cn("relative overflow-hidden bg-muted", mobile ? "aspect-[390/844]" : "aspect-[16/10]", className)}
    >
      {scale > 0 && (
        <iframe
          src={`/templates-preview/${slug}`}
          title=""
          aria-hidden
          tabIndex={-1}
          loading="lazy"
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
          style={{ width, height, transform: `scale(${scale})` }}
        />
      )}
    </div>
  );
}
