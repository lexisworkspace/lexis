import os

# Build the complete landing page as a single string
# We write it to a temp file first, then move it into place

parts = []

# ============================================================
# PART 1: Imports + data + component start
# ============================================================
parts.append(r'''"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useMobile } from "@/hooks/useMobile";
import Link from "next/link";
import { GMAIL_COMPOSE_HREF } from "@/lib/contact";
import {
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
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
  Eye,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ShellMock,
  DashboardMock,
  HabitsMock,
  TasksMock,
  GridMock,
  NoorMock,
} from "@/components/layout/tutorial-mockups";

const tools = [
  { icon: CheckCircle2, label: "Habits", desc: "Streaks & heatmaps", color: "from-emerald-500/20 to-emerald-500/5" },
  { icon: Sparkles, label: "Mindfulness", desc: "Mood & reflection", color: "from-violet-500/20 to-violet-500/5" },
  { icon: FileText, label: "Documents", desc: "A4 rich editor", color: "from-sky-500/20 to-sky-500/5" },
  { icon: ListTodo, label: "Tasks", desc: "Kanban & calendar", color: "from-amber-500/20 to-amber-500/5" },
  { icon: Grid3x3, label: "Grid", desc: "Spreadsheets", color: "from-rose-500/20 to-rose-500/5" },
  { icon: PenTool, label: "Notes", desc: "Quick capture", color: "from-teal-500/20 to-teal-500/5" },
  { icon: Brain, label: "Noor", desc: "AI companion", color: "from-orange-500/20 to-orange-500/5" },
];

const models = [
  { icon: Brain, name: "Ethos 1.5", tag: "DEEP REASONING", desc: "Frontier-scale analytical power for complex problems.", glow: "rgba(249,115,22,0.12)" },
  { icon: Scale, name: "Logos 1.2", tag: "BALANCED", desc: "Smart enough for real work, fast enough to not slow you down.", glow: "rgba(99,102,241,0.12)" },
  { icon: Zap, name: "Verse 0.8", tag: "INSTANT", desc: "Lightning-fast responses for quick questions and live chats.", glow: "rgba(16,185,129,0.12)" },
];

const principles = [
  { icon: Shield, title: "Your Data, Your Device", desc: "Everything stays in your browser. No accounts, no servers, no tracking." },
  { icon: Zap, title: "AI That Knows You", desc: "Three AI modes powered by NVIDIA — from quick answers to deep strategic thinking." },
  { icon: Layers, title: "Everything Connected", desc: "Habits feed analytics. Journal informs AI. Nothing exists in isolation." },
  { icon: Clock, title: "Built for Momentum", desc: "Streaks, scores, visual progress. Small daily actions compound into results." },
];

const faqs = [
  { q: "Is Lexis really free?", a: "Yes, completely. No freemium, no premium tiers. Productivity shouldn't require a subscription." },
  { q: "Where is my data stored?", a: "Entirely in your browser. Nothing is sent to any server. Your data never leaves your device." },
  { q: "How does the AI work?", a: "Noor uses NVIDIA's NIM API to connect to frontier models. Your data is processed temporarily but never stored." },
  { q: "Why no login?", a: "No accounts means no data to lose, no passwords to reset, and zero attack surface for hackers." },
  { q: "Can I use it on mobile?", a: "Absolutely. Fully responsive, works on any device with a browser. No app store needed." },
  { q: "How do I back up?", a: "Settings → Export. One click to download everything as JSON. Import anytime to restore." },
];

/* ============================================================ */
/* Icons for SVG                                                 */
/* ============================================================ */
const WinIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M0,0H11.377V11.372H0ZM12.623,0H24V11.372H12.623ZM0,12.623H11.377V24H0Zm12.623,0H24V24H12.623" /></svg>
);
const MacIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09z" /><path d="M15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" /></svg>
);
const LinuxIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><circle cx="12" cy="7" r="3.5" fill="currentColor"/><path d="M12 11c-4 0-7 2-7 5v2h14v-2c0-3-3-5-7-5z" fill="currentColor"/><line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="2"/><line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
);

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();
  const isMobile = useMobile();
  const light = !!reduceMotion || isMobile;

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.4], [0, -100]);
  const mockupOpacity = useTransform(scrollYProgress, [0.2, 0.6], [0, 1]);
  const mockupY = useTransform(scrollYProgress, [0.2, 0.6], [80, 0]);

  const scrollTo = (id: string) => {
    setMobileNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
''')

# ============================================================
# PART 2: Return JSX
# ============================================================
parts.append(r'''
  return (
    <div className="min-h-screen bg-background relative">
      {/* ===== NAV ===== */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/lexis-logo.png" alt="LEXIS" className="h-9 w-9 rounded-lg object-contain" />
            <span className="text-sm font-bold tracking-tight">LEXIS</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {["NOOR", "FEATURES", "FAQ"].map((item) => (
              <button key={item} onClick={() => scrollTo(item.toLowerCase())} className="text-[11px] font-mono tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors">{item}</button>
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

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="fixed top-16 inset-x-0 z-40 md:hidden px-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-2xl">
              {["NOOR", "FEATURES", "FAQ"].map((item) => (
                <button key={item} onClick={() => scrollTo(item.t
