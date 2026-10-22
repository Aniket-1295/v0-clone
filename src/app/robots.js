import { SITE_URL } from "@/lib/site";

// Marketing pages are indexable; the signed-in app, API and shared chats are not.
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/chat/", "/chats", "/projects", "/share/", "/templates-preview/", "/sign-in", "/sign-up"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
