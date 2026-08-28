import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SEO_PATHS = [
  "/notion-alternative",
  "/obsidian-alternative",
  "/local-first-productivity",
];

const MARKET_DOMAIN = "https://lexisapp.xyz";
const APP_DOMAIN = "https://app.lexisapp.xyz";

function isMarketingHost(hostname: string) {
  const h = hostname.toLowerCase();
  return h === "lexisapp.xyz" || h === "www.lexisapp.xyz";
}

function isAppHost(hostname: string) {
  const h = hostname.toLowerCase();
  return h === "app.lexisapp.xyz";
}

function isOldMarketingHost(hostname: string) {
  const h = hostname.toLowerCase();
  return h.includes("lexis-suite") || h.includes("lexis-landing");
}

function isOldAppHost(hostname: string) {
  const h = hostname.toLowerCase();
  return h.includes("lexis-workspace") || h.includes("lexis-app");
}

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const url = request.nextUrl;
  const path = url.pathname + url.search;

  // 1) Old marketing domains (lexis-suite / lexis-landing) -> new brand domain (301, keeps path)
  if (isOldMarketingHost(hostname)) {
    return NextResponse.redirect(new URL(path, MARKET_DOMAIN), 301);
  }

  // 2) Old app domains (lexis-workspace / lexis-app) -> new app subdomain (301, keeps path),
  //    except the data-migration page which must stay reachable on the old origin.
  if (isOldAppHost(hostname) && url.pathname !== "/migrate") {
    return NextResponse.redirect(new URL(path, APP_DOMAIN), 301);
  }

  // 3) Old route names -> renamed routes (301, keeps query, same host)
  if (url.pathname === "/assistant") {
    url.pathname = "/noor";
    return NextResponse.redirect(url, 301);
  }
  // 4) www -> apex (canonical host)
  if (hostname.toLowerCase() === "www.lexisapp.xyz") {
    return NextResponse.redirect(new URL(path, MARKET_DOMAIN), 301);
  }

  // 4) New marketing domain: serve the landing page at the root
  if (isMarketingHost(hostname)) {
    if (url.pathname === "/") {
      url.pathname = "/landing";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // 5) New app subdomain: SEO comparison pages live on the marketing domain only
  if (isAppHost(hostname)) {
    if (SEO_PATHS.includes(url.pathname)) {
      return NextResponse.redirect(new URL(url.pathname, MARKET_DOMAIN), 301);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except API routes, Next internals, and static files
  // (paths containing a dot: robots.txt, sitemap.xml, images, etc.)
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
