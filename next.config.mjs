/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/landing",
        has: [
          {
            type: "host",
            value: "lexis-suite.vercel.app",
          },
        ],
      },
      {
        source: "/",
        destination: "/landing",
        has: [
          {
            type: "host",
            value: "lexis-landing.vercel.app",
          },
        ],
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://api.duckduckgo.com https://lite.duckduckgo.com https://duckduckgo.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
