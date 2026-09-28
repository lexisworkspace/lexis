/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Client Router Cache: visited route payloads stay cached for 5 min, so
  // tab switches render instantly instead of re-fetching (Next 15 default
  // for dynamic pages is staleTime 0). Static pages already live longer.
  experimental: {
    staleTimes: { dynamic: 300, static: 1800 },
  },
  async redirects() {
    return [
      // SEO: the canonical host is www — apex duplicates every page.
      { source: "/:path*", destination: "https://www.orleia.app/:path*", has: [{ type: "host", value: "orleia.app" }], permanent: true },
      // Legacy: forward the retired Lexis domain to Orleia the moment its
      // DNS points here again (it currently serves DEPLOYMENT_NOT_FOUND).
      { source: "/:path*", destination: "https://www.orleia.app/:path*", has: [{ type: "host", value: "lexisapp.xyz" }], permanent: true },
      { source: "/:path*", destination: "https://www.orleia.app/:path*", has: [{ type: "host", value: "www.lexisapp.xyz" }], permanent: true },
      // NOTE: "/landing" is a real route now (marketing host's "/" rewrites to
      // it via middleware) — a /landing -> / redirect here would loop.
      // People guess /dashboard — send them to the real dashboard.
      { source: "/dashboard", destination: "/", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
        { protocol: 'https', hostname: 'images.pexels.com' },
    ],
  },
  serverExternalPackages: ["@grpc/grpc-js", "@grpc/proto-loader", "web-push"],
  webpack: (config, { webpack }) => {
    // pptxgenjs is client-side only; strip node: scheme prefixes then fall back
    // to empty modules. CLIENT bundles only — stubbing builtins in server
    // bundles breaks node-only deps like web-push (lambda 500s).
    if (!config.target || config.target === "web" || config.name === "client") {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );
      config.resolve.fallback = { ...config.resolve.fallback, https: false, http: false, fs: false, path: false, crypto: false };
    }
    return config;
  },
  async headers() {
    return [
      {
        // version.json is polled by the update checker — cache briefly at the
        // edge so repeated polls are cheap but deploys propagate fast.
        source: "/version.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
      // NOTE: HTML page caching is handled in src/middleware.ts — it must
      // distinguish HTML docs (always fresh) from RSC flight requests (the
      // payloads behind client-side tab switches, which MUST be cacheable
      // or Next's client router cache discards them and every tab switch
      // re-fetches). A config header here would blanket no-store flights.
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
            value: "geolocation=(), microphone=(self), payment=(), usb=(), accelerometer=(), gyroscope=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              `${isDev ? "" : "upgrade-insecure-requests; "}default-src 'self'; ` +
              // webpack dev runtime uses eval for hot reload - only in development.
              `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ""}; ` +
              // Fonts are self-hosted (Fontsource) — no Google font hosts in CSP.
              "style-src 'self' 'unsafe-inline'; " +
              "font-src 'self'; " +
              "img-src 'self' data: blob: https://images.unsplash.com https://images.pexels.com https://svgl.app https://cdn.simpleicons.org https://freebuff.com; " +
              "media-src 'self' blob: data:; " +
              "connect-src 'self' https://images.unsplash.com https://svgl.app https://cdn.simpleicons.org https://qcgvatuucmgkjbaxwrbn.supabase.co https://*.supabase.co https://accounts.google.com https://github.com https://appleid.apple.com https://login.microsoftonline.com https://va.vercel-scripts.com https://*.push.apple.com https://fcm.googleapis.com; " +
              "object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'self' https://accounts.google.com https://github.com https://appleid.apple.com https://login.microsoftonline.com; frame-ancestors 'none'; worker-src 'self' blob:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
