import type { Metadata } from "next";
import { SeoShell, Eyebrow, Faq, FaqSchema, ComparisonTable } from "@/components/seo-shell";

export const metadata: Metadata = {
  title: "What is Lexis? The Local-First AI Productivity App",
  description:
    "Lexis is a free, local-first AI productivity app combining habits, notes, journal, tasks and an AI assistant (Noor) that knows you. Everything stays on your device - no accounts, no cloud, no tracking.",
  alternates: { canonical: "https://lexisapp.xyz/what-is-lexis" },
  openGraph: {
    type: "website",
    title: "What is Lexis? The Local-First AI Productivity App",
    description:
      "Lexis is a free, local-first AI productivity app - habits, notes, journal, tasks and an AI (Noor) that knows you. Everything stays on your device.",
    url: "https://lexisapp.xyz/what-is-lexis",
  },
  twitter: {
    card: "summary",
    title: "What is Lexis? The Local-First AI Productivity App",
    description:
      "Free, local-first AI productivity app: habits, notes, journal, tasks and an AI that knows you. No accounts, no cloud, no tracking.",
  },
};

const faq = [
  {
    q: "What is Lexis?",
    a: "Lexis is a free, local-first AI productivity suite that combines habits, notes, journal, tasks and an AI assistant called Noor into one app. Every byte of your data lives in your own browser - there are no servers, no cloud accounts, and no analytics tracking you.",
  },
  {
    q: "Is Lexis really free?",
    a: "Yes. Lexis has no subscriptions, no premium tiers and no hidden fees. It is completely free to use, because your data stays on your device and there are no servers to pay for.",
  },
  {
    q: "Where is my Lexis data stored?",
    a: "Lexis is local-first: all your habits, notes, journal entries and tasks are stored in your browser's local storage on your own device. Nothing is uploaded, synced or sent to a server, so you stay in control of your data.",
  },
  {
    q: "Does Lexis have an AI assistant?",
    a: "Yes. Noor is Lexis's built-in AI assistant. Noor can chat with you, help you create habits, tasks, notes and journal entries, and answer questions about your life using the context you share. It also supports voice mode.",
  },
  {
    q: "What can you do in the Lexis app?",
    a: "Lexis combines five core tools: habits (with streaks and analytics), notes (with tags and folders), a journal, a task manager, and Noor, an AI assistant that connects everything. It is designed as a private, local-first alternative to apps like Notion and Obsidian.",
  },
  {
    q: "Is Lexis available as a mobile app?",
    a: "Lexis is a web app that works in any modern browser on your phone, tablet or desktop. Because it is local-first, you can use it privately anywhere without creating an account.",
  },
];

const comparison = {
  headers: ["", "Lexis", "Notion", "Obsidian"],
  rows: [
    ["AI assistant built in", "Yes - Noor", "Add-on", "Plugin needed"],
    ["Local-first (data on your device)", "Yes", "Cloud", "Local files"],
    ["Price", "Free", "Freemium", "Free (donations)"],
    ["Habits & journal built in", "Yes", "No", "No"],
    ["No account required", "Yes", "No", "No"],
    ["Zero analytics / tracking", "Yes", "No", "Yes"],
  ],
};

export default function WhatIsLexisPage() {
  return (
    <SeoShell>
      <FaqSchema items={faq} />

      {/* Hero - direct answer first (AI Overview-friendly) */}
      <section className="py-16 md:py-24">
        <Eyebrow>WHAT IS LEXIS</Eyebrow>
        <h1 className="max-w-3xl text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
          What is Lexis? A free, local-first AI productivity app.
        </h1>
        <p className="mt-8 max-w-2xl text-base md:text-lg text-muted-foreground/70 font-body leading-relaxed">
          Lexis is a privacy-first productivity suite that brings habits, notes, journal, tasks and
          an AI assistant called Noor together in one free app. Unlike cloud tools, everything in
          Lexis stays on your device - no accounts, no servers, no analytics. It is a local-first
          alternative to Notion and Obsidian with a built-in AI that actually knows you.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="https://app.lexisapp.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-foreground text-background px-8 py-4 text-sm font-medium tracking-wide transition-all duration-300 hover:opacity-90 active:scale-[0.97]"
          >
            Try Lexis - free, no sign-up
          </a>
          <a
            href="/"
            className="text-sm font-medium tracking-wide text-muted-foreground/60 hover:text-foreground transition-colors underline underline-offset-4"
          >
            See the landing page
          </a>
        </div>
      </section>

      {/* What it does */}
      <section className="py-16 border-t border-border/50">
        <Eyebrow>FIVE TOOLS, ONE PRIVATE APP</Eyebrow>
        <h2 className="max-w-2xl text-2xl md:text-3xl font-bold tracking-tight">
          Habits, documents, journal, tasks - and Noor, the AI that connects them
        </h2>
        <p className="mt-6 max-w-2xl text-base text-muted-foreground/70 font-body leading-relaxed">
          Lexis is built around the idea that productivity tools work better when they share one
          private brain. Your habit streaks, journal entries, notes and tasks live together, so the
          AI assistant can give you suggestions grounded in your actual life - like spotting a
          streak at risk or drafting a task from a note you wrote.
        </p>
        <ul className="mt-8 grid gap-4 md:grid-cols-2 max-w-3xl">
          {[
            ["Habits", "Daily tracking with streaks, best-streak history and monthly analytics."],
            ["Documents", "Tagged, foldered documents with a clean editor - your second brain."],
            ["Journal", "Private daily entries that feed context to the AI."],
            ["Tasks", "A focused task manager that fits your workflow."],
            ["Noor (AI)", "Chat, voice mode, and AI that creates content inside Lexis for you."],
            ["Privacy", "Local-first storage, no account, zero analytics, zero cookies."],
          ].map(([t, d]) => (
            <li key={t} className="border border-border/50 p-5">
              <span className="block text-sm font-semibold tracking-wide">{t}</span>
              <span className="mt-2 block text-sm text-muted-foreground/60 font-body leading-relaxed">
                {d}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* How it's different */}
      <section className="py-16 border-t border-border/50">
        <Eyebrow>LOCAL-FIRST &amp; FREE</Eyebrow>
        <h2 className="max-w-2xl text-2xl md:text-3xl font-bold tracking-tight">
          How Lexis is different from Notion, Obsidian and other apps
        </h2>
        <p className="mt-6 max-w-2xl text-base text-muted-foreground/70 font-body leading-relaxed">
          Lexis is designed for people who want the power of a modern productivity suite without
          giving up control of their data. It is completely free, works offline-first in your
          browser, and never requires an account - a fundamentally different approach from
          cloud-based suites that monetize attention and data.
        </p>
        <div className="mt-10">
          <ComparisonTable caption="Lexis vs Notion vs Obsidian" headers={comparison.headers} rows={comparison.rows} />
        </div>
        <p className="mt-6 max-w-2xl text-sm text-muted-foreground/50 font-body leading-relaxed">
          For deeper comparisons, see{" "}
          <a className="underline underline-offset-4 hover:text-foreground transition-colors" href="/notion-alternative">
            why people switch from Notion
          </a>{" "}
          and{" "}
          <a className="underline underline-offset-4 hover:text-foreground transition-colors" href="/obsidian-alternative">
            why Obsidian users choose Lexis
          </a>
          , or read about{" "}
          <a className="underline underline-offset-4 hover:text-foreground transition-colors" href="/local-first-productivity">
            the local-first movement
          </a>
          .
        </p>
      </section>

      {/* FAQ */}
      <section className="py-16 border-t border-border/50">
        <Eyebrow>FAQ</Eyebrow>
        <h2 className="max-w-2xl text-2xl md:text-3xl font-bold tracking-tight mb-10">
          Frequently asked questions about Lexis
        </h2>
        <Faq items={faq} />
      </section>
    </SeoShell>
  );
}
