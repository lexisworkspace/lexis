const fs = require('fs');

const code = `"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform, useInView } from "framer-motion";
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
import InteractiveNeuralVortex from "@/components/ui/interactive-neural-vortex-background";

/* ─── data ─── */

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
  { q: "Is Orleia really free?", a: "Yes, completely. No freemium, no premium tiers. Productivity shouldn't require a subscription." },
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

/* ─── scroll-reveal wrapper ─── */

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── main ─── */

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
            <img src="/orleia-logo.png" alt="ORLEIA" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-sm font-bold tracking-tight">ORLEIA</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {[\"NOOR\", \"FEATURES\", \"FAQ\"].map((item) => (
              <button key={item} onClick={() => scrollTo(item.toLowerCase())} className=\"text-[11px] font-mono tracking-[0.2em] text-muted-foreground/60 hover:text-foreground transition-colors\">{item}</button>
            ))}
            <a href=\"https://app.lexisapp.xyz\" target=\"_blank\" rel=\"noopener noreferrer\" className=\"inline-flex items-center gap-1.5 bg-foreground text-background px-5 py-2 text-xs font-medium transition-all hover:opacity-90 active:scale-[0.97]\">
              Open Orleia <ArrowUpRight className=\"h-3 w-3\" />
            </a>
          </div>
          <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className=\"md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-border\">
            {mobileNavOpen ? <X className=\"h-4 w-4\" /> : <Menu className=\"h-4 w-4\" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opaci
