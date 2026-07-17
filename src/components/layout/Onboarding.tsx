"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, FileText, BookOpen, ListTodo, ArrowRight, ArrowLeft, Zap } from "lucide-react";
import { storage } from "@/lib/storage";

const steps = [
  {
    title: "Welcome to LEXIS",
    subtitle: "Your AI-Powered Productivity Hub",
    description: "Track habits, capture ideas, journal daily, and manage tasks — all in one beautiful app.",
    icon: Sparkles,
    color: "from-zinc-400 to-zinc-600",
  },
  {
    title: "Track Your Habits",
    subtitle: "Build Better Routines",
    description: "Create unlimited habits with streaks, heatmaps, and smart reminders. Watch your consistency grow.",
    icon: CheckCircle2,
    color: "from-zinc-500 to-zinc-700",
  },
  {
    title: "Smart Notes",
    subtitle: "Capture & Organize Ideas",
    description: "Write rich notes with AI summaries, smart tags, and folders. Search and find anything instantly.",
    icon: FileText,
    color: "from-zinc-400 to-zinc-600",
  },
  {
    title: "Daily Journal",
    subtitle: "Reflect & Grow",
    description: "Track your mood, practice gratitude, and reflect with AI-powered prompts. Watch your journey unfold.",
    icon: BookOpen,
    color: "from-zinc-500 to-zinc-700",
  },
  {
    title: "Task Manager",
    subtitle: "Get Things Done",
    description: "Kanban boards, smart prioritization, and calendar views. Never miss a deadline again.",
    icon: ListTodo,
    color: "from-zinc-400 to-zinc-600",
  },
  {
    title: "You're All Set!",
    subtitle: "Let's Build Something Great",
    description: "Everything works offline and syncs instantly. Start your productivity journey now!",
    icon: Zap,
    color: "from-zinc-500 to-zinc-700",
  },
];

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const current = steps[step];

  const handleComplete = () => {
    storage.completeOnboarding();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-zinc-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-zinc-600/10 blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-10 mx-auto w-full max-w-md px-6 text-center"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className={`mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br ${current.color} shadow-xl shadow-zinc-800/50`}
          >
            <current.icon className="h-12 w-12 text-white" />
          </motion.div>

          {/* Title */}
          <h1 className="mb-2 text-3xl font-bold tracking-tight">{current.title}</h1>
          <p className="mb-2 text-sm font-medium text-zinc-400">{current.subtitle}</p>
          <p className="mb-10 text-base text-muted-foreground leading-relaxed">{current.description}</p>

          {/* Progress dots */}
          <div className="mb-8 flex items-center justify-center gap-2">
            {steps.map((_, i) => (
              <motion.div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? "w-8 bg-primary-500" : "w-2 bg-muted-foreground/20"
                }`}
                animate={i === step ? { scale: [1, 1.2, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="btn-secondary flex items-center gap-2 px-6"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="btn-primary flex items-center gap-2 px-6"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="btn-primary flex items-center gap-2 px-8 py-3 text-base"
              >
                <Zap className="h-5 w-5" />
                Get Started
              </button>
            )}
          </div>

          {step < steps.length - 1 && (
            <button
              onClick={handleComplete}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
