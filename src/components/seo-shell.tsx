import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";

/**
 * Server-component shell for the SEO comparison pages.
 * No client JS - renders fast, crawls clean.
 */

export function SeoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background grid pattern (matches landing) */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none select-none"
        style={{
          backgroundImage: `
            linear-gradient(rgb(var(--foreground) / 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgb(var(--foreground) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "8.3333% 8.3333%",
        }}
      />
      <div className="absolute top-0 right-0 w-32 h-px bg-foreground/10" />
      <div className="absolute top-0 right-0 w-px h-32 bg-foreground/10" />
      <div className="absolute bottom-0 left-0 w-32 h-px bg-foreground/10" />
      <div className="absolute bottom-0 left-0 w-px h-32 bg-foreground/10" />

      {/* Navigation */}
      <nav className="relative z-20 mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/orleia-wordmark.png"
            alt="Orleia"
            className="h-7 w-auto dark:invert"
          />
        </Link>
        <a
          href="https://app.orleia.app"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 bg-foreground text-background px-5 py-2.5 text-xs font-medium tracking-wide transition-all duration-300 hover:opacity-90 active:scale-[0.97]"
          style={{ fontFamily: "'Sora', system-ui, sans-serif" }}
        >
          <span>Enter Workspace</span>
          <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </nav>

      <div className="relative z-10 mx-auto max-w-7xl px-6">{children}</div>

      {/* CTA */}
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <section className="py-20 md:py-24 border-t border-border/50 text-center">
          <span className="inline-block text-[11px] font-mono tracking-[0.3em] text-muted-foreground/40 mb-6">
            GET STARTED
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-4 mb-4">
            Try ORLEIA - free, no sign-up
          </h2>
          <p className="text-base text-muted-foreground/60 font-body leading-relaxed max-w-md mx-auto mb-10">
            No accounts. No servers. No cost. Just you, your tools, and an AI
            that actually understands your life.
          </p>
          <a
            href="https://app.orleia.app"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-3 bg-foreground text-background px-10 py-5 text-base font-medium tracking-wide transition-all duration-300 hover:opacity-90 active:scale-[0.97]"
            style={{ fontFamily: "'Sora', system-ui, sans-serif" }}
          >
            <span>Enter Orleia Workspace</span>
            <ArrowUpRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            <span className="absolute inset-0 border border-foreground/20 -translate-x-1.5 translate-y-1.5 transition-transform duration-300 group-hover:translate-x-0 group-hover:translate-y-0" />
          </a>
          <p className="mt-6 text-xs text-muted-foreground/30 font-mono tracking-wider">
            FREE FOREVER &middot; LOCAL-FIRST &middot; PRIVACY FIRST
          </p>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-muted-foreground/30 font-mono tracking-wider">
            ORLEIA &middot; LOCAL-FIRST &middot; FREE
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:gap-4">
            <Link
              href="/notion-alternative"
              className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap"
            >
              NOTION ALT
            </Link>
            <Link
              href="/obsidian-alternative"
              className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap"
            >
              OBSIDIAN ALT
            </Link>
            <Link
              href="/what-is-orleia"
              className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap"
            >
              WHAT IS ORLEIA
            </Link>
            <Link
              href="/local-first-productivity"
              className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap"
            >
              LOCAL-FIRST
            </Link>
            <Link
              href="/privacy"
              className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap"
            >
              PRIVACY
            </Link>
            <Link
              href="/terms"
              className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap"
            >
              TERMS
            </Link>
            <Link
              href="/ccpa"
              className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap"
            >
              CCPA
            </Link>
            <a
              href="https://buymeacoffee.com/orleia"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap"
            >
              SUPPORT
            </a>
          </div>
          <p className="mt-5 text-center text-[10px] font-mono tracking-wider text-muted-foreground/25">
            ORLEIA — FREE, LOCAL-FIRST, NO TRACKING
          </p>
        </footer>
      </div>
    </div>
  );
}

export function ComparisonTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm border border-border/50">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-[11px] font-mono tracking-[0.15em] text-muted-foreground/60 font-medium"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i < rows.length - 1 ? "border-b border-border/50" : ""}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-4 py-3 align-top ${
                    j === 0
                      ? "font-medium text-foreground/90"
                      : "text-muted-foreground/70 font-body leading-relaxed"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="max-w-2xl space-y-3">
      {items.map((item, i) => (
        <details
          key={i}
          className="group border border-border/50 hover:border-border/80 transition-colors duration-300"
        >
          <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium list-none select-none">
            {item.q}
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <p className="px-5 pb-4 text-sm text-muted-foreground/60 font-body leading-relaxed">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}

export function FaqSchema({ items }: { items: { q: string; a: string }[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      }}
    />
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[11px] font-mono tracking-[0.3em] text-muted-foreground/40 mb-6">
      {children}
    </span>
  );
}
