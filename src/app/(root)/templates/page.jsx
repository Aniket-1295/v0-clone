import { TEMPLATE_CATEGORIES } from "@/templates/registry";
import TemplatesGallery from "@/modules/templates/components/templates-gallery";

export const metadata = { title: "Templates" };

export default async function TemplatesPage({ searchParams }) {
  const { category } = await searchParams;
  const valid = TEMPLATE_CATEGORIES.some((c) => c.id === category) ? category : null;

  return <TemplatesGallery key={valid ?? "all"} initialCategory={valid} />;
}
