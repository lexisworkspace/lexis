import type { Metadata } from "next";
import {
  SeoShell,
  ComparisonTable,
  Faq,
  FaqSchema,
  Eyebrow,
} from "@/components/seo-shell";

export const metadata: Metadata = {
  title: "The Best Notion Alternative for Privacy - LEXIS (Free & Local-First)",
  description:
    "Looking for a Notion alternative that respects your privacy and costs nothing? LEXIS is a local-first productivity suite - notes, tasks, habits, journal and built-in AI - stored entirely on your device. No cloud, no accounts, $0 forever.",
  alternates: { canonical: "https://lexisapp.xyz/notion-alternative" },
  openGraph: {
    title: "The Best Notion Alternative for Privacy - LEXIS (Free & Local-First)",
    description:
      "Documents, tasks, habits, journal and built-in AI - stored entirely on your device. No cloud, no accounts, $0 forever.",
    url: "https://lexisapp.xyz/notion-alternative",
  },
  twitter: {
    card: "summary",
    title: "The Best Notion Alternative for Privacy - LEXIS (Free & Local-First)",
    description: "Documents, tasks, habits, journal and built-in AI - stored entirely on your device. No cloud, no accounts, $0 forever.",
  },
};

const faqs = [
  {
    q: "Is LEXIS really a good Notion alternative?",
    a: "If what you value about Notion is the flexibility to organize notes, tasks, and projects, then yes - LEXIS covers those needs with notes, tasks, habits, journaling, and analytics in one connected workspace. The trade-off is a deliberate one: LEXIS trades Notion's infinite customization for simplicity, privacy, and a built-in AI that understands all your data. For people who want a tool that works immediately and keeps everything on their device, LEXIS is not just an alternative - it's an upgrade in privacy and cost.",
  },
  {
    q: "Can I import my Notion data into LEXIS?",
    a: "Not yet - there is no one-click Notion importer today. However, LEXIS supports full JSON export and import, so you can move your notes and tasks in via the import feature. We recommend exporting your Notion workspace and bringing over what matters most first. A dedicated Notion import flow is on the roadmap.",
  },
  {
    q: "Is LEXIS actually free?",
    a: "Yes - completely free, forever. There are no premium tiers, no paywalled features, and no subscription. LEXIS is built as a non-profit tool: productivity should be accessible. You can support development through Buy Me a Coffee if you want to, but nothing is ever locked behind payment.",
  },
  {
    q: "Where is my data stored if I leave Notion for LEXIS?",
    a: "Entirely in your browser, using IndexedDB and localStorage. Nothing is sent to any server. That means no data breaches at rest, no server-side data collection, and no account required - but it also means clearing your browser data erases your workspace, so exporting regular backups is recommended.",
  },
  {
    q: "Does LEXIS work offline?",
    a: "Yes - the entire app is local-first and works offline. Documents, tasks, habits, journal entries, and analytics are all available without an internet connection. The only features that require a connection are the optional AI conversations (Noor), which call an external model API. Everything you write stays on your device either way.",
  },
  {
    q: "Can I use LEXIS on my phone?",
    a: "Absolutely. LEXIS is fully responsive and works in any browser on any device - phone, tablet, laptop, desktop. The sidebar collapses on small screens and a drawer gives you access to every tool. No app-store download and no installation needed.",
  },
];

const comparisonRows = [
  [
    "Data storage",
    "Cloud servers owned by Notion",
    "100% on your device (IndexedDB/localStorage)",
  ],
  ["Price", "From ~$10/mo for paid plans", "$0 - free forever"],
  ["Account required", "Yes - sign-up and login", "None - open and use"],
  ["Offline support", "Limited", "Full - everything works offline"],
  ["Built-in AI", "No native AI - third-party integrations", "Yes - Noor (Ethos 4.7, Logos, Verse) reads your data"],
  ["Habit tracking", "Needs templates or databases", "Built-in with streaks and heatmaps"],
  ["Journaling", "Needs templates", "Built-in with mood tracking and AI prompts"],
  ["Task management", "Powerful but complex databases", "Built-in kanban, priorities, recurring tasks"],
  ["Analytics", "Manual setup", "Built-in productivity score, trends, charts"],
  ["Export", "Partial - limited export options", "Full JSON export, notes as .docx"],
  ["Tracking & analytics on you", "Business analytics", "Zero analytics, zero cookies"],
];

export default function NotionAlternativePage() {
  return (
    <SeoShell>
      <FaqSchema items={faqs} />

      {/* HERO */}
      <section className="pt-16 pb-20 md:pt-24 md:pb-28">
        <Eyebrow>NOTION ALTERNATIVE</Eyebrow>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground max-w-4xl leading-[1.05]">
          The Notion alternative that respects your privacy - and costs nothing.
        </h1>
        <p className="mt-6 text-base md:text-lg text-muted-foreground font-body leading-relaxed max-w-2xl">
          LEXIS gives you notes, tasks, habits, journaling, and a built-in AI -
          all stored entirely on your device. No cloud, no accounts, no
          subscription. Just a workspace that belongs to you.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="https://app.lexisapp.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-2 bg-foreground text-background px-8 py-4 text-sm font-medium tracking-wide transition-all duration-300 hover:opacity-90 active:scale-[0.97]"
            style={{ fontFamily: "'Sora', system-ui, sans-serif" }}
          >
            <span>Try LEXIS free</span>
            <span className="absolute inset-0 border border-foreground/20 -translate-x-1 translate-y-1 transition-transform duration-300 group-hover:translate-x-0 group-hover:translate-y-0" />
          </a>
          <span className="text-xs text-muted-foreground/40 font-mono tracking-wider">
            NO SIGN-UP &middot; WORKS IN YOUR BROWSER
          </span>
        </div>
      </section>

      {/* WHY SWITCH */}
      <section className="py-20 md:py-24 border-t border-border/50">
        <Eyebrow>THE WHY</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-6">
          Why are people leaving Notion?
        </h2>
        <p className="text-sm md:text-base text-muted-foreground/70 font-body leading-relaxed max-w-3xl">
          Notion is powerful, but it is a cloud product: your data lives on
          Notion's servers, full features require a paid plan, and heavy
          databases can feel slow. A growing number of users want the same
          flexibility without surrendering their data or paying a monthly fee.
          That's exactly the gap local-first tools like LEXIS fill.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Your data in their cloud",
              desc: "With Notion, every note you write is stored on Notion's servers. LEXIS never sees your data - it never leaves your device.",
            },
            {
              title: "A subscription for features",
              desc: "Notion's best features sit behind a ~$10/month plan. LEXIS ships everything - AI included - at $0, forever.",
            },
            {
              title: "Complexity by default",
              desc: "Building a simple task list in Notion means learning databases, relations, and views. LEXIS gives you working tools the moment you open it.",
            },
          ].map((item) => (
            <div key={item.title} className="card p-6">
              <h3 className="font-bold tracking-tight mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground/60 font-body leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-20 md:py-24 border-t border-border/50">
        <Eyebrow>HEAD TO HEAD</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-4">
          Notion vs. LEXIS
        </h2>
        <p className="text-sm md:text-base text-muted-foreground/70 font-body leading-relaxed max-w-3xl mb-10">
          The short version: Notion wins on deep customization; LEXIS wins on
          privacy, price, and an AI that already understands your whole
          workspace. Here's the honest comparison, feature by feature.
        </p>
        <ComparisonTable
          caption="Notion vs LEXIS comparison"
          headers={["Feature", "Notion", "LEXIS"]}
          rows={comparisonRows}
        />
      </section>

      {/* WHAT YOU KEEP */}
      <section className="py-20 md:py-24 border-t border-border/50">
        <Eyebrow>WHAT YOU KEEP</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-6">
          Everything you rely on from Notion, without the baggage
        </h2>
        <p className="text-sm md:text-base text-muted-foreground/70 font-body leading-relaxed max-w-3xl mb-10">
          You don't switch tools to lose capability. LEXIS keeps the essentials
          of a Notion-style workspace - organized notes, structured tasks,
          project tracking - and adds the parts Notion never had built in.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              title: "Rich notes",
              desc: "A full-featured editor with headings, lists, links, and images. Export any note to .docx when you need it elsewhere.",
            },
            {
              title: "Task boards & priorities",
              desc: "Kanban-style organization, priority levels, due dates, and recurring schedules. Built in - no database setup required.",
            },
            {
              title: "Everything connected",
              desc: "Documents reference tasks, journal entries inform habits, and analytics tie it all together. The same interconnected thinking Notion users love - automatic.",
            },
            {
              title: "Full portability",
              desc: "Export your entire workspace as JSON with one click. Your data is never locked in - it's yours, in a format you own.",
            },
          ].map((item) => (
            <div key={item.title} className="p-6 border border-transparent hover:border-border transition-all duration-300">
              <h3 className="font-bold tracking-tight mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground/60 font-body leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT YOU GAIN */}
      <section className="py-20 md:py-24 border-t border-border/50">
        <Eyebrow>WHAT YOU GAIN</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-6">
          What switching to LEXIS gives you
        </h2>
        <p className="text-sm md:text-base text-muted-foreground/70 font-body leading-relaxed max-w-3xl mb-10">
          Beyond privacy and price, LEXIS adds a layer Notion simply doesn't
          have: an AI that lives inside your workspace and learns from
          everything you do there.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Built-in AI (Noor)",
              desc: "Three AI minds - Ethos 4.7 for deep reasoning, Logos for logic, Verse for instant answers. Ask questions about your own data and get answers grounded in it.",
            },
            {
              title: "Habits & journaling",
              desc: "Streak tracking, heatmaps, mood logging, and AI-generated reflection prompts - features that require manual template-building in Notion.",
            },
            {
              title: "Privacy by architecture",
              desc: "No servers, no accounts, no analytics, no cookies. There is no business model built on your data - because your data never leaves your device.",
            },
          ].map((item) => (
            <div key={item.title} className="card p-6">
              <h3 className="font-bold tracking-tight mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground/60 font-body leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="py-20 md:py-24 border-t border-border/50">
        <Eyebrow>WHO IT'S FOR</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-6">
          Who should make the switch?
        </h2>
        <p className="text-sm md:text-base text-muted-foreground/70 font-body leading-relaxed max-w-3xl mb-10">
          LEXIS is a great fit if you're privacy-conscious, tired of
          subscriptions, or simply want a workspace that works from the first
          second. It's especially strong for anyone who wants AI without
          setting up integrations.
        </p>
        <ul className="max-w-2xl space-y-3">
          {[
            "Privacy-conscious users who don't want their notes on someone else's server",
            "Students and freelancers who want a serious workspace without a subscription",
            "Anyone who wants an AI assistant that already knows their notes, habits, and tasks",
            "Minimalists who found Notion's databases and plugins overwhelming",
            "Offline-first workers who need their tools to work without internet",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground/70 font-body">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-24 border-t border-border/50">
        <Eyebrow>QUESTIONS</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-4">
          Notion alternative - frequently asked
        </h2>
        <p className="text-sm text-muted-foreground/60 font-body leading-relaxed max-w-2xl mb-10">
          Honest answers to the questions people ask before switching from
          Notion.
        </p>
        <Faq items={faqs} />
      </section>

      {/* MORE COMPARISONS */}
      <section className="py-20 md:py-24 border-t border-border/50">
        <Eyebrow>KEEP EXPLORING</Eyebrow>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-6">
          More comparisons
        </h2>
        <p className="text-sm md:text-base text-muted-foreground/70 font-body leading-relaxed max-w-3xl mb-10">
          LEXIS competes with more than Notion. See how it stacks up against
          other tools in the local-first and productivity space.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <a
            href="/obsidian-alternative"
            className="group p-6 border border-transparent hover:border-border transition-all duration-300"
          >
            <h3 className="font-bold tracking-tight mb-2 group-hover:text-foreground/80">
              Obsidian alternative with AI built in
            </h3>
            <p className="text-sm text-muted-foreground/60 font-body leading-relaxed">
              Obsidian gives you a local knowledge base - but wiring up AI means
              plugins and services. LEXIS builds the AI in from day one.
            </p>
          </a>
          <a
            href="/local-first-productivity"
            className="group p-6 border border-transparent hover:border-border transition-all duration-300"
          >
            <h3 className="font-bold tracking-tight mb-2 group-hover:text-foreground/80">
              Local-first productivity apps, explained
            </h3>
            <p className="text-sm text-muted-foreground/60 font-body leading-relaxed">
              What does local-first actually mean, why does it matter, and
              where LEXIS fits in the movement.
            </p>
          </a>
        </div>
        <div className="mt-10 text-center">
          <a
            href="/what-is-lexis"
            className="inline-flex items-center gap-2 text-sm font-medium tracking-wide text-muted-foreground/60 hover:text-foreground transition-colors underline underline-offset-4"
          >
            New to LEXIS? Start with: What is Lexis - the local-first AI productivity app
          </a>
        </div>
      </section>
    </SeoShell>
  );
}
