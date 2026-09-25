"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Heart,
  Sparkles,
  Flame,
  Search,
  Plus,
  X,
  Check,
  Link as LinkIcon,
} from "lucide-react";
import { MoodFace } from "@/components/MoodFace";
import { Wellness } from "@/components/journal/Wellness";
import { storage } from "@/lib/storage";
import { useHydrated, useFirstVisit } from "@/lib/use-hydrated";
import { ai } from "@/lib/ai";
import { cn, getToday, formatDate, getMoodScore } from "@/lib/utils";
import { Mood, JournalEntry, MOODS, ReflectionPrompt } from "@/types";
import { useI18n } from "@/lib/i18n";
import { Highlight } from "@/components/Highlight";
import NextLink from "next/link";
import { rebuildGraph } from "@/lib/graph/engine";


export default function JournalPage() {
  const { t } = useI18n();
  const [data, setData] = useState(storage.getData());
  const hydrated = useHydrated();
  const enter = useFirstVisit("journal");
  const [search, setSearch] = useState("");
  const [showEntry, setShowEntry] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tab, setTab] = useState<"journal" | "wellness">("journal");

  const refresh = () => setData({ ...storage.getData() });
  useEffect(() => storage.subscribe(() => setData({ ...storage.getData() })), []);

  const today = getToday();

  // Normalize entries written by older app versions that may lack title/gratitude.
  const allEntries = (data.journalEntries || []).map((e) => ({
    ...e,
    title: e.title ?? "",
    content: e.content ?? "",
    gratitude: Array.isArray(e.gratitude) ? e.gratitude : [],
  }));

  const todayEntry = allEntries.find((e) => e.date === today);

  const entries = allEntries
    .filter((e) => {
      if (search) {
        const q = search.toLowerCase();
        return e.content.toLowerCase().includes(q) || e.title.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const monthEntries = allEntries.filter((e) => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const avgMood = monthEntries.length > 0
    ? monthEntries.reduce((sum, e) => sum + getMoodScore(e.mood), 0) / monthEntries.length
    : 0;

  const journalStreak = storage.getJournalStreak();

  const BS = String.fromCharCode(92); // backslash
  const W = BS + "b"; // word boundary \b

  // Phase 2: tasks whose title appears in an entry's text (word-boundary match, 4+ chars to avoid false positives).
  const mentionsFor = (content: string) => {
    const lower = content.toLowerCase();
    return data.tasks
      .filter((tk) => {
        if (tk.status === "archived" || !tk.title) return false;
        const title = tk.title.trim();
        if (title.length < 4) return false;
        const esc = title.replace(new RegExp("[" + BS + "^$*+?()[{|." + "]"), function () { return BS + "$&"; });
        return new RegExp(W + esc.toLowerCase() + W).test(lower);
      })
      .slice(0, 3);
  };

  // Hydration gate: the SSR tree shows default data, then hydration swaps
  // in real localStorage data and replays every entrance animation —
  // the "blocks double load" flicker. Show a static skeleton until
  // mounted; real content then mounts once, cleanly.
  if (!hydrated) {
    return (
      <div className="relative space-y-6 md:space-y-8" aria-busy="true" aria-live="polite">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
            <div className="h-3 w-56 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-24 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="relative space-y-6 md:space-y-8">

      {/* Header */}
      <motion.div
        initial={enter ? { opacity: 0, y: 12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex items-start justify-between gap-4 relative"
      >
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-none">{t("journal.title")}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xs">
            {t("journal.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Streak badge */}
          {journalStreak.current > 0 && (
            <div className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 md:px-3 md:py-2">
              <Flame className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="hidden md:block">
                <span className="text-sm font-medium">{journalStreak.current}</span>
                <span className="text-[10px] text-muted-foreground/60 ml-0.5">{journalStreak.current > 1 ? t("journal.days") : t("journal.day")}</span>
              </div>
            </div>
          )}
          <button
            onClick={() => { setSelectedDate(today); setShowEntry(true); }}
            className="flex items-center gap-2 rounded-xl border border-foreground/20 bg-background/40 px-3.5 py-2 text-sm font-medium text-foreground/60 backdrop-blur-md transition-all hover:border-foreground/40 hover:text-foreground active:scale-95"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">
              {todayEntry ? t("journal.editToday") : t("journal.writeToday")}
            </span>
          </button>
        </div>
      </motion.div>

      {/* Tab pill - Journal / Wellness */}
      <div className="inline-flex items-center rounded-full border border-border bg-muted/40 p-1" role="tablist">
        {(["journal", "wellness"] as const).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all active:scale-95",
              tab === key
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            )}
          >
            {t(key === "journal" ? "journal.tabJournal" : "journal.tabWellness")}
          </button>
        ))}
      </div>

      {tab === "journal" && (
        <>
      {/* Mood Overview - faces + counts in one block */}
      <motion.div
        initial={enter ? { opacity: 0, y: 12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35, ease: "easeOut" }}
        className="relative"
      >
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MoodFace mood="good" className="h-5 w-5 text-primary-500" />
              <h2 className="font-semibold tracking-tight">{t("journal.thisMonth")}</h2>
            </div>
            <div className="flex items-center gap-2">
              <MoodFace mood={avgMood >= 75 ? "amazing" : avgMood >= 50 ? "neutral" : "bad"} className="h-4 w-4 text-primary-500" />
              <span className="text-sm font-medium">
                {avgMood >= 75 ? t("journal.positive") : avgMood >= 50 ? t("journal.neutral") : t("journal.low")}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {MOODS.map((mood) => {
              const count = monthEntries.filter((e) => e.mood === mood.value).length;
              const total = monthEntries.length || 1;
              const percentage = Math.round((count / total) * 100);
              return (
                <div
                  key={mood.value}
                  className="flex flex-col items-center rounded-xl border border-border bg-muted/30 px-1 py-3 transition-colors hover:border-primary-500/30"
                >
                  <MoodFace mood={mood.value} className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
                  <span className="mt-1.5 text-lg font-bold tabular-nums leading-none">{count}</span>
                  <span className="mt-1 text-[10px] text-muted-foreground/70 uppercase tracking-wider">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Search */}      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("journal.search")}
          className="input-field pl-9"
        />
      </div>

      {/* Today's Entry Preview */}
      {todayEntry && (
        <motion.div
          initial={enter ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="card relative"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                <MoodFace mood={todayEntry.mood} className="h-5 w-5 text-muted-foreground" />
              </span>
              <div>
                <h3 className="font-semibold tracking-tight">{t("journal.todaysEntry")}</h3>
                <p className="text-xs text-muted-foreground">{formatDate(today)}</p>
              </div>
            </div>
            <button onClick={() => { setSelectedDate(today); setShowEntry(true); }} className="btn-ghost text-sm">
              {t("journal.edit")}
            </button>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{todayEntry.content}</p>
          {mentionsFor(todayEntry.content).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {mentionsFor(todayEntry.content).map((tk) => (
                <NextLink key={tk.id} href="/tasks" className="tag inline-flex items-center gap-1 bg-primary-500/10 text-primary-500 text-xs hover:bg-primary-500/20 transition-colors">
                  <LinkIcon className="h-3 w-3" />
                  {t("journal.youMentioned")}: {tk.title}
                </NextLink>
              ))}
            </div>
          )}
          {todayEntry.gratitude.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {todayEntry.gratitude.map((g, i) => (
                <span key={i} className="tag inline-flex items-center gap-1 bg-muted text-muted-foreground text-xs">
                  <Heart className="h-3 w-3" />
                  {g}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Entries Timeline - grouped by month */}
      <div className="space-y-6">
        {(() => {
          const groups: { label: string; entries: typeof entries }[] = [];
          for (const entry of entries) {
            const d = new Date(entry.date);
            const label = d.toLocaleString("default", { month: "long", year: "numeric" });
            const last = groups[groups.length - 1];
            if (last && last.label === label) last.entries.push(entry);
            else groups.push({ label, entries: [entry] });
          }
          return groups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </h3>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-4">
                {group.entries.map((entry, i) => {
                  const mood = MOODS.find((m) => m.value === entry.mood);
                  return (
                    <motion.div
                      key={entry.id}
                      initial={enter ? { opacity: 0, y: 12 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * i, duration: 0.35, ease: "easeOut" }}
                      className="card cursor-pointer transition-all hover:bg-secondary/50"
                      onClick={() => { setSelectedDate(entry.date); setShowEntry(true); }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                          <MoodFace mood={mood?.value ?? "neutral"} className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold"><Highlight text={entry.title || formatDate(entry.date, "MMMM d, yyyy")} query={search} /></h3>
                            <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2"><Highlight text={entry.content} query={search} /></p>
                          {mentionsFor(entry.content).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {mentionsFor(entry.content).map((tk) => (
                                <NextLink key={tk.id} href="/tasks" className="tag inline-flex items-center gap-1 bg-primary-500/10 text-primary-500 text-[10px] hover:bg-primary-500/20 transition-colors">
                                  <LinkIcon className="h-2.5 w-2.5" />
                                  {t("journal.youMentioned")}: {tk.title}
                                </NextLink>
                              ))}
                            </div>
                          )}
                          {entry.gratitude.length > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                              <Heart className="h-3 w-3" />
                              <span>{entry.gratitude.length} {entry.gratitude.length !== 1 ? t("journal.gratefulThoughtsPlural") : t("journal.gratefulThoughts")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ));
        })()}
      </div>

      {entries.length === 0 && (
        <motion.div
          initial={enter ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold tracking-tight mb-1">
            {search ? t("journal.noEntriesFound") : t("journal.noEntries")}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? t("journal.tryDifferent") : t("journal.startJourney")}
          </p>
          {!search && (
            <button onClick={() => { setSelectedDate(today); setShowEntry(true); }} className="flex items-center gap-2 rounded-xl border border-foreground/20 bg-background/40 px-3.5 py-2 text-sm font-medium text-foreground/60 backdrop-blur-md transition-all hover:border-foreground/40 hover:text-foreground active:scale-95">
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              {t("journal.writeFirst")}
            </button>
          )}
        </motion.div>
      )}
        </>
      )}

      {tab === "wellness" && (
        <motion.div
          initial={enter ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative"
        >
          <Wellness embedded />
        </motion.div>
      )}

      {/* Journal Entry Modal */}
      <AnimatePresence>
        {showEntry && (
          <JournalEntryModal
            date={selectedDate || today}
            existingEntry={selectedDate ? allEntries.find((e) => e.date === selectedDate) : undefined}
            onSave={(entryData) => {
              const entry = storage.createJournalEntry(entryData);
              // Wire mentioned tasks into the Brain graph.
              const lower = (entry.content || "").toLowerCase();
              for (const tk of data.tasks) {
                if (tk.title && tk.title.trim().length >= 3 && lower.includes(tk.title.toLowerCase())) {
                  storage.linkEntities("journal:" + entry.id, "task:" + tk.id);
                }
              }
              rebuildGraph(true);
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
  const { t } = useI18n();
  const [title, setTitle] = useState(existingEntry?.title || "");
  const [content, setContent] = useState(existingEntry?.content || "");
  const [mood, setMood] = useState<Mood>(existingEntry?.mood || "neutral");
  const [gratitude, setGratitude] = useState<string[]>(existingEntry?.gratitude || []);
  const [gratitudeInput, setGratitudeInput] = useState("");
  const [reflectionPrompts, setReflectionPrompts] = useState<ReflectionPrompt[]>(
    existingEntry?.reflectionPrompts || []
  );
  const [draftSaved, setDraftSaved] = useState(false);
  const DRAFT_KEY = "orleia-journal-draft";

  // Restore an unsaved draft when writing a fresh entry
  useEffect(() => {
    if (existingEntry || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d && typeof d === "object") {
        if (d.title) setTitle(d.title);
        if (d.content) setContent(d.content);
        if (d.mood) setMood(d.mood as Mood);
        if (Array.isArray(d.gratitude)) setGratitude(d.gratitude);
      }
    } catch {}
  }, [existingEntry]);

  // Debounced draft autosave - never lose a half-written entry
  useEffect(() => {
    if (existingEntry || typeof window === "undefined") return;
    const t = setTimeout(() => {
      try {
        if (!title.trim() && !content.trim()) {
          localStorage.removeItem(DRAFT_KEY);
          setDraftSaved(false);
          return;
        }
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, content, mood, gratitude }));
        setDraftSaved(true);
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [title, content, mood, gratitude, existingEntry]);

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
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
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
            {existingEntry ? t("journal.editEntry") : t("journal.newEntry")} - {formatDate(date, "MMMM d, yyyy")}
          </h2>
          {draftSaved && !existingEntry && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground/70 shrink-0">
              <Check className="h-3 w-3 text-green-500" /> {t("journal.draftSaved")}
            </span>
          )}
          <button onClick={onClose} className="btn-ghost p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("journal.entryTitle")}
            className="w-full text-lg font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
          />

          {/* Mood */}
          <div>
            <label className="text-sm font-medium mb-2 block">{t("journal.howFeeling")}</label>
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
                  <MoodFace mood={m.value} className="h-7 w-7 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{t("journal.mood" + m.value.charAt(0).toUpperCase() + m.value.slice(1))}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("journal.whatHappened")}
              className="w-full min-h-[200px] bg-muted rounded-xl p-3 border-none outline-none resize-none text-sm leading-relaxed"
            />
          </div>

          {/* Gratitude */}
          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              {t("journal.gratefulFor")}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                value={gratitudeInput}
                onChange={(e) => setGratitudeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGratitude()}
                placeholder={t("journal.gratefulFor")}
                className="input-field flex-1"
              />
              <button onClick={addGratitude} className="btn-primary">{t("common.add")}</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {gratitude.map((g, i) => (
                <span key={i} className="tag inline-flex items-center gap-1 bg-muted text-muted-foreground">
                  <Heart className="h-3 w-3" />
                  {g}
                  <button onClick={() => setGratitude(gratitude.filter((_, j) => j !== i))} className="ml-0.5 hover:text-muted-foreground">
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
                {t("journal.reflectionPrompts")}
              </label>
              <button onClick={addPrompt} className="btn-ghost text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                {t("journal.aiPrompt")}
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
                    placeholder={t("journal.yourReflection")}
                    className="w-full bg-transparent border-none outline-none text-sm resize-none"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">{t("common.cancel")}</button>
            <button
              onClick={() => {
                try { localStorage.removeItem(DRAFT_KEY); } catch {}
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
              {t("journal.saveEntry")}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
