import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TEMPLATES, TEMPLATE_CATEGORIES } from "@/templates/registry";
import { CATEGORY_ICONS } from "@/modules/templates/components/category-icons";
import TemplateCard from "@/modules/templates/components/template-card";

const FEATURED = TEMPLATES.slice(0, 6);
const TEASER = TEMPLATES.slice(6, 9);

export default function TemplateSection() {
  return (
    <section className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Start with a template</h2>
        <div className="flex flex-wrap items-center gap-2">
          {TEMPLATE_CATEGORIES.map(({ id, label }) => {
            const Icon = CATEGORY_ICONS[id];
            return (
              <Link
                key={id}
                href={`/templates?category=${id}`}
                className="hidden h-8 items-center gap-1.5 rounded-full border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:inline-flex"
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            );
          })}
          <Link
            href="/templates"
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Browse all <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURED.map((template) => (
          <TemplateCard key={template.slug} template={template} />
        ))}
      </div>

      {/* A peek at the next row, faded out, with a way into the full gallery. */}
      <div className="relative mt-8 h-28 overflow-hidden">
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
          {TEASER.map((template, i) => (
            <div key={template.slug} className={i > 0 ? "hidden sm:block" : undefined} inert>
              <TemplateCard template={template} />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 flex items-start justify-center bg-gradient-to-b from-background/40 via-background/90 to-background pt-6 dark:from-black/40 dark:via-black/90 dark:to-black">
          <Button asChild variant="outline" className="dark:bg-black">
            <Link href="/templates">Browse all</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
