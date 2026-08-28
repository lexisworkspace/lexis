"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  CheckCircle2,
  Flame,
  Calendar,
  Target,
  TrendingUp,
  Trash2,
  Edit3,
  X,
  Sparkles,
  MoreHorizontal,
  BarChart3,
  Zap,
} from "lucide-react";
import { storage } from "@/lib/storage";
import { ai } from "@/lib/ai";
import { cn, getToday, calculateStreak, formatDate, getDaysInMonth, hexToRgba } from "@/lib/utils";
import { Habit, HabitFrequency, HabitTimeOfDay, DAYS_OF_WEEK } from "@/types";
import { useI18n } from "@/lib/i18n";
import { HABIT_ICONS, TIME_OF_DAY_ICONS, habitIconFor, habitIconName } from "@/lib/habit-icons";

const WEEK_HEADER = ["M", "T", "W", "T", "F", "S", "S"];
// Monday-first offset: getDay() is 0=Sun..6=Sat, so (getDay()+6)%7 gives 0=Mon
const monthPad = (year: number, month: number) => (new Date(year, month, 1).getDay() + 6) % 7;

export default function HabitsPage() {
  const { t } = useI18n();
  const [data, setData] = useState(storage.getData());
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  const refresh = () => setData({ ...storage.getData() });
  useEffect(() => storage.subscribe(() => setData({ ...storage.getData() })), []);
  const today = getToday();

  const habits = data.habits.filter((h) => !h.archived);
  const categories = data.habitCategories;

  const getHabitStats = (habitId: string) => {
    const dates = storage.getHabitLogDates(habitId);
    const streak = calculateStreak(dates);
    const monthLogs = dates.filter((d) => {
      const date = new Date(d);
      return date.getMonth() === viewMonth && date.getFullYear() === viewYear;
    });
    const daysInMonth = getDaysInMonth(viewYear, viewMonth).length;
    return { dates, streak, monthLogs: monthLogs.length, daysInMonth };
  };

  const selectedHabitData = selectedHabit ? habits.find((h) => h.id === selectedHabit) : null;
  const selectedStats = selectedHabit ? getHabitStats(selectedHabit) : null;

  return (
    <div className="relative space-y-6 md:space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex items-start justify-between relative"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-none">{t("habits.title")}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xs">
            {t("habits.subtitle")}
          </p>
        </div>
        <button onClick={() => { setEditingHabit(null); setShowForm(true); }} className="btn-primary flex items-center gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("habits.newHabit")}</span>
        </button>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35, ease: "easeOut" }}
        className="relative"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t("habits.active"), value: habits.length, icon: CheckCircle2 },
            { label: t("common.today"), value: data.habitLogs.filter((l) => l.date === today).length, icon: Target },
            { label: t("habits.thisMonth"), value: data.habitLogs.filter((l) => {
              const d = new Date(l.date);
              return d.getMonth() === new Date().getMonth();
            }).length, icon: Calendar },
            { label: t("habits.bestStreak"), value: Math.max(...habits.map((h) => calculateStreak(storage.getHabitLogDates(h.id)).longest), 0), icon: Flame },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05, duration: 0.35, ease: "easeOut" }} className="card">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <stat.icon className="h-5 w-5 text-primary-500" />
              </div>
              <p className="mt-3 text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Habits Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {habits.map((habit, i) => {
          const stats = getHabitStats(habit.id);
          const logged = storage.isHabitLogged(habit.id, today);
          const category = categories.find((c) => c.id === habit.categoryId);
          const IconComp = habitIconFor(habit.icon);
          const completionRate = stats.daysInMonth > 0 ? Math.round((stats.monthLogs / stats.daysInMonth) * 100) : 0;

          return (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className={cn(
                "card cursor-pointer transition-all duration-200",
                selectedHabit === habit.id && "ring-2 ring-primary-500"
              )}
              onClick={() => setSelectedHabit(selectedHabit === habit.id ? null : habit.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: hexToRgba(category?.color || "#a1a1aa", 0.1) }}>
                    <IconComp className="h-5 w-5" style={{ color: category?.color || "#a1a1aa" }} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{habit.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">
                      {habit.frequency === "custom" && habit.customDays?.length
                        ? habit.customDays.map((d) => DAYS_OF_WEEK[d]).join(", ")
                        : t("habits." + habit.frequency)} · {t("habits." + habit.timeOfDay)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); storage.logHabit(habit.id, today); refresh(); }}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                    logged
                      ? "bg-muted text-muted-foreground scale-110"
                      : "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground"
                  )}
                >
                  <CheckCircle2 className="h-5 w-5" />
                </button>
              </div>

              {/* Progress Ring */}
              <div className="flex items-center gap-4 mb-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                  <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90 overflow-visible">
                    <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="4"
                      className="text-muted-foreground/10" />
                    <circle cx="24" cy="24" r="18" fill="none" stroke={category?.color || "#a1a1aa"} strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 18}`}
                      strokeDashoffset={`${2 * Math.PI * 18 * (1 - completionRate / 100)}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums">{completionRate}%</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Flame className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{stats.streak.current} {t("habits.dayStreak")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("habits.bestDays")} {stats.streak.longest} {t("analytics.days")} · {stats.monthLogs} {t("habits.thisMonthCount")}
                  </p>
                </div>
              </div>

              {/* Month heatmap - real month grid, green, compact */}
              <div>
                <div className="grid grid-cols-7 gap-[3px]">
                  {WEEK_HEADER.map((d, i) => (
                    <span key={i} className="text-center text-[8px] text-muted-foreground/40">{d}</span>
                  ))}
                  {Array.from({ length: monthPad(viewYear, viewMonth) }).map((_, i) => (
                    <div key={`pad-${i}`} />
                  ))}
                  {getDaysInMonth(viewYear, viewMonth).map((date) => {
                    const dateStr = date.toISOString().split("T")[0];
                    const isLogged = stats.dates.includes(dateStr);
                    const isToday = dateStr === today;
                    return (
                      <div
                        key={dateStr}
                        title={`${formatDate(date)}: ${isLogged ? t("habits.done") : t("habits.notDone")}`}
                        className={cn(
                          "h-2.5 w-full rounded-[3px]",
                          isLogged ? "bg-emerald-500" : isToday ? "border border-emerald-500/60" : "bg-muted"
                        )}
                      />
                    );
                  })}
                </div>
              </div>

              {/* AI Motivation */}
              {stats.streak.current >= 3 && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-primary-500/5 px-3 py-2">
                  <Sparkles className="h-3 w-3 text-primary-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{ai.generateMotivation(habit, stats.streak.current)}</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {habits.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">{t("habits.noHabits")}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t("habits.startFirst")}</p>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t("habits.createHabit")}
          </button>
        </motion.div>
      )}        {/* Selected Habit Detail */}
      <AnimatePresence>
        {selectedHabit && selectedHabitData && selectedStats && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="card relative"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold tracking-tight">{selectedHabitData.name}</h3>
                <div className="flex items-center gap-1 text-sm">
                  <Flame className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedStats.streak.current} {t("habits.dayStreak")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditingHabit(selectedHabitData); setShowForm(true); }} className="btn-ghost p-2">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button onClick={() => { storage.deleteHabit(selectedHabit); setSelectedHabit(null); refresh(); }} className="btn-ghost p-2 text-muted-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
                <button onClick={() => setSelectedHabit(null)} className="btn-ghost p-2">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl bg-muted p-3 text-center">
                <p className="text-2xl font-bold">{selectedStats.streak.current}</p>
                <p className="text-xs text-muted-foreground">{t("habits.currentStreak")}</p>
              </div>
              <div className="rounded-xl bg-muted p-3 text-center">
                <p className="text-2xl font-bold">{selectedStats.streak.longest}</p>
                <p className="text-xs text-muted-foreground">{t("habits.bestStreak")}</p>
              </div>
              <div className="rounded-xl bg-muted p-3 text-center">
                <p className="text-2xl font-bold">{selectedStats?.dates.length || 0}</p>
                <p className="text-xs text-muted-foreground">{t("habits.total")}</p>
              </div>
            </div>

            {/* Heatmap - real month grid, green, compact */}
            <div>
              <h4 className="text-sm font-medium mb-3">
                {new Date(viewYear, viewMonth).toLocaleString("default", { month: "long", year: "numeric" })}
              </h4>
              <div className="grid grid-cols-7 gap-[3px]">
                {WEEK_HEADER.map((d, i) => (
                  <span key={i} className="text-center text-[8px] text-muted-foreground/40">{d}</span>
                ))}
                {Array.from({ length: monthPad(viewYear, viewMonth) }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {getDaysInMonth(viewYear, viewMonth).map((date) => {
                  const dateStr = date.toISOString().split("T")[0];
                  const isLogged = selectedStats.dates.includes(dateStr);
                  const isToday = dateStr === today;
                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        "h-3 w-full rounded-[3px]",
                        isLogged
                          ? "bg-emerald-500"
                          : isToday
                          ? "border border-emerald-500/60"
                          : "bg-muted"
                      )}
                      title={`${formatDate(date)}: ${isLogged ? t("habits.done") : t("habits.notDone")}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => {
                  if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
                  else setViewMonth(viewMonth - 1);
                }}
                className="btn-ghost text-sm"
              >
                ← {t("habits.previous")}
              </button>
              <button
                onClick={() => {
                  if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
                  else setViewMonth(viewMonth + 1);
                }}
                className="btn-ghost text-sm"
              >
                {t("habits.next")} →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Habit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <HabitForm
            habit={editingHabit}
            categories={categories}
            onSave={(habitData) => {
              if (editingHabit) {
                storage.updateHabit(editingHabit.id, habitData);
              } else {
                storage.createHabit(habitData as any);
              }
              refresh();
              setShowForm(false);
            }}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function HabitForm({
  habit,
  categories,
  onSave,
  onClose,
}: {
  habit: Habit | null;
  categories: { id: string; name: string; color: string }[];
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(habit?.name || "");
  const [description, setDescription] = useState(habit?.description || "");
  const [categoryId, setCategoryId] = useState(habit?.categoryId || categories[0]?.id || "health");
  const [frequency, setFrequency] = useState<HabitFrequency>(habit?.frequency || "daily");
  const [customDays, setCustomDays] = useState<number[]>(habit?.customDays || []);
  const [timeOfDay, setTimeOfDay] = useState<HabitTimeOfDay>(habit?.timeOfDay || "morning");
  const [icon, setIcon] = useState(habitIconName(habit?.icon));

  const toggleDay = (day: number) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{habit ? t("habits.editHabit") : t("habits.newHabit")}</h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("habits.icon")}</label>
            <div className="grid grid-cols-6 gap-1.5">
              {HABIT_ICONS.map(({ name, label, Icon }) => (
                <button
                  key={name}
                  type="button"
                  title={label}
                  onClick={() => setIcon(name)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
                    icon === name ? "bg-primary-500/20 ring-2 ring-primary-500 scale-110" : "bg-muted hover:bg-muted/80"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("habits.name")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("habits.name")}
              className="input-field"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("habits.descOptional")}</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("habits.descOptional")}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("habits.category")}</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-field">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("habits.frequency")}</label>
              <select value={frequency} onChange={(e) => { setFrequency(e.target.value as HabitFrequency); setCustomDays([]); }} className="input-field">
                <option value="daily">{t("habits.daily")}</option>
                <option value="custom">{t("habits.customDays")}</option>
                <option value="weekly">{t("habits.weekly")}</option>
                <option value="monthly">{t("habits.monthly")}</option>
              </select>
            </div>
          </div>

          {frequency === "custom" && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("habits.repeatOn")}</label>
              <div className="flex gap-1.5">
                {DAYS_OF_WEEK.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-all",
                      customDays.includes(idx)
                        ? "bg-primary-500 text-white ring-2 ring-primary-500/30 scale-110"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("habits.timeOfDay")}</label>
            <div className="grid grid-cols-4 gap-1.5">
              {TIME_OF_DAY_ICONS.map(({ value, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTimeOfDay(value as HabitTimeOfDay)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg py-2 transition-all",
                    timeOfDay === value ? "bg-primary-500/20 ring-2 ring-primary-500" : "bg-muted hover:bg-muted/80"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px]">{t("habits." + value)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">{t("common.cancel")}</button>
            <button
              onClick={() => {
                if (!name.trim()) return;
                onSave({ name, description, categoryId, frequency, customDays: frequency === "custom" ? customDays : [], timeOfDay, icon, targetCount: 1, color: "#6366f1" });
              }}
              disabled={!name.trim()}
              className="btn-primary flex-1"
            >
              {habit ? t("habits.saveChanges") : t("habits.createHabit")}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

