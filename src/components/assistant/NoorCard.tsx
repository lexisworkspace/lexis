"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock, AlertTriangle, Flame, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// ---- Task Card ----
export function TaskCard({ title, dueDate, priority, status }: {
  title: string;
  dueDate?: string;
  priority?: string;
  status?: string;
}) {
  const isDone = status === "done";
  const isOverdue = dueDate && dueDate < new Date().toISOString().split("T")[0] && !isDone;

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-500/10 text-red-500 border-red-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    low: "bg-muted/50 text-muted-foreground border-border",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 transition-colors",
        isDone ? "border-border/40 bg-muted/20 opacity-60" : "border-border/60 bg-card/80"
      )}
    >
      {isDone ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      ) : isOverdue ? (
        <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/30" />
      )}
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium truncate", isDone && "line-through text-muted-foreground")}>{title}</p>
        {dueDate && (
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3 text-muted-foreground/40" />
            <span className={cn("text-[10px]", isOverdue ? "text-red-400" : "text-muted-foreground/50")}>
              {dueDate}
            </span>
          </div>
        )}
      </div>
      {priority && priority !== "low" && (
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", priorityColors[priority] || priorityColors.low)}>
          {priority}
        </span>
      )}
    </motion.div>
  );
}

// ---- Habit Card ----
export function HabitCard({ name, streak, logged }: {
  name: string;
  streak: number;
  logged: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 transition-colors",
        logged ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/60 bg-card/80"
      )}
    >
      {logged ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/30" />
      )}
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", logged && "text-emerald-600 dark:text-emerald-400")}>{name}</p>
        {streak > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            <Flame className="h-3 w-3 text-orange-400" />
            <span className="text-[10px] text-orange-500/70">{streak}d streak</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---- Chart Card ----
export function ChartCard({ type, title, data }: {
  type: string;
  title: string;
  data: { labels: string[]; values: number[] };
}) {
  const maxVal = Math.max(...data.values, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 bg-card/80 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary/60" />
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <div className="flex items-end gap-1.5 h-24">
        {data.labels.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <motion.div
              className="w-full rounded-t bg-primary/30 min-h-[2px]"
              initial={{ height: 0 }}
              animate={{ height: `${(data.values[i] / maxVal) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
            />
            <span className="text-[9px] text-muted-foreground/50 truncate w-full text-center">{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ---- Insight Card ----
export function InsightCard({ icon, text, type = "default" }: {
  icon: string;
  text: string;
  type?: "default" | "positive" | "warning" | "info";
}) {
  const colors = {
    default: "border-border/60 bg-card/80",
    positive: "border-emerald-500/20 bg-emerald-500/5",
    warning: "border-amber-500/20 bg-amber-500/5",
    info: "border-blue-500/20 bg-blue-500/5",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-xl border p-3 flex items-start gap-2.5", colors[type])}
    >
      <span className="text-sm shrink-0 mt-0.5">{icon}</span>
      <p className="text-xs text-foreground/80 leading-relaxed">{text}</p>
    </motion.div>
  );
}

// ---- Steps Card ----
export function StepsCard({ title, steps }: {
  title: string;
  steps: { title: string; description: string }[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 bg-card/80 p-4"
    >
      <p className="text-xs font-semibold mb-3">{title}</p>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {i + 1}
            </div>
            <div>
              <p className="text-xs font-medium">{step.title}</p>
              {step.description && (
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">{step.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
