"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TEMPLATES, getCategoryLabel } from "@/templates/registry";
import TemplateThumbnail from "@/modules/templates/components/template-thumbnail";

const MOBILE_TEMPLATES = TEMPLATES.filter((t) => t.mobile);

export default function MobileShowcase() {
  const rowRef = useRef(null);
  const scrollBy = (direction) =>
    rowRef.current?.scrollBy({ left: direction * rowRef.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section className="w-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Ship mobile sites</h2>
        <div className="flex items-center gap-2">
          <Link href="/templates" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-medium transition-colors hover:bg-accent">
            Browse all <ChevronRight className="size-4" />
          </Link>
          <Button variant="outline" size="icon" className="size-8 dark:bg-black" aria-label="Scroll left" onClick={() => scrollBy(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" className="size-8 dark:bg-black" aria-label="Scroll right" onClick={() => scrollBy(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="mobile-row -mx-4 flex gap-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {MOBILE_TEMPLATES.map((template) => (
          <Link key={template.slug} href={`/templates/${template.slug}`} className="group w-56 shrink-0">
            <div className="overflow-hidden rounded-2xl border bg-card transition-colors group-hover:border-foreground/25">
              <TemplateThumbnail slug={template.slug} mobile className="transition-transform duration-500 group-hover:scale-[1.02]" />
            </div>
            <h3 className="mt-3 truncate text-sm font-medium">{template.name}</h3>
            <p className="text-xs text-muted-foreground">{getCategoryLabel(template.category)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
