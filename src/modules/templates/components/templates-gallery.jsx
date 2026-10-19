"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import { TEMPLATES, TEMPLATE_CATEGORIES, getCategoryLabel } from "@/templates/registry";
import { cn } from "@/lib/utils";
import { CATEGORY_ICONS } from "./category-icons";
import TemplateCard from "./template-card";
import TemplateThumbnail from "./template-thumbnail";

const FEATURED = ["saas-landing", "analytics-dashboard", "memory-game", "smart-home", "portfolio"].map((slug) =>
  TEMPLATES.find((t) => t.slug === slug)
);

/** A horizontal row with arrow buttons, like v0's template carousels. */
const Carousel = ({ children, label }) => {
  const rowRef = useRef(null);
  const scroll = (dir) => rowRef.current?.scrollBy({ left: dir * rowRef.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="group/carousel relative">
      <div ref={rowRef} aria-label={label} className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      {[["left", -1, ChevronLeftIcon, "-left-4"], ["right", 1, ChevronRightIcon, "-right-4"]].map(([side, dir, Icon, pos]) => (
        <button
          key={side}
          type="button"
          aria-label={`Scroll ${side}`}
          onClick={() => scroll(dir)}
          className={cn(
            "absolute top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-md transition-opacity hover:bg-accent md:flex cursor-pointer dark:bg-neutral-900",
            pos
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
};

export default function TemplatesGallery({ initialCategory }) {
  const router = useRouter();
  const gridRef = useRef(null);
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState("");

  const pickCategory = (id, { scroll = false } = {}) => {
    setCategory(id);
    router.replace(id ? `/templates?category=${id}` : "/templates", { scroll: false });
    if (scroll) gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const q = query.trim().toLowerCase();
  const visible = TEMPLATES.filter(
    (t) =>
      (!category || t.category === category) &&
      (!q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-16">
      <section className="flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter">Duplicate a Template</h1>
        <p className="mt-3 text-muted-foreground">Discover working apps, components and starters you can make your own.</p>
        <label className="mt-8 flex h-11 w-full max-w-md items-center gap-2 rounded-lg border bg-card px-3 text-sm focus-within:border-foreground/30 dark:bg-neutral-950">
          <SearchIcon className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            placeholder="Search..."
            aria-label="Search templates"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </label>
      </section>

      <section className="mt-16">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">Categories</h2>
          <button type="button" onClick={() => pickCategory(null, { scroll: true })} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
            Browse All <ChevronRightIcon className="size-4" />
          </button>
        </div>
        <Carousel label="Template categories">
          {TEMPLATE_CATEGORIES.map(({ id, label }) => {
            const items = TEMPLATES.filter((t) => t.category === id).slice(0, 4);
            const Icon = CATEGORY_ICONS[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => pickCategory(id, { scroll: true })}
                className="group w-64 shrink-0 rounded-xl border bg-card p-2 text-left transition-colors hover:border-foreground/25 cursor-pointer dark:bg-neutral-950"
              >
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: 4 }, (_, i) =>
                    items[i] ? (
                      <div key={i} className="overflow-hidden rounded-md">
                        <TemplateThumbnail slug={items[i].slug} />
                      </div>
                    ) : (
                      <div key={i} className="flex aspect-[16/10] items-center justify-center rounded-md bg-muted">
                        <Icon className="size-5 text-muted-foreground" />
                      </div>
                    )
                  )}
                </div>
                <p className="px-1 pb-1 pt-3 text-sm font-medium">{label}</p>
              </button>
            );
          })}
        </Carousel>
      </section>

      <section className="mt-14">
        <h2 className="mb-4 font-medium">Featured Templates</h2>
        <Carousel label="Featured templates">
          {FEATURED.map((template) => (
            <div key={template.slug} className="w-[85%] shrink-0 sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]">
              <TemplateCard template={template} />
            </div>
          ))}
        </Carousel>
      </section>

      <section ref={gridRef} className="mt-14 scroll-mt-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="font-medium">
            {category ? getCategoryLabel(category) : "All templates"}
            <span className="ml-2 text-sm font-normal text-muted-foreground">{visible.length}</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {[{ id: null, label: "All" }, ...TEMPLATE_CATEGORIES].map(({ id, label }) => {
              const Icon = id ? CATEGORY_ICONS[id] : null;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => pickCategory(id)}
                  aria-pressed={category === id}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors cursor-pointer",
                    category === id
                      ? "border-foreground bg-foreground text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {Icon && <Icon className="size-3.5" />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {visible.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((template) => (
              <TemplateCard key={template.slug} template={template} />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No templates match “{query}”. <Link href="/templates" onClick={() => setQuery("")} className="underline">Clear search</Link>
          </p>
        )}
      </section>
    </div>
  );
}
