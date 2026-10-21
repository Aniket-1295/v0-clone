// Product name and public URL in one place, so a rename is a one-line change.
export const SITE_NAME = "V0 Clone";
export const SITE_DESCRIPTION =
  "Describe an app, or attach a screenshot, and an AI agent builds it as a real Next.js app you can preview, edit, share and publish.";
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com";

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || vercelUrl || "http://localhost:3000").replace(/\/$/, "");
