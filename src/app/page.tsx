"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  TrendingUp,
  Target,
  Clock,
  Zap,
  Sparkles,
  Sun,
  Moon,
  Cloud,
  FileText,
  BookOpen,
  ListTodo,
  BarChart3,
  ArrowRight,
  Star,
} from "lucide-react";
import { storage } from "@/lib/storage";
import { ai } from "@/lib/ai";
import { cn, formatDate, getToday, calculateStreak, truncate } from "@/lib/utils";
import { Habit, Task, JournalEntry, Note } from "@/types";
import Link from "next/link";

export default function DashboardPage() {
  const [data, setData] = useState(storage.getData());
  const [greeting, setGreeting] = useState("Good morning");
  const [focusSuggestion, setFocusSuggestion] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
    setFocusSuggestion(ai.generateFocusSuggestion());
  }, []);

  const refresh = () => setData({ ...storage.getData() });

  const today = getToday();
  const todayTasks = data.tasks.filter(
    (t) => t.dueDate === today && t.status !== "archived"
  );
  const todayDone = todayTasks.filter((t) => t.status === "done").length;
  const todayHabits = data.habits
    .filter((h) => !h.archived)
    .map((h) => ({
      ...h,
      logged: storage.isHabitLogged(h.id, today),
      streak: calculateStreak(storage.getHabitLogDates(h.id)),
    }));
  const todayHabitLogs = data.habitLogs.filter((l) => l.date === today).length;
  const todayJournal = data.journalEntries.find((e) => e.date === today);
  const recentNotes = data.notes
    .filter((n) => !n.archived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);
  const weekTasks = data.tasks.filter(
    (t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return d >= now && d <= weekEnd && t.status !== "archived";
    }
  );

  const totalHabits = data.habits.filter((h) => !h.archived).length;
  const completedToday = todayHabits.filter((h) => h.logged).length;
  const habitScore = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
  const taskScore = todayTasks.length > 0 ? Math.round((todayDone / todayTasks.length) * 100) : 0;
  const productivityScore = Math.round((habitScore + taskScore) / 2);

  const weekHabitLogs = data.habitLogs.filter((l) => {
    const d = new Date(l.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold md:text-3xl">{greeting}!</h1>
            {new Date().getHours() < 12 ? (
              <Sun className="h-6 w-6 text-zinc-400" />
            ) : new Date().getHours() < 17 ? (
              <Cloud className="h-6 w-6 text-zinc-400" />
            ) : (
              <Moon className="h-6 w-6 text-zinc-400" />
            )}
          </div>
          <p className="text-muted-foreground">{formatDate(new Date(), "EEEE, MMMM d")}</p>
        </div>
      </motion.div>

      {/* Productivity Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card-glass"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary-500" />
              <h2 className="font-semibold">Productivity Score</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {productivityScore >= 80
                ? "Outstanding day! 🌟"
                : productivityScore >= 50
                ? "Good progress! 💪"
                : "Let's pick up the pace! 🚀"}
            </p>
          </div>
          <div className="relative flex h-20 w-20 items-center justify-center">
            <svg className="h-20 w-20 -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="6"
                className="text-muted-foreground/10" />
              <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - productivityScore / 100)}`}
                className="text-primary-500 transition-all duration-1000"
                strokeLinecap="round" />
            </svg>
            <span className="absolute text-lg font-bold">{productivityScore}</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Habits Today", value: `${completedToday}/${totalHabits}`, icon: CheckCircle2, color: "text-zinc-400", bg: "bg-zinc-400/10" },
          { label: "Tasks Today", value: `${todayDone}/${todayTasks.length}`, icon: Target, color: "text-zinc-400", bg: "bg-zinc-400/10" },
          { label: "Week Habits", value: `${weekHabitLogs}`, icon: TrendingUp, color: "text-zinc-400", bg: "bg-zinc-400/10" },
          { label: "Journal", value: todayJournal ? "Written ✍️" : "Not yet", icon: BookOpen, color: "text-zinc-400", bg: "bg-zinc-400/10" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Habits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary-500" />
              <h2 className="font-semibold">Today's Habits</h2>
            </div>
            <Link href="/habits" className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {todayHabits.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No habits yet. <Link href="/habits" className="text-primary-500 hover:underline">Create one!</Link>
              </p>
            ) : (
              todayHabits.slice(0, 5).map((habit) => (
                <button
                  key={habit.id}
                  onClick={() => {
                    if (habit.logged) storage.unlogHabit(habit.id, today);
                    else storage.logHabit(habit.id, today);
                    refresh();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                    habit.logged
                      ? "bg-zinc-500/10 text-zinc-400"
                      : "hover:bg-secondary text-foreground"
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium",
                    habit.logged ? "bg-zinc-500/20" : "bg-muted"
                  )}>
                    {habit.logged ? "✓" : habit.icon || "○"}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={cn("text-sm font-medium", habit.logged && "line-through")}>{habit.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {habit.streak.current > 0 ? `${habit.streak.current} day streak` : "Start today!"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </motion.div>

        {/* Tasks Due Today */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary-500" />
              <h2 className="font-semibold">Tasks Today</h2>
            </div>
            <Link href="/tasks" className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {todayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No tasks for today. <Link href="/tasks" className="text-primary-500 hover:underline">Add one!</Link>
              </p>
            ) : (
              todayTasks.slice(0, 5).map((task) => (
                <button
                  key={task.id}
                  onClick={() => {
                    storage.toggleTask(task.id);
                    refresh();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 text-left",
                    task.status === "done" ? "opacity-60" : "hover:bg-secondary"
                  )}
                >
                  <div className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                    task.status === "done"
                      ? "border-zinc-500 bg-zinc-500"
                      : "border-muted-foreground/30"
                  )}>
                    {task.status === "done" && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", task.status === "done" && "line-through text-muted-foreground")}>
                      {task.title}
                    </p>
                  </div>
                  {task.priority === "urgent" && (
                    <span className="tag bg-zinc-500/10 text-zinc-400">Urgent</span>
                  )}
                </button>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-500" />
              <h2 className="font-semibold">Recent Notes</h2>
            </div>
            <Link href="/notes" className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No notes yet. <Link href="/notes" className="text-primary-500 hover:underline">Create one!</Link>
              </p>
            ) : (
              recentNotes.map((note) => (
                <Link
                  key={note.id}
                  href="/notes"
                  className="flex items-start gap-3 rounded-xl p-3 hover:bg-secondary transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10">
                    <FileText className="h-4 w-4 text-primary-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{truncate(note.title, 40)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {truncate(note.content.replace(/<[^>]*>/g, ""), 60)}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDate(note.updatedAt)}
                    </p>
                  </div>
                  {note.pinned && <Star className="h-3.5 w-3.5 text-zinc-400 fill-zinc-400 shrink-0" />}
                </Link>
              ))
            )}
          </div>
        </motion.div>

        {/* AI Focus Suggestion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card bg-gradient-to-br from-zinc-500/5 to-zinc-700/5 border-zinc-700/20"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-primary-subtle shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold mb-1">AI Focus Suggestion</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{focusSuggestion}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <Zap className="h-3 w-3 text-zinc-400" />
            <span className="text-gradient-orange">Powered by LEXIS AI</span>
          </div>
        </motion.div>
      </div>

      {/* Quick Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card-glass flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary-500" />
          <span className="text-sm font-medium">Weekly Progress</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{weekHabitLogs} habits</span>
          <span>·</span>
          <span>{todayDone}/{todayTasks.length} tasks</span>
          <span>·</span>
          <span>{todayJournal ? "Journaled" : "No journal"}</span>
        </div>
      </motion.div>
    </div>
  );
}
