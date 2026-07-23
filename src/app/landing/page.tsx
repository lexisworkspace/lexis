"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  BookOpen,
  FileText,
  ListTodo,
  Sparkles,
  Brain,
  BarChart3,
  Clock,
  Shield,
  Zap,
  Layers,
  Target,
  Download,
  Eye,
  Menu,
  X,
  ChevronDown,
  Smartphone,
  Calendar,
  Timer,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tools = [
  {
    icon: CheckCircle2,
    label: "Habits",
    desc: "Build routines that stick",
    detail:
      "Track daily habits with streaks, heatmaps, and AI-powered motivation. Custom frequencies and categories keep you accountable.",
    color: "text-zinc-400",
  },
  {
    icon: BookOpen,
    label: "Journal",
    desc: "Reflect and track your mood",
    detail:
      "Capture thoughts with rich entries, mood tracking, and streak rewards. AI generates reflection prompts tailored to your patterns.",
    color: "text-zinc-400",
  },
  {
    icon: FileText,
    label: "Notes",
    desc: "Rich text with AI analysis",
    detail:
      "Write with a full-featured editor - headings, lists, links, images. Export to .docx and let AI analyze your writing for insights.",
    color: "text-zinc-400",
  },
  {
    icon: ListTodo,
    label: "Tasks",
    desc: "Organize your priorities",
    detail:
      "Manage tasks with kanban boards, calendar views, priority levels, and recurring schedules. Never miss a deadline again.",
    color: "text-zinc-400",
  },
  {
    icon: Brain,
    label: "Mind Maps",
    desc: "Visualize your thinking",
    detail:
      "Create interactive mind maps to connect ideas, map concepts, and explore relationships. Drag nodes, draw connections, rename inline, and add descriptions - all saved automatically.",
    color: "text-zinc-400",
  },
  {
    icon: Sparkles,
    label: "Lexis AI",
    desc: "Your productivity companion",
    detail:
      "Three AI models for different needs - fast queries, balanced advice, or deep analysis. Understands your data across all tools.",
    color: "text-zinc-400",
  },
  {
    icon: BarChart3,
    label: "Analytics",
    desc: "Visualize your progress",
    detail:
      "Track your productivity score, habit completion rates, mood trends, and task velocity with beautiful charts and graphs.",
    color: "text-zinc-400",
  },
  {
    icon: Download,
    label: "Export & Backup",
    desc: "Own your data",
    detail:
      "Export all your data as JSON, download notes as .docx, or import/export your entire workspace. Full data portability.",
    color: "text-zinc-400",
  },
];

const principles = [
  {
    icon: Shield,
    title: "Your Data, Your Device",
    desc: "Everything stays in your browser's localStorage. No accounts, no servers, no tracking. You own everything.",
  },
  {
    icon: Zap,
    title: "AI That Knows You",
    desc: "Three distinct models fine-tuned for productivity. From quick answers to deep strategic thinking - the AI understands your context.",
  },
  {
    icon: Layers,
    title: "Everything Connected",
    desc: "Habits feed into analytics. Journal entries inform AI suggestions. Notes cross-reference with tasks. Nothing exists in isolation.",
  },
  {
    icon: Clock,
    title: "Built for Momentum",
    desc: "Streaks, scores, and visual progress keep you moving. Small daily actions compound into extraordinary results.",
  },
];

const roadmap = [
  {
    phase: "SHIPPED",
    title: "Lexis v1.0",
    desc: "Habits, Journal, Notes, Tasks, Mind Maps, Lexis AI, Analytics Dashboard, Streak System, Export/Import - the complete core experience.",
    icon: Sparkles,
  },
  {
    phase: "UPCOMING",
    title: "Calendar Integration",
    desc: "Connect tasks to a visual calendar. Drag-and-drop scheduling, deadline reminders, and weekly planning view.",
    icon: Calendar,
  },
  {
    phase: "COMING SOON",
    title: "Focus Mode & Timer",
    desc: "Built-in Pomodoro timer with AI-adjusted focus sessions based on your energy patterns throughout the day.",
    icon: Timer,
  },
  {
    phase: "FUTURE",
    title: "Sync & Collaboration",
    desc: "Optional encrypted sync across devices. Shared boards for collaborative task management - without a central server.",
    icon: Users,
  },
];

const faqs = [
  {
    q: "Is Lexis really free?",
    a: "Yes, completely. No freemium, no premium tiers, no hidden features behind a paywall. Lexis is built as a non-profit tool - productivity shouldn't require a subscription. If you find it valuable, you can support via Buy Me a Coffee, but there's never any pressure.",
  },
  {
    q: "Where is my data stored?",        a: "Entirely in your browser using IndexedDB and localStorage. Nothing is sent to any server. Your habits, journal entries, notes, tasks, and mind maps never leave your device. This means no accounts, no passwords, and no data breaches - but also means clearing your browser data will remove everything, so export backups are recommended.",
  },
  {
    q: "How does the AI work if everything is local?",
    a: "Lexis uses the OpenRouter API to connect to AI models. Your data is sent temporarily for processing (just like any AI chat) but is never stored on their servers. You can bring your own API key for full control, or use the free tier with rate limits. The AI enhances your productivity without compromising your privacy.",
  },
  {
    q: "Why no login or accounts?",
    a: "Authentication systems cost money to build and maintain - servers, databases, security audits, compliance. As a non-profit tool, every dollar saved on infrastructure goes back into improving the product. Plus, no accounts means no data to lose, no passwords to reset, and zero attack surface for hackers.",
  },
  {
    q: "Can I use it on mobile?",
    a: "Absolutely. Lexis is fully responsive and works on any device with a browser - phone, tablet, laptop, desktop. The sidebar collapses to icons on smaller screens, and a drawer provides access to all tools. No app store download needed.",
  },
  {
    q: "How do I back up my data?",
    a: "Head to Settings in the workspace. You can export everything as a JSON file with one click. Keep that file safe, and you can import it anytime to restore your full workspace - habits, streaks, journal entries, notes, and all. Notes can also be exported individually as .docx files.",
  },
];

const GRID_SIZE = 12;

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollTo = (id: string) => {
    setMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none select-none"
        style={{
          backgroundImage: `
            linear-gradient(rgb(var(--foreground) / 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgb(var(--foreground) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`,
        }}
      />

      {/* Decorative corner lines */}
      <div className="absolute top-0 right-0 w-32 h-px bg-foreground/10" />
      <div className="absolute top-0 right-0 w-px h-32 bg-foreground/10" />
      <div className="absolute bottom-0 left-0 w-32 h-px bg-foreground/10" />
      <div className="absolute bottom-0 left-0 w-px h-32 bg-foreground/10" />

      {/* ===== NAVIGATION ===== */}
      <nav className="relative z-20 mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/lexis-logo.png"
            alt="LEXIS"
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span
            className="text-base font-bold tracking-tight"
            style={{ fontFamily: "'Sora', system-ui, sans-serif" }}
          >
            LEXIS
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {["FEATURES", "FAQ"].map((item) => (
            <button
              key={item}
              onClick={() => scrollTo(item.toLowerCase())}
              className="text-xs font-mono tracking-[0.15em] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              {item}
            </button>
          ))}
          <a
            href="https://lexis-workspace.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-1.5 bg-foreground text-background px-5 py-2.5 text-xs font-medium tracking-wide transition-all duration-300 hover:opacity-90 active:scale-[0.97]"
            style={{ fontFamily: "'Sora', system-ui, sans-serif" }}
          >
            <span>Enter Workspace</span>
            <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

        {/* Mobile nav toggle */}
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border"
        >
          {mobileNavOpen ? (
            <X className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Menu className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </nav>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed inset-x-0 top-[72px] z-30 md:hidden"
          >
            <div className="mx-4 rounded-2xl border border-border bg-card p-4 shadow-2xl">
              <div className="space-y-2">
                {["FEATURES", "FAQ"].map((item) => (
                  <button
                    key={item}
                    onClick={() => scrollTo(item.toLowerCase())}
                    className="block w-full rounded-lg px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left"
                  >
                    {item}
                  </button>
                ))}
                <a
                  href="https://lexis-workspace.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileNavOpen(false)}
                  className="block w-full rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background text-center mt-2"
                >
                  Enter Workspace
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* ===== SECTION 1: HERO ===== */}
        <section className="min-h-[calc(100vh-80px)] flex items-center py-24 md:py-32">
          <div className="w-full grid gap-16 lg:grid-cols-2 lg:gap-24 items-center">
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="inline-block text-[11px] font-mono tracking-[0.3em] text-muted-foreground/40 mb-8">
                  LEXIS ECOSYSTEM
                </span>
                <h1 className="text-[clamp(4rem,15vw,10rem)] font-bold leading-[0.85] tracking-[-0.04em] text-foreground select-none">
                  LEXIS
                </h1>
                <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-md font-body">
                  An AI-powered productivity suite for habits, journaling, notes, tasks, and mind maps - built for clarity and momentum.
                </p>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <a
                    href="https://lexis-workspace.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative inline-flex items-center gap-2 bg-foreground text-background px-8 py-4 text-sm font-medium tracking-wide transition-all duration-300 hover:opacity-90 active:scale-[0.97]"
                    style={{ fontFamily: "'Sora', system-ui, sans-serif" }}
                  >
                    <span>Enter Workspace</span>
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    <span className="absolute inset-0 border border-foreground/20 -translate-x-1 translate-y-1 transition-transform duration-300 group-hover:translate-x-0 group-hover:translate-y-0" />
                  </a>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="text-xs text-muted-foreground/40 font-mono tracking-wider"
                  >
                    FREE &middot; NO SIGN-UP
                  </motion.p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="absolute -top-16 -right-4 w-24 h-24 rounded-full border border-foreground/5 pointer-events-none"
              />
            </div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="hidden lg:block absolute -left-12 top-0 bottom-0 w-px bg-foreground/5" />
              <div className="space-y-3">
                <p className="text-[11px] font-mono tracking-[0.3em] text-muted-foreground/40 mb-6">
                  INCLUDES
                </p>
                {tools.slice(0, 5).map((tool, i) => (
                  <motion.div
                    key={tool.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="group flex items-center gap-4 py-3 px-4 border border-transparent hover:border-border transition-all duration-300 cursor-default"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-muted">
                      <tool.icon className={`h-5 w-5 ${tool.color} group-hover:scale-110 transition-transform duration-300`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                        {tool.label}
                      </p>
                      <p className="text-xs text-muted-foreground/60 font-body">
                        {tool.desc}
                      </p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/60 transition-all duration-300 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* BY THE NUMBERS */}
        <section className="py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block text-[11px] font-mono tracking-[0.3em] text-muted-foreground/40 mb-6">
              BY THE NUMBERS
            </span>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-12">
              {[
                { value: "100", unit: "%", label: "Local", desc: "Everything lives in your browser. No servers, no cloud, no copies of your data anywhere else." },
                { value: "8", unit: "", label: "Tools", desc: "Habits, Journal, Notes, Tasks, Mind Maps, AI, Analytics, Export - all connected and working together seamlessly." },
                { value: "0", unit: "", label: "Tracking", desc: "Zero analytics, zero cookies, zero tracking. We don't collect a single byte of your personal data." },
                { value: "0", unit: "", label: "Dollars", desc: "Completely free. No subscriptions, no premium tiers, no hidden fees. Productivity should be accessible." },
              ].map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }} className="card text-center">
                  <p className="text-5xl font-bold tracking-tight">{stat.value}{stat.unit && <span className="text-muted-foreground/40">{stat.unit}</span>}</p>
                  <p className="text-sm font-medium mt-2">{stat.label}</p>
                  <p className="text-xs text-muted-foreground/60 font-body mt-2 leading-relaxed">{stat.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24 md:py-32 border-t border-border/50">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <span className="inline-block text-[11px] font-mono tracking-[0.3em] text-muted-foreground/40 mb-6">HOW IT WORKS</span>
            <div className="grid gap-12 md:grid-cols-3 mt-12">
              {[
                { step: "01", title: "Track Everything", desc: "Log habits, write journal entries, take notes, manage tasks, and create mind maps - all in one place, all connected.", icon: Target },
                { step: "02", title: "Let AI Learn", desc: "The more you use Lexis, the smarter it gets. Lexis AI understands your patterns and offers relevant insights.", icon: Brain },
                { step: "03", title: "Watch It Compound", desc: "Daily streaks, productivity scores, and analytics show your growth. Small actions turn into measurable progress.", icon: BarChart3 },
              ].map((item, i) => (
                <motion.div key={item.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }} className="group">
                  <div className="flex h-12 w-12 items-center justify-center bg-muted mb-6"><item.icon className="h-5 w-5 text-foreground/60" /></div>
                  <p className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground/30 mb-3">{item.step}</p>
                  <h3 className="text-lg font-bold tracking-tight mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground/60 font-body leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* A GLIMPSE INSIDE */}
        <section className="py-24 md:py-32 border-t border-border/50">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <span className="inline-block text-[11px] font-mono tracking-[0.3em] text-muted-foreground/40 mb-6">A GLIMPSE INSIDE</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-4 mb-4">The workspace.</h2>
            <p className="text-sm text-muted-foreground/60 font-body leading-relaxed max-w-md mb-16">Minimal. Connected. Yours.</p>
            <p className="text-sm text-muted-foreground/60 font-body leading-relaxed max-w-2xl mb-12">From the moment you land, everything you need is within reach. No clutter, no distractions - just your tools and your flow.</p>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { title: "Overview at a glance", desc: "Stats, streaks, and scores - all on your home screen.", icon: Eye },
                { title: "Quick navigation", desc: "Jump between tools instantly. Sidebar keeps your place.", icon: Menu },
                { title: "Dark by default", desc: "Deep theme that's easy on the eyes, day or night.", icon: Smartphone },
              ].map((item, i) => (
                <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }} className="card">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted mb-4"><item.icon className="h-5 w-5 text-foreground/60" /></div>
                  <h3 className="font-bold tracking-tight mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground/60 font-body leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* WHY LEXIS */}
        <section className="py-24 md:py-32 border-t border-border/50">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <span className="inline-block text-[11px] font-mono tracking-[0.3em] text-muted-foreground/40 mb-6">WHY LEXIS</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-4 mb-16 max-w-xl">Built differently. <span className="text-muted-foreground/40">For good reason.</span></h2>
            <div className="grid gap-8 md:grid-cols-2">
              {principles.map((principle, i) => (
                <motion.div key={principle.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }} className="group p-6 border border-transparent hover:border-border transition-all duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-muted group-hover:bg-foreground/5 transition-colors"><principle.icon className="h-5 w-5 text-foreground/60" /></div>
                    <h3 className="font-bold tracking-tight">{principle.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground/60 font-body leading-relaxed pl-14">{principle.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* FEATURES */}
        <section id="features" className="py-24 md:py-32 border-t border-border/50">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <span className="inline-block text-[11px] font-mono tracking-[0.3em] text-muted-foreground/40 mb-6">FEATURES</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-4 mb-4">Everything you need.</h2>
            <p className="text-sm text-muted-foreground/60 font-body mb-16">Nothing you don't.</p>
            <div className="space-y-4">
              {tools.map((tool, i) => (
                <motion.div key={tool.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.5 }} className="group flex items-start gap-5 py-5 px-5 border border-transparent hover:border-border transition-all duration-300">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-muted"><tool.icon className={`h-6 w-6 ${tool.color}`} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1"><h3 className="font-bold tracking-tight">{tool.label}</h3><span className="text-[10px] text-muted-foreground/30 font-mono">{tool.desc.toUpperCase()}</span></div>
                    <p className="text-sm text-muted-foreground/60 font-body leading-relaxed max-w-2xl">{tool.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ROADMAP */}
        <section className="py-24 md:py-32 border-t border-border/50">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <span className="inline-block text-[11px] font-mono tracking-[0.3em] text-muted-foreground/40 mb-6">WHAT'S NEXT</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-4 mb-4">Roadmap</h2>
            <p className="text-sm text-muted-foreground/60 font-body leading-relaxed max-w-xl mb-16">Lexis is evolving. Here's what we're building next - guided by real usage, not investor pressure.</p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {roadmap.map((item, i) => (
                <motion.div key={item.phase} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }} className="card">
                  <span className="inline-block text-[10px] font-mono tracking-[0.2em] text-muted-foreground/40 mb-3">{item.phase}</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted mb-3"><item.icon className="h-4 w-4 text-foreground/60" /></div>
                  <h3 className="font-bold tracking-tight text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground/60 font-body leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24 md:py-32 border-t border-border/50">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }}>
            <span className="inline-block text-[11px] font-mono tracking-[0.3em] text-muted-foreground/40 mb-6">QUESTIONS</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-4 mb-16">Frequently asked.</h2>
            <div className="max-w-2xl space-y-3">
              {faqs.map((faq, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.4 }} className="border border-transparent hover:border-border transition-all duration-300">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                    <span className="text-sm font-medium">{faq.q}</span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-300", openFaq === i && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden">
                        <p className="px-5 pb-4 text-sm text-muted-foreground/60 font-body leading-relaxed">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* CTA */}
        <section className="py-24 md:py-32 border-t border-border/50">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }} className="text-center">
            <span className="inline-block text-[11px] font-mono tracking-[0.3em] text-muted-foreground/40 mb-6">GET STARTED</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-4 mb-4">Ready to build momentum?</h2>
            <p className="text-base text-muted-foreground/60 font-body leading-relaxed max-w-md mx-auto mb-10">No accounts. No setup. No cost. Just you and your tools - enhanced by AI that actually understands your life.</p>
            <a href="https://lexis-workspace.vercel.app" target="_blank" rel="noopener noreferrer" className="group relative inline-flex items-center gap-3 bg-foreground text-background px-10 py-5 text-base font-medium tracking-wide transition-all duration-300 hover:opacity-90 active:scale-[0.97]" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
              <span>Enter Lexis Workspace</span>
              <ArrowUpRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <span className="absolute inset-0 border border-foreground/20 -translate-x-1.5 translate-y-1.5 transition-transform duration-300 group-hover:translate-x-0 group-hover:translate-y-0" />
            </a>
            <p className="mt-6 text-xs text-muted-foreground/30 font-mono tracking-wider">FREE FOREVER &middot; BUILT FOR THE CURIOUS</p>
          </motion.div>
        </section>

        {/* FOOTER */}
        <motion.footer initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="py-12 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-muted-foreground/30 font-mono tracking-wider">BUILT WITH CARE &middot; FOR THE CURIOUS &middot; v1.0.0</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:gap-4">
            <Link href="/privacy" className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap">PRIVACY</Link>
            <Link href="/terms" className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap">TERMS</Link>
            <Link href="/cookies" className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap">COOKIES</Link>
            <Link href="/disclaimer" className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap">DISCLAIMER</Link>
            <Link href="/gdpr" className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap">GDPR</Link>
            <Link href="/acceptable-use" className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap">AUP</Link>
            <Link href="/eula" className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap">EULA</Link>
            <Link href="/accessibility" className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap">ACCESSIBILITY</Link>
            <a href="https://buymeacoffee.com/lexis" target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 font-mono tracking-wider transition-colors whitespace-nowrap">SUPPORT</a>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}
