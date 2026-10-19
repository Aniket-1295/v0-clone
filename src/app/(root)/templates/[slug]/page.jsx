import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { TEMPLATES, getTemplate } from "@/templates/registry";
import TemplateDetail from "@/modules/templates/components/template-detail";

export const generateStaticParams = () => TEMPLATES.map(({ slug }) => ({ slug }));

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const template = getTemplate(slug);
  return template ? { title: template.name, description: template.description } : {};
}

export default async function TemplatePage({ params }) {
  const { slug } = await params;
  const template = getTemplate(slug);
  if (!template) notFound();

  // Shown in the Code tab; the file is traced into the build (next.config.mjs).
  const source = await readFile(
    path.join(process.cwd(), "src/templates/components", `${slug}.jsx`),
    "utf8"
  );
  const related = TEMPLATES.filter((t) => t.category === template.category && t.slug !== slug);

  return <TemplateDetail template={template} source={source} related={related} />;
}
