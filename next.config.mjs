/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "frame-src 'self' https://*.vusercontent.net https://*.vercel.app",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.vusercontent.net https://*.vercel.app"
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL' // Or remove this header entirely
          }
        ]
      }
    ]
  }
};

export default nextConfig;
