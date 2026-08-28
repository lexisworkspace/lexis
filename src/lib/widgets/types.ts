"use client";

/**
 * Dashboard Widget System
 * Each widget is a small, self-contained card that lives on the dashboard.
 * The user can add/remove/reorder them via a catalog modal.
 */

export type WidgetType =
  | "habit-tracker"
  | "task-summary"
  | "journal-prompt"
  | "daily-quote"
  | "quick-note"
  | "streak-counter"
  | "weekly-overview"
  | "mood-tracker"
  | "goal-progress"
  | "focus-timer"
  | "weather"
  | "daily-intention";

export interface WidgetDef {
  id: WidgetType;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  defaultEnabled: boolean;
  /** Size hint: 1 = half width, 2 = full width */
  defaultSize: 1 | 2;
  /** Category for the catalog */
  category: "productivity" | "wellness" | "info" | "creative";
}

export interface WidgetInstance {
  id: string; // unique instance id
  type: WidgetType;
  size: 1 | 2;
  order: number;
}

export const WIDGET_CATALOG: WidgetDef[] = [
  {
    id: "habit-tracker",
    name: "Habit Tracker",
    description: "Log today's habits with one tap",
    icon: "CheckCircle2",
    defaultEnabled: true,
    defaultSize: 2,
    category: "productivity",
  },
  {
    id: "task-summary",
    name: "Task Summary",
    description: "See what's due and what's done",
    icon: "ListTodo",
    defaultEnabled: true,
    defaultSize: 1,
    category: "productivity",
  },
  {
    id: "journal-prompt",
    name: "Journal Prompt",
    description: "A daily writing prompt to get you started",
    icon: "BookOpen",
    defaultEnabled: true,
    defaultSize: 1,
    category: "creative",
  },
  {
    id: "daily-quote",
    name: "Daily Quote",
    description: "A fresh quote every day",
    icon: "Quote",
    defaultEnabled: false,
    defaultSize: 2,
    category: "wellness",
  },
  {
    id: "quick-note",
    name: "Quick Note",
    description: "Capture a thought instantly",
    icon: "PenLine",
    defaultEnabled: false,
    defaultSize: 1,
    category: "creative",
  },
  {
    id: "streak-counter",
    name: "Streak Counter",
    description: "Your longest active streaks",
    icon: "Flame",
    defaultEnabled: true,
    defaultSize: 1,
    category: "productivity",
  },
  {
    id: "weekly-overview",
    name: "Weekly Overview",
    description: "This week at a glance",
    icon: "Calendar",
    defaultEnabled: false,
    defaultSize: 2,
    category: "productivity",
  },
  {
    id: "mood-tracker",
    name: "Mood Tracker",
    description: "How are you feeling right now?",
    icon: "Smile",
    defaultEnabled: false,
    defaultSize: 1,
    category: "wellness",
  },
  {
    id: "goal-progress",
    name: "Goal Progress",
    description: "Track progress toward your goals",
    icon: "Target",
    defaultEnabled: false,
    defaultSize: 1,
    category: "productivity",
  },
  {
    id: "focus-timer",
    name: "Focus Timer",
    description: "Pomodoro-style work timer",
    icon: "Timer",
    defaultEnabled: false,
    defaultSize: 1,
    category: "productivity",
  },
  {
    id: "weather",
    name: "Weather",
    description: "Current conditions at a glance",
    icon: "Cloud",
    defaultEnabled: false,
    defaultSize: 1,
    category: "info",
  },
  {
    id: "daily-intention",
    name: "Daily Intention",
    description: "Set one intention for today",
    icon: "Compass",
    defaultEnabled: false,
    defaultSize: 2,
    category: "wellness",
  },
];

export const DEFAULT_WIDGETS: WidgetInstance[] = WIDGET_CATALOG
  .filter((w) => w.defaultEnabled)
  .map((w, i) => ({
    id: `default-${w.id}`,
    type: w.id,
    size: w.defaultSize,
    order: i,
  }));

export function getWidgetDef(type: WidgetType): WidgetDef {
  return WIDGET_CATALOG.find((w) => w.id === type)!;
}
