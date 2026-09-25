import type { Metadata } from "next";
import Link from "next/link";
import { ORLEIA_EMAIL, GMAIL_COMPOSE_HREF } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Thank you - Orleia",
  description: "Your message has been received.",
  robots: { index: false, follow: false },
};

export default function ThanksPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div
        className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 text-emerald-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground">
        Thank you
      </h1>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground">
        Your message has been received. We read everything and reply to
        most mail within a few days.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full border border-foreground/20 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-foreground/40"
        >
          Back to orleia.app
        </Link>
        <a
          href={GMAIL_COMPOSE_HREF}
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Email {ORLEIA_EMAIL}
        </a>
      </div>
    </div>
  );
}
