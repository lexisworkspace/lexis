"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  LayoutDashboard,
  CheckCircle2,
  FileText,
  BookOpen,
  ListTodo,
  Bot,
  Smartphone,
} from "lucide-react";

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ElementType;
  /** Approximate Y position from top of sidebar for the coachmark arrow (desktop only) */
  targetY: number;
}

const steps: TutorialStep[] = [
  {
    title: "Navigate your workspace",
    description: "The sidebar is your command center. Each section is a dedicated space — habits, notes, journal, tasks.",
    icon: LayoutDashboard,
    targetY: 90,
  },
  {
    title: "Track your habits",
    description: "Set daily routines, build streaks, and watch your consistency grow over time.",
    icon: CheckCircle2,
    targetY: 134,
  },
  {
    title: "Capture ideas",
    description: "Write rich notes with formatting, tags, and folders. Everything syncs instantly.",
    icon: FileText,
    targetY: 178,
  },
  {
    title: "Reflect daily",
    description: "Journal with mood tracking, gratitude prompts, and reflection guides.",
    icon: BookOpen,
    targetY: 222,
  },
  {
    title: "Manage tasks",
    description: "Organize work with priorities, due dates, and smart filtering.",
    icon: ListTodo,
    targetY: 266,
  },
  {
    title: "Get AI insights",
    description: "Chat with Lexis AI to analyze your data, get suggestions, and stay motivated.",
    icon: Bot,
    targetY: 354,
  },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export function TutorialGuide({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const isMobile = useIsMobile();
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const Icon = current.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Dim overlay */}
      <div className="fixed inset-0 z-[80] bg-black/30" style={{ pointerEvents: "auto" }} />

      {/* Sidebar highlight zone — desktop only */}
      {!isMobile && (
        <div
          className="fixed left-0 top-0 z-[90] h-full border-r border-border"
          style={{ width: 260, pointerEvents: "none" }}
        >
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="absolute left-3 right-3 rounded-md bg-foreground/5 ring-1 ring-foreground/10"
            style={{
              top: current.targetY - 6,
              height: 44,
            }}
          />
        </div>
      )}

      {/* Coachmark card — full width on mobile, bottom on desktop */}
      <div
        className={`fixed inset-x-0 z-[95] flex pointer-events-none ${
          isMobile
            ? "top-0 bottom-0 items-center justify-center p-4"
            : "bottom-0 items-end justify-center"
        }`}
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={`w-full mx-auto ${isMobile ? "max-w-sm" : "max-w-sm mb-24"}`}
          style={{ pointerEvents: "auto" }}
        >
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
            {/* Step indicator */}
            <div className="mb-5 flex items-center gap-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${
                    i <= step ? "bg-foreground" : "bg-border"
                  }`}
                />
              ))}
            </div>

            {/* Icon + Title */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
                <Icon className="h-5 w-5 text-primary-500" />
              </div>
              <h3 className="text-base font-semibold">{current.title}</h3>
            </div>

            {/* Description */}
            <p className="mb-5 text-sm text-muted-foreground/70 leading-relaxed">
              {current.description}
            </p>

            {/* Mobile tip */}
            {isMobile && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-muted p-3">
                <Smartphone className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                  Use the <strong className="text-foreground/80">menu button</strong> at the bottom-right
                  to open the sidebar and navigate between sections.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={onComplete}
                className="text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
              >
                Skip all
              </button>

              <div className="flex-1" />

              {isLast ? (
                <button
                  onClick={onComplete}
                  className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-xs font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  Done
                  <Check className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setStep(step + 1)}
                  className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-xs font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
