import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found - Orleia",
  description: "The page you're looking for doesn't exist.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="mb-3 font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground">
        This page doesn&apos;t exist
      </h1>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground">
        The link may be broken, or the page may have moved.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full border border-foreground/20 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-foreground/40"
        >
          Go home
        </Link>
        <a
          href="https://app.orleia.app"
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Open Orleia
        </a>
      </div>
    </div>
  );
}
