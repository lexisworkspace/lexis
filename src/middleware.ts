import { NextResponse, type NextRequest } from "next/server";

// ============================================================
// Cache policy middleware.
//
// App Router RSC flight requests (the payloads behind client-side
// tab switches) ride the page URL with an `RSC: 1` header. The
// blanket `no-cache, no-store` page header also landed on those
// flights, which made Next's client router cache discard every
// payload — so prefetching worked exactly once and tab switches
// re-fetched forever ("fast one cycle, then slow again").
//
// Policy:
//   RSC flights  -> private, max-age=300  (browser-only, 5 min —
//                  matches the client router staleTimes, so
//                  prefetched payloads are actually RETAINED)
//   HTML docs    -> untouched (next.config keeps them always-fresh,
//                  so deploys propagate instantly)
//   API/assets   -> untouched (matcher excludes them)
// ============================================================

export function middleware(req: NextRequest) {
  // Marketing host: serve the landing page at "/" (rewrite, URL stays "/").
  // The app host serves the dashboard there — no rewrite needed.
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "");
  const isMarketingHost =
    host === "orleia.app" ||
    host === "www.orleia.app" ||
    host.includes("orleia-landing") ||
    host.includes("orleia-suite");
  if (isMarketingHost && req.nextUrl.pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/home";
    const rewritten = NextResponse.rewrite(url);
    rewritten.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, max-age=0, must-revalidate"
    );
    return rewritten;
  }

  const isFlight =
    req.method === "GET" && req.headers.get("RSC") === "1";

  const res = NextResponse.next();
  if (isFlight) {
    // Cacheable in the browser only — this is what lets Next's client
    // router cache RETAIN prefetched payloads (no-store makes it discard
    // them, which is the "fast one cycle then slow forever" bug).
    // Do NOT touch Vary: the platform already varies flights on
    // rsc / next-router-state-tree / next-router-prefetch, which is
    // required for correct cache-keying at different navigation depths.
    res.headers.set(
      "Cache-Control",
      "private, max-age=300, stale-while-revalidate=600"
    );
  } else if (req.method === "GET") {
    // HTML documents: always fresh so deploys propagate instantly.
    res.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, max-age=0, must-revalidate"
    );
  }
  return res;
}

export const config = {
  matcher: [
    // Everything except APIs, static assets, service worker, manifests.
    "/((?!api|_next/static|_next/image|favicon.ico|orleia-logo|og-image|sw.js|manifest.json|version.json|downloads).*)",
  ],
};
