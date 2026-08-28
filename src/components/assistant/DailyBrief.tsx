"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Cloud, CheckCircle2, AlertTriangle, TrendingUp, Flame } from "lucide-react";
import { storage } from "@/lib/storage";
import { getToday, calculateStreak, getMoodScore } from "@/lib/utils";

interface DailyBriefProps {
  userName?: string;
}

export function DailyBrief({ userName }: DailyBriefProps) {
  const brief = useMemo(() => {
    const data = storage.getData();
    const today = getToday();
    const hour = new Date().getHours();
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const habits = data.habits.filter(h => !h.archived);
    const habitsLoggedToday = habits.filter(h =>
      data.habitLogs.some(l => l.habitId === h.id && l.date === today)
    ).length;

    const pendingTasks = data.tasks.filter(t => t.status !== 'done');
    const overdueTasks = pendingTasks.filter(t => t.dueDate && t.dueDate < today);
    const highPriority = pendingTasks.filter(t => t.priority === 'urgent' || t.priority === 'high');

    const recentJournal = data.journalEntries.slice(0, 7);
    const moodScores = recentJournal.map(e => getMoodScore(e.mood));
    const avgMood = moodScores.length > 0 ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length : null;

    // Best streak
    let bestStreak = { name: '', count: 0 };
    habits.forEach(h => {
      const streak = calculateStreak(storage.getHabitLogDates(h.id));
      if (streak.current > bestStreak.count) {
        bestStreak = { name: h.name, count: streak.current };
      }
    });

    const TimeIcon = hour < 12 ? Sun : hour < 18 ? Cloud : Moon;
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const namePart = userName ? `, ${userName}` : '';

    return {
      greeting: `${greeting}${namePart}`,
      dayName,
      TimeIcon,
      habitsTotal: habits.length,
      habitsLogged: habitsLoggedToday,
      habitsPercent: habits.length > 0 ? Math.round((habitsLoggedToday / habits.length) * 100) : 0,
      pendingTasks: pendingTasks.length,
      overdueTasks: overdueTasks.length,
      highPriority: highPriority.length,
      hasJournal: recentJournal.some(e => e.date === today),
      avgMood,
      moodLabel: avgMood ? (avgMood >= 75 ? 'positive' : avgMood >= 50 ? 'neutral' : 'low') : null,
      bestStreak,
      completedToday: data.tasks.filter(t => t.status === 'done' && t.completedAt?.startsWith(today)).length,
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 mb-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10">
          <brief.TimeIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{brief.greeting}</h3>
          <p className="text-xs text-muted-foreground">{brief.dayName}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Habits */}
        <div className="rounded-xl bg-secondary/40 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-[11px] font-medium text-muted-foreground">Habits</span>
          </div>
          <p className="text-lg font-bold">{brief.habitsLogged}/{brief.habitsTotal}</p>
          {brief.habitsTotal > 0 && (
            <div className="mt-1.5 h-1.5 rounded-full bg-muted/50 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-orange-500"
                initial={{ width: 0 }}
                animate={{ width: `${brief.habitsPercent}%` }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              />
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="rounded-xl bg-secondary/40 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[11px] font-medium text-muted-foreground">Tasks</span>
          </div>
          <p className="text-lg font-bold">{brief.completedToday} done</p>
          {brief.overdueTasks > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3 w-3 text-red-400" />
              <span className="text-[10px] text-red-400">{brief.overdueTasks} overdue</span>
            </div>
          )}
        </div>
      </div>

      {/* Insights Row */}
      <div className="flex flex-wrap gap-2">
        {brief.bestStreak.count > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 text-[11px] font-medium text-orange-600 dark:text-orange-400">
            🔥 {brief.bestStreak.name} ({brief.bestStreak.count}d)
          </span>
        )}
        {brief.moodLabel && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            brief.moodLabel === 'positive' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
            brief.moodLabel === 'low' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
            'bg-muted/50 text-muted-foreground'
          }`}>
            {brief.moodLabel === 'positive' ? '😊' : brief.moodLabel === 'low' ? '💙' : '😐'} {brief.moodLabel} mood
          </span>
        )}
        {brief.highPriority > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-600 dark:text-red-400">
            ⚡ {brief.highPriority} urgent
          </span>
        )}
        {brief.hasJournal && (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
            📝 Journal written
          </span>
        )}
      </div>
    </motion.div>
  );
}
