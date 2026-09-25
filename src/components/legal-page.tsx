import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GMAIL_COMPOSE_HREF } from "@/lib/contact";

interface LegalPageProps {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPage({ title, subtitle, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <Link
          href="/"
          className="group inline-flex items-center gap-1.5 text-xs font-mono tracking-wider text-muted-foreground/50 hover:text-muted-foreground transition-colors mb-12"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          BACK TO DASHBOARD
        </Link>

        <h1 className="text-4xl font-bold tracking-tight mb-2">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground/60 font-body mb-4 max-w-2xl">{subtitle}</p>
        )}
        <p className="text-xs text-muted-foreground/40 font-mono mb-12">Last updated: {lastUpdated}</p>

        <div className="space-y-8 text-sm text-muted-foreground/80 font-body leading-relaxed">
          {children}
        </div>

        <div className="mt-16 pt-8 border-t border-border/50">
          <p className="mb-6 text-xs text-muted-foreground/60">
            Questions about this policy? Contact us at{" "}
            <a
              href={GMAIL_COMPOSE_HREF}
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              orleia.workspace@gmail.com
            </a>
            .
          </p>
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-xs font-mono tracking-wider text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            BACK TO DASHBOARD
          </Link>
        </div>
      </div>
    </div>
  );
}
