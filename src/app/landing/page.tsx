"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { GMAIL_COMPOSE_HREF } from "@/lib/contact";
import {
  ArrowUpRight,
  CheckCircle2,
  Shield,
  Zap,
  Layers,
  Clock,
  ChevronDown,
  Brain,
  Scale,
  Grid3x3,
  PenTool,
  FileText,
  ListTodo,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const models = [
  { icon: Brain, name: "Ethos 4.7", tag: "DEEP REASONING", desc: "Frontier-scale analytical power for complex problems." },
  { icon: Scale, name: "Logos 4.5", tag: "BALANCED", desc: "Smart enough for real work, fast enough to not slow you down." },
  { icon: Zap, name: "Verse 4", tag: "INSTANT", desc: "Lightning-fast responses for quick questions and live chats." },
];

const features = [
  { icon: CheckCircle2, label: "Habits", desc: "Streaks, heatmaps, and AI-powered motivation." },
  { icon: SparklesIcon, label: "Mindfulness", desc: "Mood tracking, prompts, breathing exercises." },
  { icon: FileText, label: "Documents", desc: "Full editor with images and formatting." },
  { icon: ListTodo, label: "Tasks", desc: "Kanban, calendar, priorities." },
  { icon: Grid3x3, label: "Grid", desc: "Spreadsheets with formulas and CSV." },
  { icon: PenTool, label: "Notes", desc: "Folders, tags, search. Clean." },
  { icon: Brain, label: "Noor AI", desc: "AI that reads your data and helps you think." },
];

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" /><path d="M22 5h-4" />
    </svg>
  );
}

const principles = [
  { icon: Shield, title: "Your Data, Your Device", desc: "Everything stays in your browser. No accounts, no servers, no tracking." },
  { icon: Zap, title: "AI That Knows You", desc: "Three AI models from quick answers to deep strategic thinking." },
  { icon: Layers, title: "Everything Connected", desc: "Habits feed analytics. Journal informs AI. Nothing exists in isolation." },
  { icon: Clock, title: "Built for Momentum", desc: "Streaks, scores, visual progress. Small daily actions compound." },
];

const faqs = [
  { q: "Is Lexis really free?", a: "Yes, completely. No freemium, no premium tiers. Productivity shouldn't require a subscription." },
  { q: "Where is my data stored?", a: "Entirely in your browser. Nothing is sent to any server. Your data never leaves your device." },
  { q: "How does the AI work?", a: "Noor connects to frontier models. Your data is processed temporarily but never stored." },
  { q: "Why no login?", a: "No accounts means no data to lose, no passwords to reset, and zero attack surface for hackers." },
  { q: "Can I use it on mobile?", a: "Absolutely. Fully responsive, works on any device with a browser. No app store needed." },
  { q: "How do I back up?", a: "Settings, Export. One click to download everything as JSON. Import anytime to restore." },
];

const WinIcon = () => <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M0,0H11.377V11.372H0ZM12.623,0H24V11.372H12.623ZM0,12.623H11.377V24H0Zm12.623,0H24V24H12.623" /></svg>;
const LinuxIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  /* Features carousel */
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkCarouselScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    checkCarouselScroll();
    el.addEventListener("scroll", checkCarouselScroll, { passive: true });
    window.addEventListener("resize", checkCarouselScroll);
    return () => { el.removeEventListener("scroll", checkCarouselScroll); window.removeEventListener("resize", checkCarouselScroll); };
  }, [checkCarouselScroll]);

  const scrollCarousel = (dir: -1 | 1) => {
    const el = carouselRef.current;
    if (!el) return;
    const cardW = el.querySelector<HTMLElement>(":scope > div")?.offsetWidth ?? 320;
    el.scrollBy({ left: dir * (cardW + 12), behavior: "smooth" });
  };

  /* Hero scroll-linked animation */
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -40]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.98]);

  const scrollTo = (id: string) => {
    setMobileNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ===== NAV ===== */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/lexis-logo.png" alt="LEXIS" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-sm font-bold tracking-tight">LEXIS</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {["NOOR", "FEATURES", "FAQ"].map((item) => (
              <button key={item} onClick={() => scrollTo(item.toLowerCase())} className="text-[11px] font-mono tracking-[0.2em] text-muted-foreground/60 hover:text-foreground transition-colors">{item}</button>
            ))}
            <a href="https://app.lexisapp.xyz" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-foreground text-background px-5 py-2 text-xs font-medium transition-all hover:opacity-90 active:scale-[0.97]">
              Open Lexis <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
          <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border">
            {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="fixed top-14 inset-x-0 z-40 md:hidden px-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-2xl">
              {["NOOR", "FEATURES", "FAQ"].map((item) => (
                <button key={item} onClick={() => scrollTo(item.toLowerCase())} className="block w-full rounded-lg px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left">{item}</button>
              ))}
              <a href="https://app.lexisapp.xyz" target="_blank" rel="noopener noreferrer" className="block w-full rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background text-center mt-3">Open Lexis</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== HERO with scroll parallax ===== */}
      <div ref={heroRef} className="relative" style={{ height: "120vh" }}>
        <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
          <motion.div style={{ opacity: heroOpacity, y: heroY, scale: heroScale }} className="relative z-10 text-center px-6 w-full">
            <motion.p initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-[11px] font-mono tracking-[0.5em] text-muted-foreground/40 mb-8">
              A NEW DYNASTY
            </motion.p>
            <motion.h1 initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} className="text-[clamp(3rem,10vw,14rem)] font-bold leading-[0.85] tracking-[-0.05em] select-none">
              LEXIS<span className="text-muted-foreground/25">OS</span>
            </motion.h1>
            <motion.p initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="mt-8 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto font-body leading-relaxed">
              AI-powered productivity for habits, mindfulness, notes, tasks, and spreadsheets. All local. All private. All yours.
            </motion.p>
            <motion.div initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.7 }} className="mt-10 flex flex-wrap justify-center items-center gap-4">
              <a href="https://app.lexisapp.xyz" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-foreground text-background px-8 py-3.5 text-sm font-medium transition-all hover:opacity-90 active:scale-[0.97]">
                Get Started Free <ArrowUpRight className="h-4 w-4" />
              </a>
              <span className="text-xs font-mono tracking-wider text-muted-foreground/40">NO SIGN-UP, FREE FOREVER</span>
            </motion.div>
            <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.9 }} className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="https://6bdmafsuooogvteq.public.blob.vercel-storage.com/Lexis-2.0.0-win-x64.exe" download className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/30 backdrop-blur px-4 py-2 text-xs font-medium text-foreground/60 hover:text-foreground hover:border-border/80 transition-colors cursor-pointer">
                <WinIcon /> Windows <span className="text-[10px] text-muted-foreground/40">EXE</span>
              </a>
              <a href="https://6bdmafsuooogvteq.public.blob.vercel-storage.com/downloads/Lexis-2.0.0-linux-x86_64.AppImage" download className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/30 backdrop-blur px-4 py-2 text-xs font-medium text-foreground/60 hover:text-foreground hover:border-border/80 transition-colors cursor-pointer">
                <LinuxIcon /> Linux <span className="text-[10px] text-muted-foreground/40">AppImage</span>
              </a>
            </motion.div>
            <motion.p initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="mt-8 text-[10px] font-mono tracking-wider text-muted-foreground/25">
              SCROLL TO EXPLORE
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* ===== FEATURES — horizontal carousel ===== */}
      <section id="features" className="py-24 md:py-32">
        <div className="px-6 mb-12">
          <div className="text-center">
            <p className="text-[11px] font-mono tracking-[0.4em] text-muted-foreground/40 mb-4">FEATURES</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Everything you need.</h2>
            <p className="mt-4 text-muted-foreground/60 font-body text-lg">Nothing you don&apos;t.</p>
          </div>
        </div>

        {/* Carousel */}
        <div className="relative">
          {/* Scroll left/right buttons */}
          {canScrollLeft && (
            <button onClick={() => scrollCarousel(-1)} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border shadow-lg hover:bg-secondary transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {canScrollRight && (
            <button onClick={() => scrollCarousel(1)} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border shadow-lg hover:bg-secondary transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Fade edges */}
          {canScrollLeft && <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-[5]" />}
          {canScrollRight && <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-[5]" />}

          {/* Scrollable track */}
          <div
            ref={carouselRef}
            className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory px-6 md:px-12 pb-4 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {features.map((f, i) => (
              <div
                key={f.label}
                className="snap-start shrink-0 w-[280px] md:w-[340px] rounded-2xl border border-border bg-card p-8 flex flex-col justify-between min-h-[260px]"
              >
                <div>
                  <f.icon className="h-6 w-6 text-foreground/40 mb-6" />
                  <h3 className="text-xl font-bold tracking-tight mb-2">{f.label}</h3>
                  <p className="text-sm text-muted-foreground/60 font-body leading-relaxed">{f.desc}</p>
                </div>
                <p className="text-[10px] font-mono tracking-wider text-muted-foreground/25 mt-8">
                  {String(i + 1).padStart(2, "0")} / {String(features.length).padStart(2, "0")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NOOR AI ===== */}
      <section id="noor" className="py-24 md:py-32 px-6 border-t border-border/30">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-[11px] font-mono tracking-[0.4em] text-muted-foreground/40 mb-4">NOOR</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Your AI companion.</h2>
            <p className="mt-4 text-muted-foreground/60 font-body text-lg max-w-xl mx-auto">Three distinct minds, one workspace. Reads your data, helps you think deeper.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {models.map((m) => (
              <div key={m.name} className="rounded-2xl border border-border bg-card p-8">
                <m.icon className="h-6 w-6 text-foreground/40 mb-6" />
                <div className="flex items-baseline gap-3 mb-3">
                  <h3 className="text-2xl font-bold tracking-tight">{m.name}</h3>
                  <span className="text-[10px] font-mono tracking-[0.15em] text-muted-foreground/40">{m.tag}</span>
                </div>
                <p className="text-sm text-muted-foreground/70 font-body leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex justify-center">
            <a href="https://app.lexisapp.xyz/noor" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-foreground px-8 py-3.5 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.97]">
              Chat with Noor <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ===== PRINCIPLES ===== */}
      <section className="py-24 md:py-32 px-6 border-t border-border/30">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-[11px] font-mono tracking-[0.4em] text-muted-foreground/40 mb-4">WHY LEXIS</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Built differently.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {principles.map((p) => (
              <div key={p.title} className="rounded-2xl border border-border bg-card p-8">
                <div className="flex items-center gap-4 mb-3">
                  <p.icon className="h-5 w-5 text-foreground/40" />
                  <h3 className="text-lg font-bold tracking-tight">{p.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground/60 font-body leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-24 md:py-32 px-6 border-t border-border/30">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <p className="text-[11px] font-mono tracking-[0.4em] text-muted-foreground/40 mb-4">QUESTIONS</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Frequently asked.</h2>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left">
                  <span className="text-sm font-medium">{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-muted-foreground/60 font-body leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-24 md:py-40 px-6 border-t border-border/30">
        <div className="text-center mx-auto max-w-2xl">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Ready?</h2>
          <p className="mt-6 text-lg text-muted-foreground/60 font-body">No accounts. No setup. No cost. Just you and your tools.</p>
          <a href="https://app.lexisapp.xyz" target="_blank" rel="noopener noreferrer" className="mt-10 inline-flex items-center gap-2 bg-foreground text-background px-10 py-4 text-base font-medium transition-all hover:opacity-90 active:scale-[0.97]">
            Enter Lexis Workspace <ArrowUpRight className="h-5 w-5" />
          </a>
          <p className="mt-6 text-[10px] font-mono tracking-wider text-muted-foreground/30">FREE FOREVER, LOCAL-FIRST, v2.0.0</p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border/30 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <p className="text-[10px] font-mono tracking-wider text-muted-foreground/50">BUILT WITH CARE, FOR THE CURIOUS</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {["privacy", "terms", "cookies", "disclaimer", "gdpr", "ccpa", "eula", "accessibility"].map((p) => (
                <Link key={p} href={`/${p}`} className="text-[10px] font-mono tracking-wider text-muted-foreground/40 hover:text-muted-foreground transition-colors uppercase">{p}</Link>
              ))}
              <a href={GMAIL_COMPOSE_HREF} className="text-[10px] font-mono tracking-wider text-muted-foreground/40 hover:text-muted-foreground transition-colors">CONTACT</a>
              <a href="https://buymeacoffee.com/lexis" className="text-[10px] font-mono tracking-wider text-muted-foreground/40 hover:text-muted-foreground transition-colors">SUPPORT</a>
            </div>
          </div>
          <div className="mt-8 border-t border-border/20 pt-6 text-center">
            <p className="text-[9px] font-mono tracking-wider text-muted-foreground/30">NOT AFFILIATED WITH LEXISNEXIS OR RELX GROUP</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
