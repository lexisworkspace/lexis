const fs = require("fs");

const code = `"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sun, Moon, Monitor } from "lucide-react";
import { storage } from "@/lib/storage";
import { LANGUAGES } from "@/lib/i18n";
import type { LanguageDef } from "@/lib/i18n";
import type { AccentColor } from "@/types";
import { cn } from "@/lib/utils";

const ACCENT_COLORS: { key: AccentColor; label: string; cls: string }[] = [
  { key: "slate", label: "Slate", cls: "bg-zinc-400" },
  { key: "amber", label: "Amber", cls: "bg-amber-500" },
  { key: "emerald", label: "Emerald", cls: "bg-emerald-500" },
  { key: "sky", label: "Sky", cls: "bg-sky-500" },
  { key: "violet", label: "Violet", cls: "bg-violet-500" },
  { key: "rose", label: "Rose", cls: "bg-rose-500" },
  { key: "orange", label: "Orange", cls: "bg-orange-500" },
];

function WelcomeStep({ onDone }: { onDone: () => void }) {
  const [started, setStarted] = useState(false);
  const [count, setCount] = useState(0);
  const word = "Welcome";
  const done = count >= word.length;
  useEffect(() => { const t = setTimeout(() => setStarted(true), 400); return () => clearTimeout(t); }, []);
  useEffect(() => { if (!started || done) return; const t = setTimeout(() => setCount(c => c + 1), 100); return () => clearTimeout(t); }, [started, count, done]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); done ? onDone() : setCount(word.length); } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [done, onDone]);
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background" onClick={() => done ? onDone() : setCount(word.length)}>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }} className="mb-10 text-xs tracking-[0.5em] text-muted-foreground/40">ORLEIA</motion.p>
      <h1 className="font-serif text-5xl font-light tracking-tight text-foreground md:text-7xl">
        <span>{word.slice(0, count)}</span>
        {!done && <span className="ml-1 inline-block h-[0.8em] w-[2px] translate-y-[0.06em] animate-pulse bg-foreground/70" />}
      </h1>
      <div className="mt-10 flex h-12 items-start justify-center">
        {done && <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] tracking-widest text-muted-foreground/50">tap or press space to continue</motion.p>}
      </div>
    </div>
  );
}

function LanguageStep({ onDone }: { onDone: () => void }) {
  const [selected, setSelected] = useState<string>(() => (storage.getData().theme.language as string) || "en");
  const pick = (l: LanguageDef) => { storage.updateTheme({ language: l.code }); document.documentElement.setAttribute("lang", l.code); setSelected(l.code); };
  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background">
      <div className="mt-14 flex w-full justify-center md:mt-16"><p className="text-xs tracking-[0.5em] text-muted-foreground/40">ORLEIA</p></div>
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mt-10 text-center font-serif text-3xl font-light tracking-tight md:text-4xl">Choose your language</motion.h1>
      <div className="mt-8 w-full flex-1 overflow-y-auto px-6 pb-4">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-1.5">
          {LANGUAGES.map(l => { const active = selected === l.code; return (
            <button key={l.code} onClick={() => pick(l)} className={cn("flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-base transition-all", active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/40 text-muted-foreground hover:border-muted-foreground/30")}>
              <span className="font-medium">{l.name}</span>{active && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>); })}
        </div>
      </div>
      <div className="w-full px-6 pb-10 pt-4"><div className="mx-auto w-full max-w-sm"><button onClick={onDone} className="w-full rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]">Continue</button></div></div>
    </div>
  );
}

function AppearanceStep({ onDone }: { onDone: () => void }) {
  const initial = storage.getData().theme;
  const [mode, setMode] = useState(initial.theme || "system");
  const [accent, setAccent] = useState<AccentColor>(initial.accentColor || "slate");
  const pickTheme = (m: "light" | "dark" | "system") => { storage.updateTheme({ theme: m }); const isDark = m === "dark" || (m === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches); document.documentElement.classList.toggle("dark", isDark); setMode(m); };
  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background">
      <div className="mt-14 flex w-full justify-center md:mt-16"><p className="text-xs tracking-[0.5em] text-muted-foreground/40">ORLEIA</p></div>
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mt-10 text-center font-serif text-3xl font-light tracking-tight md:text-4xl">Pick your look</motion.h1>
      <div className="mt-8 w-full flex-1 overflow-y-auto px-6 pb-4">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
          <div><p className="mb-2.5 text-sm font-medium text-muted-foreground">Theme</p>
            <div className="grid grid-cols-3 gap-2">{([{ m: "light", icon: Sun, label: "Light" }, { m: "dark", icon: Moon, label: "Dark" }, { m: "system", icon: Monitor, label: "System" }] as const).map(({ m, icon: Icon, label }) => (
              <button key={m} onClick={() => pickTheme(m)} className={cn("flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs transition-all", mode === m ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/40 text-muted-foreground hover:border-muted-foreground/30")}>
                <Icon className="h-4 w-4" />{label}
              </button>))}</div></div>
          <div><p className="mb-2.5 text-sm font-medium text-muted-foreground">Accent colour</p>
            <div className="flex gap-2">{ACCENT_COLORS.map(c => (
              <button key={c.key} onClick={() => { storage.updateTheme({ accentColor: c.key }); document.documentElement.setAttribute("data-accent", c.key); setAccent(c.key); }} className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all", accent === c.key ? "border-foreground scale-110" : "border-transparent hover:scale-105")} aria-label={c.label}>
                <span className={cn("h-5 w-5 rounded-full", c.cls)} />
              </button>))}</div></div>
        </div>
      </div>
      <div className="w-full px-6 pb-10 pt-4"><div className="mx-auto w-full max-w-sm"><button onClick={onDone} className="w-full rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]">Start using Orleia</button></div></div>
    </div>
  );
}

const INTRO_STEP_KEY = "orleia-intro-step";

export function IntroFlow({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<"welcome" | "language" | "appearance">(() => { if (typeof window === "undefined") return "welcome"; const saved = localStorage.getItem(INTRO_STEP_KEY); if (saved === "language" || saved === "appearance") return saved; return "welcome"; });
  useEffect(() => { if (step === "welcome") localStorage.removeItem(INTRO_STEP_KEY); else localStorage.setItem(INTRO_STEP_KEY, step); }, [step]);
  const finish = () => { localStorage.removeItem(INTRO_STEP_KEY); storage.completeOnboarding(); onComplete(); };
  return (
    <AnimatePresence mode="wait">
      {step === "welcome" && <motion.div key="welcome" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}><WelcomeStep onDone={(
