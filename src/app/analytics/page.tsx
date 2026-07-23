"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Flame,
  TrendingUp,
  Smile,
  Calendar,
  Target,
  Activity,
  Award,
  Heart,
  Brain,
  Zap,
  Clock,
} from "lucide-react";
import { storage } from "@/lib/storage";
import { cn, calculateStreak, getMoodScore, getDateRange, formatDate } from "@/lib/utils";
import { Habit, MOODS } from "@/types";

export default function AnalyticsPage() {
  const [data, setData] = useState(storage.getData());

  const habits = data.habits.filter((h) => !h.archived);
  const journalEntries = data.journalEntries;
  const tasks = data.tasks;

  // Habit Stats
  const habitStats = habits.map((h) => ({
    ...h,
    dates: storage.getHabitLogDates(h.id),
    streak: calculateStreak(storage.getHabitLogDates(h.id)),
  }));

  const totalLogs = habitStats.reduce((sum, h) => sum + h.dates.length, 0);
  const bestOverallStreak = Math.max(...habitStats.map((h) => h.streak.longest), 0);
  const bestStreakHabit = habitStats.sort((a, b) => b.streak.longest - a.streak.longest)[0];

  // Task Stats
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const pendingTasks = tasks.filter((t) => t.status !== "done" && t.status !== "archived").length;

  // Journal Stats
  const avgMood = journalEntries.length > 0
    ? journalEntries.reduce((sum, e) => sum + getMoodScore(e.mood), 0) / journalEntries.length
    : 0;

  const moodDistribution = MOODS.map((m) => ({
    ...m,
    count: journalEntries.filter((e) => e.mood === m.value).length,
  }));

  // Weekly data
  const last7Days = getDateRange(7);
  const weeklyHabitData = last7Days.map((date) => ({
    date,
    count: data.habitLogs.filter((l) => l.date === date).length,
  }));
  const weeklyTaskData = last7Days.map((date) => ({
    date,
    count: tasks.filter((t) => t.completedAt?.startsWith(date)).length,
  }));

  return (
    <div className="relative space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative"
      >
        <h1 className="text-3xl font-bold tracking-tight leading-none">Analytics</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xs">
          Track your progress and discover patterns
        </p>
      </motion.div>

      {/* Overview Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35, ease: "easeOut" }}
        className="relative"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Habit Logs", value: totalLogs, icon: Activity },
            { label: "Best Streak", value: `${bestOverallStreak} days`, icon: Flame },
            { label: "Completed Tasks", value: completedTasks, icon: Target },
            { label: "Journal Entries", value: journalEntries.length, icon: Smile },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.35, ease: "easeOut" }}
              className="card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <stat.icon className="h-5 w-5 text-primary-500" />
              </div>
              <p className="mt-3 text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Habit Streaks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-5 w-5 text-zinc-400" />
            <h2 className="font-semibold">Habit Streaks</h2>
          </div>
          <div className="space-y-3">
            {habitStats
              .sort((a, b) => b.streak.current - a.streak.current)
              .slice(0, 5)
              .map((h) => (
                <div key={h.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{h.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {h.streak.current} / {h.streak.longest} days
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-zinc-500 to-zinc-700 transition-all duration-500"
                        style={{
                          width: `${h.streak.longest > 0 ? (h.streak.current / h.streak.longest) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            {habitStats.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No habit data yet</p>
            )}
          </div>
        </motion.div>

        {/* Mood Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-4">             <Smile className="h-5 w-5 text-zinc-400" />
            <h2 className="font-semibold">Mood Distribution</h2>
          </div>
          <div className="space-y-4">
            {moodDistribution.map((mood) => {
              const total = journalEntries.length || 1;
              const percentage = Math.round((mood.count / total) * 100);
              return (
                <div key={mood.value} className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center">{mood.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{mood.label}</span>
                      <span className="text-xs text-muted-foreground">{mood.count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: mood.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {journalEntries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No journal data yet</p>
            )}
          </div>
        </motion.div>

        {/* Weekly Habit Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-zinc-400" />
            <h2 className="font-semibold">Habit Activity (7 Days)</h2>
          </div>
          <div className="flex items-end justify-between gap-2 h-32">
            {last7Days.map((date, i) => {
              const count = weeklyHabitData.find((d) => d.date === date)?.count || 0;
              const max = Math.max(...weeklyHabitData.map((d) => d.count), 1);
              const height = Math.max((count / max) * 100, 4);
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium">{count}</span>
                  <div
                    className="w-full rounded-lg bg-zinc-500 transition-all duration-500"
                    style={{ height: `${height}%`, opacity: 0.3 + (count / max) * 0.7 }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(date).toLocaleString("default", { weekday: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Weekly Task Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-zinc-400" />
            <h2 className="font-semibold">Task Completion (7 Days)</h2>
          </div>
          <div className="flex items-end justify-between gap-2 h-32">
            {last7Days.map((date, i) => {
              const count = weeklyTaskData.find((d) => d.date === date)?.count || 0;
              const max = Math.max(...weeklyTaskData.map((d) => d.count), 1);
              const height = Math.max((count / max) * 100, 4);
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium">{count}</span>
                  <div
                    className="w-full rounded-lg bg-zinc-500 transition-all duration-500"
                    style={{ height: `${height}%`, opacity: 0.3 + (count / max) * 0.7 }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(date).toLocaleString("default", { weekday: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Best Performers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="card"
      >
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-5 w-5 text-zinc-400" />
          <h2 className="font-semibold">Achievements & Highlights</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bestStreakHabit && bestStreakHabit.streak.longest > 0 && (
            <div className="rounded-xl bg-muted p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-5 w-5 text-primary-500" />
                <span className="font-semibold text-sm">Longest Streak</span>
              </div>
              <p className="text-2xl font-bold">{bestStreakHabit.streak.longest} days</p>
              <p className="text-xs text-muted-foreground">{bestStreakHabit.name}</p>
            </div>
          )}
          {avgMood > 0 && (
            <div className="rounded-xl bg-muted p-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-5 w-5 text-primary-500" />
                <span className="font-semibold text-sm">Average Mood</span>
              </div>
              <p className="text-2xl font-bold">
                {avgMood >= 75 ? "😊" : avgMood >= 50 ? "😐" : "😔"}
              </p>
              <p className="text-xs text-muted-foreground">
                {avgMood >= 75 ? "Positive" : avgMood >= 50 ? "Neutral" : "Low"}
              </p>
            </div>
          )}
          <div className="rounded-xl bg-muted p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-primary-500" />
              <span className="font-semibold text-sm">Task Completion</span>
            </div>
            <p className="text-2xl font-bold">
              {pendingTasks + completedTasks > 0
                ? `${Math.round((completedTasks / (pendingTasks + completedTasks)) * 100)}%`
                : "0%"}
            </p>
            <p className="text-xs text-muted-foreground">
              {completedTasks} done · {pendingTasks} pending
            </p>
          </div>
        </div>
      </motion.div>

      {habits.length === 0 && journalEntries.length === 0 && tasks.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No data yet</h3>
          <p className="text-sm text-muted-foreground">
            Start using habits, tasks, and journal to see your analytics
          </p>
        </motion.div>
      )}
    </div>
  );
}
