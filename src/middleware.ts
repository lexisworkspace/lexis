import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const url = request.nextUrl;

  if (
    hostname.includes("lexis-suite") ||
    hostname.includes("lexis-landing")
  ) {
    if (url.pathname === "/") {
      url.pathname = "/landing";
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"]
};
