/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://v0.dev https://v0-clone-alpha-kohl.vercel.app;",
          },
          {
            key: "X-Frame-Options",
            value: "ALLOW-FROM https://v0-clone-alpha-kohl.vercel.app",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
