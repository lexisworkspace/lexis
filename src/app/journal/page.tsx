"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Heart,
  Sparkles,
  Calendar,
  Search,
  Plus,
  X,
  Smile,
  Meh,
  Frown,
  Sun,
  Moon,
  Star,
} from "lucide-react";
import { storage } from "@/lib/storage";
import { ai } from "@/lib/ai";
import { cn, getToday, formatDate, getMoodScore } from "@/lib/utils";
import { Mood, JournalEntry, MOODS, ReflectionPrompt } from "@/types";

export default function JournalPage() {
  const [data, setData] = useState(storage.getData());
  const [search, setSearch] = useState("");
  const [showEntry, setShowEntry] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const refresh = () => setData({ ...storage.getData() });

  const today = getToday();
  const todayEntry = data.journalEntries.find((e) => e.date === today);

  const entries = data.journalEntries
    .filter((e) => {
      if (search) {
        const q = search.toLowerCase();
        return e.content.toLowerCase().includes(q) || e.title.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const monthEntries = data.journalEntries.filter((e) => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const avgMood = monthEntries.length > 0
    ? monthEntries.reduce((sum, e) => sum + getMoodScore(e.mood), 0) / monthEntries.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Journal</h1>
          <p className="text-muted-foreground mt-1">Reflect, track your mood, and grow</p>
        </div>
        <button
          onClick={() => { setSelectedDate(today); setShowEntry(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">
            {todayEntry ? "Edit Today" : "Write Today"}
          </span>
        </button>
      </motion.div>

      {/* Mood Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Smile className="h-5 w-5 text-primary-500" />
            <h2 className="font-semibold">This Month's Mood</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {avgMood >= 75 ? "😊 Positive" : avgMood >= 50 ? "😐 Neutral" : "😔 Low"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {MOODS.map((mood) => {
            const count = monthEntries.filter((e) => e.mood === mood.value).length;
            const total = monthEntries.length || 1;
            const percentage = Math.round((count / total) * 100);
            return (
              <div key={mood.value} className="flex-1 text-center">
                <div className="text-2xl mb-1">{mood.emoji}</div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: mood.color,
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">{count}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search journal entries..."
          className="input-field pl-9"
        />
      </div>

      {/* Today's Entry Preview */}
      {todayEntry && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card border-primary-500/20 bg-gradient-to-br from-primary-500/5 to-purple-500/5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{MOODS.find((m) => m.value === todayEntry.mood)?.emoji}</span>
              <div>
                <h3 className="font-semibold">Today's Entry</h3>
                <p className="text-xs text-muted-foreground">{formatDate(today)}</p>
              </div>
            </div>
            <button onClick={() => { setSelectedDate(today); setShowEntry(true); }} className="btn-ghost text-sm">
              Edit
            </button>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3">{todayEntry.content}</p>
          {todayEntry.gratitude.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {todayEntry.gratitude.map((g, i) => (
                <span key={i} className="tag bg-zinc-500/10 text-zinc-400 text-xs">
                  🙏 {g}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Entries Timeline */}
      <div className="space-y-4">
        {entries.map((entry, i) => {
          const mood = MOODS.find((m) => m.value === entry.mood);
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i }}
              className="card cursor-pointer hover:shadow-md transition-all"
              onClick={() => { setSelectedDate(entry.date); setShowEntry(true); }}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-xl">
                  {mood?.emoji || "📝"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold">{entry.title || formatDate(entry.date, "MMMM d, yyyy")}</h3>
                    <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{entry.content}</p>
                  {entry.gratitude.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-zinc-400">
                      <Heart className="h-3 w-3" />
                      <span>{entry.gratitude.length} grateful thought{entry.gratitude.length !== 1 ? "s" : ""}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {entries.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {search ? "No entries found" : "No journal entries yet"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? "Try a different search" : "Start your journaling journey today!"}
          </p>
          {!search && (
            <button onClick={() => { setSelectedDate(today); setShowEntry(true); }} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Write First Entry
            </button>
          )}
        </motion.div>
      )}

      {/* Journal Entry Modal */}
      <AnimatePresence>
        {showEntry && (
          <JournalEntryModal
            date={selectedDate || today}
            existingEntry={selectedDate ? data.journalEntries.find((e) => e.date === selectedDate) : undefined}
            onSave={(entryData) => {
              storage.createJournalEntry(entryData);
              refresh();
              setShowEntry(false);
            }}
            onClose={() => setShowEntry(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function JournalEntryModal({
  date,
  existingEntry,
  onSave,
  onClose,
}: {
  date: string;
  existingEntry?: JournalEntry;
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(existingEntry?.title || "");
  const [content, setContent] = useState(existingEntry?.content || "");
  const [mood, setMood] = useState<Mood>(existingEntry?.mood || "neutral");
  const [gratitude, setGratitude] = useState<string[]>(existingEntry?.gratitude || []);
  const [gratitudeInput, setGratitudeInput] = useState("");
  const [reflectionPrompts, setReflectionPrompts] = useState<ReflectionPrompt[]>(
    existingEntry?.reflectionPrompts || []
  );

  const addGratitude = () => {
    if (gratitudeInput.trim()) {
      setGratitude([...gratitude, gratitudeInput.trim()]);
      setGratitudeInput("");
    }
  };

  const addPrompt = () => {
    const question = ai.generateReflectionPrompt();
    setReflectionPrompts([...reflectionPrompts, { question, answer: "" }]);
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
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-semibold">
            {existingEntry ? "Edit Entry" : "New Entry"} — {formatDate(date, "MMMM d, yyyy")}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Entry title..."
            className="w-full text-lg font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
          />

          {/* Mood */}
          <div>
            <label className="text-sm font-medium mb-2 block">How are you feeling?</label>
            <div className="flex gap-3">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl p-3 transition-all",
                    mood === m.value
                      ? "bg-primary-500/10 ring-2 ring-primary-500 scale-105"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What happened today? How do you feel? What did you learn?"
            className="w-full min-h-[200px] bg-muted rounded-xl p-3 border-none outline-none resize-none text-sm leading-relaxed"
          />

          {/* Gratitude */}
          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Heart className="h-4 w-4 text-zinc-400" />
              What are you grateful for?
            </label>
            <div className="flex gap-2 mb-2">
              <input
                value={gratitudeInput}
                onChange={(e) => setGratitudeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGratitude()}
                placeholder="I'm grateful for..."
                className="input-field flex-1"
              />
              <button onClick={addGratitude} className="btn-primary">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {gratitude.map((g, i) => (
                <span key={i} className="tag bg-zinc-500/10 text-zinc-400">
                  🙏 {g}
                  <button onClick={() => setGratitude(gratitude.filter((_, j) => j !== i))} className="ml-1 hover:text-zinc-400">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Reflection Prompts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary-500" />
                Reflection Prompts
              </label>
              <button onClick={addPrompt} className="btn-ghost text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Prompt
              </button>
            </div>
            <div className="space-y-3">
              {reflectionPrompts.map((prompt, i) => (
                <div key={i} className="rounded-xl bg-primary-500/5 border border-primary-500/10 p-3">
                  <p className="text-sm font-medium mb-2">{prompt.question}</p>
                  <textarea
                    value={prompt.answer}
                    onChange={(e) => {
                      const updated = [...reflectionPrompts];
                      updated[i] = { ...updated[i], answer: e.target.value };
                      setReflectionPrompts(updated);
                    }}
                    placeholder="Your reflection..."
                    className="w-full bg-transparent border-none outline-none text-sm resize-none"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => {
                onSave({
                  date,
                  title: title || formatDate(date, "MMMM d, yyyy"),
                  content,
                  mood,
                  gratitude,
                  reflectionPrompts,
                });
              }}
              className="btn-primary flex-1"
            >
              Save Entry
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
