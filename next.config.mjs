/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["@grpc/grpc-js", "@grpc/proto-loader"],
  async headers() {
    return [
      {
        // HTML pages: never cache — always fetch fresh JS after deploys.
        source: "/((?!api|_next/static|_next/image|downloads|favicon|lexis-logo|og-image).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
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
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
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
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(self), payment=(), usb=(), battery=(), accelerometer=(), gyroscope=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              `${isDev ? "" : "upgrade-insecure-requests; "}default-src 'self'; ` +
              // webpack dev runtime uses eval for hot reload - only in development.
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}; ` +
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com; " +
              "font-src 'self' fonts.gstatic.com; " +
              "img-src 'self' data: blob:; " +
              "media-src 'self' blob: data:; " +
              "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://qcgvatuucmgkjbaxwrbn.supabase.co https://*.supabase.co https://accounts.google.com https://github.com https://appleid.apple.com https://login.microsoftonline.com; " +
              "object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'self' https://accounts.google.com https://github.com https://appleid.apple.com https://login.microsoftonline.com; frame-ancestors 'none'; worker-src 'self' blob:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
