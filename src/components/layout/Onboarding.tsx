"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { storage } from "@/lib/storage";

const steps = [
  {
    title: "LEXIS",
    subtitle: "A workspace that adapts to you.",
    description: "No fluff. No clutter. Just the tools you need to think, plan, and create.",
  },
  {
    title: "Your tools",
    subtitle: "Habits, notes, journal, tasks.",
    description: "Each one is a space. Nothing more, nothing less. Use what you need, ignore the rest.",
  },
  {
    title: "You're in control",
    subtitle: "Everything lives on your device.",
    description: "No accounts. No subscriptions. No noise. Just you and your work.",
  },
];

function IntroSlides({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-px w-32 -translate-x-1/2 bg-border" />
        <div className="absolute top-1/4 left-1/4 h-32 w-px -translate-y-1/2 bg-border" />
        <div className="absolute bottom-1/3 right-1/4 h-px w-20 bg-border/50" />
        <div className="absolute top-1/3 right-1/3 h-24 w-px bg-border/30" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative z-10 mx-auto w-full max-w-sm px-6"
        >
          <p className="mb-6 text-[11px] font-mono tracking-widest text-muted-foreground/40">
            {String(step + 1).padStart(2, "0")}/{String(steps.length).padStart(2, "0")}
          </p>

          <div className="mb-8 h-px w-12 bg-primary-500/50" />

          <h1 className="mb-3 text-4xl font-bold tracking-tight leading-none">
            {current.title}
          </h1>

          <p className="mb-4 text-sm font-medium text-muted-foreground">
            {current.subtitle}
          </p>

          <p className="mb-12 text-sm text-muted-foreground/70 leading-relaxed max-w-xs">
            {current.description}
          </p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 transition-all duration-300 ${
                    i === step ? "w-6 bg-foreground" : "w-1 bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>

            <div className="flex-1" />

            <button
              onClick={isLast ? onDone : () => setStep(step + 1)}
              className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
            >
              {isLast ? "Start" : "Next"}
              {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>

          <button
            onClick={onSkip}
            className="mt-6 text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors tracking-wide"
          >
            Skip
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const completedRef = useRef(false);

  const handleIntroDone = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    storage.completeOnboarding();
    localStorage.setItem("lexis-tutorial-pending", "true");
    onComplete();
  };

  const handleSkip = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    storage.completeOnboarding();
    onComplete();
  };

  return <IntroSlides onDone={handleIntroDone} onSkip={handleSkip} />;
}
