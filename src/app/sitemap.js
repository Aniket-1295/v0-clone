import { SITE_URL } from "@/lib/site";
import { TEMPLATES } from "@/templates/registry";

const PAGES = [
  { path: "", priority: 1 },
  { path: "/templates", priority: 0.8 },
  { path: "/pricing", priority: 0.8 },
  { path: "/terms", priority: 0.3 },
  { path: "/privacy", priority: 0.3 },
];

export default function sitemap() {
  return [
    ...PAGES.map(({ path, priority }) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly", priority })),
    ...TEMPLATES.map(({ slug }) => ({ url: `${SITE_URL}/templates/${slug}`, changeFrequency: "monthly", priority: 0.6 })),
  ];
}
