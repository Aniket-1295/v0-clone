"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { TEMPLATES, TEMPLATE_CATEGORIES } from "@/templates/registry";
import { cn } from "@/lib/utils";
import { CATEGORY_ICONS } from "./category-icons";
import TemplateCard from "./template-card";

export default function TemplatesGallery({ initialCategory }) {
  const router = useRouter();
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState("");

  const pickCategory = (id) => {
    setCategory(id);
    router.replace(id ? `/templates?category=${id}` : "/templates", { scroll: false });
  };

  const q = query.trim().toLowerCase();
  const visible = TEMPLATES.filter(
    (t) =>
      (!category || t.category === category) &&
      (!q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-12">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Templates</h1>
      <p className="mt-2 text-muted-foreground">
        Start from a working app. Open any template to try it live, read its code, or build on it.
      </p>

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
        <label className="flex h-9 w-full items-center gap-2 rounded-lg border bg-card px-3 text-sm md:w-64 focus-within:border-foreground/30">
          <SearchIcon className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates"
            aria-label="Search templates"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      {visible.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((template) => (
            <TemplateCard key={template.slug} template={template} />
          ))}
        </div>
      ) : (
        <p className="mt-16 text-center text-sm text-muted-foreground">No templates match “{query}”.</p>
      )}
    </div>
  );
}
