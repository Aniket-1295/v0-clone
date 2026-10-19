import Link from "next/link";
import Image from "next/image";
import { getCategoryLabel } from "@/templates/registry";
import TemplateThumbnail from "./template-thumbnail";

export default function TemplateCard({ template }) {
  return (
    <Link href={`/templates/${template.slug}`} className="group block focus-visible:outline-none">
      <div className="overflow-hidden rounded-xl border bg-card transition-colors group-hover:border-foreground/25 group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <TemplateThumbnail
          slug={template.slug}
          className="transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-card">
          <Image src="/logo.svg" alt="" width={16} height={16} className="invert dark:invert-0" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{template.name}</h3>
          <p className="truncate text-xs text-muted-foreground">{getCategoryLabel(template.category)}</p>
        </div>
      </div>
    </Link>
  );
}
