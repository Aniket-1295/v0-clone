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

export default nextConfig;
