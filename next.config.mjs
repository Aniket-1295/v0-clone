/** @type {import('next').NextConfig} */
const nextConfig = {
  // Template detail pages read the template source to show it in the Code tab.
  outputFileTracingIncludes: {
    "/templates/[slug]": ["./src/templates/components/**/*"],
  },
};

export default nextConfig;
