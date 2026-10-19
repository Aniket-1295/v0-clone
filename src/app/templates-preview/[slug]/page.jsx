import { notFound } from "next/navigation";
import { TEMPLATES, getTemplate } from "@/templates/registry";
import TemplateRenderer from "./template-renderer";

export const generateStaticParams = () => TEMPLATES.map(({ slug }) => ({ slug }));

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return { title: getTemplate(slug)?.name ?? "Template" };
}

// The live, full-page template. Embedded as an iframe on the landing page,
// in /templates and on each template's detail page.
export default async function TemplatePreviewPage({ params }) {
  const { slug } = await params;
  if (!getTemplate(slug)) notFound();

  return <TemplateRenderer slug={slug} />;
}
