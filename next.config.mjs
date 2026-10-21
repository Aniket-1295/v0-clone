import { withSentryConfig } from "@sentry/nextjs/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Template detail pages read the template source to show it in the Code tab.
  outputFileTracingIncludes: {
    "/templates/[slug]": ["./src/templates/components/**/*"],
  },
  experimental: {
    // Prompts can carry one image (resized in the browser to well under 2 MB).
    serverActions: { bodySizeLimit: "3mb" },
  },
};

// Source maps are uploaded to Sentry only when SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT are set.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
