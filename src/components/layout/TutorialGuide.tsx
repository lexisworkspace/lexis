"use client";

import { useState } from "react";
import { ArrowRight, Check, MapPin, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ShellMock,
  DashboardMock,
  HabitsMock,
  DocumentsMock,
  JournalMock,
  TasksMock,
  GridMock,
  NoorMock,
} from "./tutorial-mockups";

interface TutorialStep {
  key: string;
  kicker: string;
  title: string;
  description: string;
  points: string[];
  location: string;
  Visual: React.ComponentType;
}

const steps: TutorialStep[] = [
  {
    key: "welcome",
    kicker: "01 — Your workspace",
    title: "This is Lexis",
    description:
      "A private, local-first workspace with one job: help you think, plan, and create. Everything lives in your browser - it loads instantly, works offline, and nobody else can see it.",
    points: [
      "The sidebar is your command center - every tool is one click away.",
      "Search everything with the ⌘K command palette.",
      "Noor, the AI companion, lives here too and can act on your data.",
    ],
    location: "Everything lives here",
    Visual: ShellMock,
  },
  {
    key: "dashboard",
    kicker: "02 — Start of day",
    title: "The Dashboard",
    description:
      "Your day, at a glance. The Dashboard gathers your habits, tasks, mood and notes into one calm overview - so you always know what matters right now.",
    points: [
      "Your productivity score updates as you complete things.",
      "Today's habits and tasks are surfaced automatically.",
      "Noor's Read shows connections it has spotted in your data.",
    ],
    location: "First stop every morning",
    Visual: DashboardMock,
  },
  {
    key: "habits",
    kicker: "03 — Build momentum",
    title: "Habits",
    description:
      "Turn intentions into routines. Log a habit with one tap, watch your streaks grow, and let the heatmap show the compounding effect of showing up every day.",
    points: [
      "Daily, weekly or custom schedules - whatever fits your life.",
      "Streaks and heatmaps turn consistency into something you can see.",
      "Noor nudges you when a streak is at risk and celebrates wins.",
    ],
    location: "Sidebar → Habits",
    Visual: HabitsMock,
  },
  {
    key: "documents",
    kicker: "04 — Capture ideas",
    title: "Documents",
    description:
      "A real writing tool, not a text box. Type on clean A4 pages with a full Word-style editor - formatting, images, margins, and pages that grow as you write.",
    points: [
      "Format text, add images, and control margins with the ruler.",
      "Pages flow - when you run out of room, a new one appears.",
      "Voice dictation turns spoken words into text as you talk.",
    ],
    location: "Sidebar → Documents",
    Visual: DocumentsMock,
  },
  {
    key: "mindfulness",
    kicker: "05 — Reflect daily",
    title: "Mindfulness",
    description:
      "A private space to reflect. Track your mood, answer guided prompts, and unwind with built-in breathing and meditation - because performance needs recovery too.",
    points: [
      "Log your mood with one tap and watch trends form.",
      "Reflection prompts help you go deeper than a diary entry.",
      "Breathing exercises with rain soundscapes help you reset.",
    ],
    location: "Sidebar → Mindfulness",
    Visual: JournalMock,
  },
  {
    key: "tasks",
    kicker: "06 — Get things done",
    title: "Tasks",
    description:
      "Capture anything, organize everything. Add tasks in seconds, set priorities and due dates, and switch between list, kanban and calendar views without losing your flow.",
    points: [
      "Quick Add captures a task without breaking your stride.",
      "Priorities, due dates and lists keep things in order.",
      "Noor can create, complete and reschedule tasks for you.",
    ],
    location: "Sidebar → Tasks",
    Visual: TasksMock,
  },
  {
    key: "grid",
    kicker: "07 — Crunch data",
    title: "Grid",
    description:
      "A built-in spreadsheet for anything that needs structure. Budgets, plans, lists, data - with formulas, formatting, and CSV import/export.",
    points: [
      "Multiple spreadsheets and sheets, just like Excel.",
      "Formulas: SUM, AVG, COUNT, IF, and more.",
      "Bold, italic, colors, alignment - full cell formatting.",
    ],
    location: "Sidebar → Tools → Grid",
    Visual: GridMock,
  },
  {
    key: "noor",
    kicker: "08 — Your AI companion",
    title: "Noor",
    description:
      "The brain of Lexis. Talk to Noor in text or voice, pick a model with its own personality, and let it actually do things - create habits, schedule tasks, write documents, summarize your week.",
    points: [
      "Three models: Ethos 4.7 (deep reasoning), Logos 4.5 (balanced), Verse 4 (speed).",
      "Voice mode - speak, and Noor replies out loud.",
      "Noor reads your live workspace, so answers are about your real data.",
    ],
    location: "Sidebar → Noor",
    Visual: NoorMock,
  },
];

export function TutorialGuide({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const Visual = current.Visual;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col overflow-hidden bg-background">
      {/* Top progress */}
      <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-muted">
        <div
          className="h-full bg-primary-500 transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/*
        Mobile: one stable screen - overflow hidden, compact mockup + copy that
        both fit the viewport, actions pinned to the bottom. No scrolling.
        Desktop: roomier two-column layout.
      */}
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden px-4 pb-5 pt-6 md:px-8 md:py-8">
        <div
          key={step}
          className="flex min-h-0 w-full flex-1 flex-col justify-center md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-center md:gap-12"
        >
          {/* Visual - compact on mobile */}
          <div
            className="order-1 mb-4 flex justify-center md:mb-0"
            style={{ animation: "lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both" }}
          >
            <div className="relative max-h-[30vh] w-full max-w-[240px] overflow-hidden md:max-h-none md:max-w-sm">
              {/* Glow */}
              <div className="absolute -inset-6 rounded-[2rem] bg-primary-500/5 blur-2xl" />
              <div className="relative">
                <Visual />
              </div>
            </div>
          </div>

          {/* Copy - compact typography on mobile so it never overflows */}
          <div className="order-2 flex min-h-0 flex-1 flex-col justify-center md:block">
            <p
              className="mb-2 text-[10px] font-sans tracking-widest text-muted-foreground/40 md:mb-4 md:text-[11px]"
              style={{ animation: "lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both 0.05s" }}
            >
              {current.kicker}
            </p>

            <h2
              className="mb-1.5 text-xl font-bold tracking-tight leading-tight md:mb-3 md:text-4xl"
              style={{ animation: "lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both 0.1s" }}
            >
              {current.title}
            </h2>

            <p
              className="mb-2.5 max-w-md text-xs leading-snug text-muted-foreground/80 md:mb-6 md:text-base md:leading-relaxed"
              style={{ animation: "lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both 0.15s" }}
            >
              {current.description}
            </p>

            {/* What you can do */}
            <ul className="mb-3 space-y-1.5 md:mb-6 md:space-y-2.5">
              {current.points.map((p, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-muted-foreground md:text-sm"
                  style={{
                    animation: `lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both ${0.2 + i * 0.07}s`,
                  }}
                >
                  <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 md:h-4 md:w-4">
                    <Check className="h-2 w-2 text-emerald-500 md:h-2.5 md:w-2.5" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>

            {/* Location */}
            <p
              className="mb-2.5 flex items-center gap-1.5 text-[10px] font-sans tracking-wider text-muted-foreground/40 md:mb-5 md:text-[11px]"
              style={{ animation: "lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both 0.45s" }}
            >
              <MapPin className="h-3 w-3" />
              {current.location}
            </p>

            {/* Mobile navigation hint - only when room allows (small screens) */}
            <div
              className="mb-3 hidden items-start gap-2 rounded-xl border border-border bg-secondary/40 p-2.5 [@media(min-height:720px)]:flex md:hidden"
              style={{ animation: "lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both 0.48s" }}
            >
              <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-[11px] leading-snug text-muted-foreground/70">
                Use the <strong className="text-foreground/80">menu button</strong> at the
                bottom-right to open the sidebar and move between sections.
              </p>
            </div>

            {/* Actions */}
            <div
              className="flex items-center gap-3"
              style={{ animation: "lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both 0.5s" }}
            >
              <button
                type="button"
                onClick={onComplete}
                className="text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground/70"
              >
                Skip all
              </button>

              <div className="flex-1" />

              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-xs font-medium text-muted-foreground transition-all hover:bg-secondary/40 active:scale-[0.98]"
                >
                  Back
                </button>
              )}

              {isLast ? (
                <button
                  type="button"
                  onClick={onComplete}
                  className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-xs font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  Enter Lexis
                  <Check className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-xs font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Dots */}
            <div
              className="mt-4 flex items-center gap-1.5 md:mt-6"
              style={{ animation: "lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both 0.55s" }}
            >
              {steps.map((_, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setStep(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === step ? "w-6 bg-foreground" : "w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40"
                  )}
                  aria-label={`Step ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
