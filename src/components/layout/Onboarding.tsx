"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  FileText,
  BookOpen,
  ListTodo,
  Lock,
  Monitor,
  Moon,
  Shield,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";
import type { AccentColor } from "@/types";
import { storage } from "@/lib/storage";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import type { NoorRelationship } from "@/types";
import { cn } from "@/lib/utils";
import { OrleiaSwitch } from "../switch/OrleiaSwitch";
import { ShellMock } from "./tutorial-mockups";


/* ------------------------------------------------------------------ */
/* Welcome screen: Apple-style typewriter greeting, space to continue  */
/* ------------------------------------------------------------------ */

/* Greetings in the languages Orleia ships in - typed one after another,
   cycling forever until the user continues. */
const GREETINGS: string[] = [
  "welcome",
  "bienvenue",
  "willkommen",
  "bienvenido",
  "benvenuto",
  "bem-vindo",
  "welkom",
  "witaj",
  "hoş geldiniz",
  "ようこそ",
  "欢迎",
  "مرحبًا",
];

function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [fading, setFading] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const word = GREETINGS[idx];
  const done = count >= word.length;
  const advancedRef = useRef(false);

  // Touch devices have no space bar - show a Continue button instead
  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Small beat before the first letter appears
  useEffect(() => {
    const t0 = setTimeout(() => setStarted(true), 500);
    return () => clearTimeout(t0);
  }, []);

  // Typewriter: one letter at a time, then hold before the next language
  useEffect(() => {
    if (!started || fading) return;
    if (count < word.length) {
      const t0 = setTimeout(() => setCount((c) => c + 1), 110);
      return () => clearTimeout(t0);
    }
    const t0 = setTimeout(() => setFading(true), 1800);
    return () => clearTimeout(t0);
  }, [started, fading, count, word]);

  // Fade the finished word out, then start typing the next language
  useEffect(() => {
    if (!fading) return;
    const t0 = setTimeout(() => {
      setIdx((i) => (i + 1) % GREETINGS.length);
      setCount(0);
      setFading(false);
    }, 350);
    return () => clearTimeout(t0);
  }, [fading]);

  // The hint appears once the first word is complete, then stays
  useEffect(() => {
    if (done && !hintShown) setHintShown(true);
  }, [done, hintShown]);

  const advance = useCallback(() => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    onDone();
  }, [onDone]);

  // Space (or Enter / click / tap): fast-forward while typing, continue once done
  const handleAction = useCallback(() => {
    if (!done) {
      setStarted(true);
      setCount(word.length);
      return;
    }
    advance();
  }, [done, advance, word.length]);

  useEffect(() => {
    if (isTouch) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        handleAction();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleAction, isTouch]);

  return (
    <div
      className="fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-background"
      onClick={handleAction}
    >
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="mb-10 text-xs font-sans tracking-[0.5em] text-muted-foreground/40"
      >
        ORLEIA<span className="text-foreground/60">OS</span>
      </motion.p>

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: fading ? 0 : started ? 1 : 0 }}
        transition={{ duration: 0.35 }}
        className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground md:text-6xl"
      >
        <span dir="auto">{word.slice(0, count)}</span>
        {!fading && (
          <span
            className="ml-1 inline-block h-[0.8em] w-[2px] translate-y-[0.06em] animate-pulse bg-foreground/70"
            aria-hidden
          />
        )}
      </motion.h1>

      {/* Fixed-height slot: the hint/button fades in without pushing the word up */}
      <div className="mt-8 flex h-12 items-start justify-center">
        {hintShown &&
          (isTouch ? (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              onClick={(e) => {
                e.stopPropagation();
                advance();
              }}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
            >
              {t("onboarding.continue")}
            </motion.button>
          ) : (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-[11px] font-sans tracking-widest text-muted-foreground/50"
            >
              {t("onboarding.pressSpace")}
            </motion.p>
          ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Age gate: hard minimum-age check before anything else is set up    */
/* ------------------------------------------------------------------ */

const MIN_AGE = 13;
const age = (s: string) => s.replace("{age}", String(MIN_AGE));

function AgeGate({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [underage, setUnderage] = useState(false);

  if (underage) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6 text-center">
        <p className="mb-10 text-xs font-sans tracking-[0.5em] text-muted-foreground/40">
          ORLEIA<span className="text-foreground/60">OS</span>
        </p>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="font-serif text-3xl font-light tracking-tight text-foreground md:text-4xl"
        >
          {t("onboarding.underageTitle")}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground"
        >
          {age(t("onboarding.underageDesc"))}
        </motion.p>
        <button
          onClick={() => setUnderage(false)}
          className="mt-10 text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground"
        >
          {age(t("onboarding.ageConfirm"))}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6 text-center">
      <p className="mb-10 text-xs font-sans tracking-[0.5em] text-muted-foreground/40">
        ORLEIA<span className="text-foreground/60">OS</span>
      </p>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="font-serif text-3xl font-light tracking-tight text-foreground md:text-4xl"
      >
        {t("onboarding.ageTitle")}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground"
      >
        {age(t("onboarding.ageDesc"))}
      </motion.p>
      <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
        <button
          onClick={() => {
            storage.updateProfile({ ageRange: "18-24" });
            onDone();
          }}
          className="w-full rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
        >
          {age(t("onboarding.ageConfirm"))}
        </button>
        <button
          onClick={() => setUnderage(true)}
          className="text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground"
        >
          {age(t("onboarding.ageDeny"))}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* About you: optional profile (everything can be skipped)            */
/* ------------------------------------------------------------------ */

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs transition-all",
        active
          ? "border-amber-500/40 bg-amber-500/10 text-foreground"
          : "border-border bg-secondary/40 text-muted-foreground hover:border-muted-foreground/30"
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-sm font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function ProfilePicker({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const { t } = useI18n();
  const initial = storage.getProfile();
  const [name, setName] = useState(initial.name);
  const [pronouns, setPronouns] = useState(initial.pronouns);
  const [ageRange, setAgeRange] = useState(initial.ageRange);
  const [timezone, setTimezone] = useState(initial.timeZone || "");
  const [workStudy, setWorkStudy] = useState<string[]>(Array.isArray(initial.workStudy) ? initial.workStudy : []);
  const [interests, setInterests] = useState<string[]>(Array.isArray(initial.interests) ? initial.interests : []);
  const [schedule, setSchedule] = useState(initial.schedule);
  const [prodPrefs, setProdPrefs] = useState<string[]>(Array.isArray(initial.productivityPrefs) ? initial.productivityPrefs : []);
  const [commPrefs, setCommPrefs] = useState<string[]>(Array.isArray(initial.communicationPrefs) ? initial.communicationPrefs : []);
  const [goals, setGoals] = useState(initial.goals);
  const [helpWith, setHelpWith] = useState<string[]>(Array.isArray(initial.helpWith) ? initial.helpWith : []);

  const timezones = useMemo(() => {
    try {
      return [...Intl.supportedValuesOf("timeZone")].sort((a, b) => a.localeCompare(b));
    } catch {
      return [
        "UTC",
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "Europe/Madrid",
        "Europe/Warsaw",
        "Europe/Istanbul",
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Sao_Paulo",
        "Asia/Tokyo",
        "Asia/Shanghai",
        "Asia/Dubai",
        "Australia/Sydney",
      ];
    }
  }, []);

  const toggleIn = (arr: string[], key: string): string[] =>
    arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];

  const save = () => {
    storage.updateProfile({
      name: (name || "").trim(),
      pronouns,
      ageRange,
      timeZone: timezone,
      workStudy,
      interests,
      schedule,
      productivityPrefs: prodPrefs,
      communicationPrefs: commPrefs,
      goals: (goals || "").trim(),
      helpWith,
    });
    onDone();
  };

  const none = t("opt.none");

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background">
      <div className="mt-14 flex w-full justify-center md:mt-16">
        <p className="text-xs font-sans tracking-[0.5em] text-muted-foreground/40">
          ORLEIA<span className="text-foreground/60">OS</span>
        </p>
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mt-10 px-6 text-center font-serif text-3xl font-light tracking-tight text-foreground md:text-4xl"
      >
        {t("onboarding.aboutYou")}
      </motion.h1>

      {/* Optional disclaimer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="mx-auto mt-4 max-w-sm px-6 text-center text-xs leading-relaxed text-muted-foreground/70"
      >
        {t("onboarding.aboutYouDesc")}
      </motion.p>

      <div className="mt-7 w-full flex-1 overflow-y-auto px-6 pb-4">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
          <Field label={t("onboarding.name")}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("onboarding.namePh")}
              className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors focus:border-amber-500/40"
            />
          </Field>

          <Field label={t("onboarding.pronouns")}>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "she/her", label: t("opt.sheHer") },
                { key: "he/him", label: t("opt.heHim") },
                { key: "they/them", label: t("opt.theyThem") },
                { key: "", label: none },
              ].map((o) => (
                <Chip key={o.key || "none"} active={pronouns === o.key} onClick={() => setPronouns(o.key)}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label={t("onboarding.ageRange")}>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "13-17", label: t("opt.age1317") },
                { key: "18-24", label: t("opt.age1824") },
                { key: "25-34", label: t("opt.age2534") },
                { key: "35-44", label: t("opt.age3544") },
                { key: "45-54", label: t("opt.age4554") },
                { key: "55+", label: t("opt.age55") },
                { key: "", label: none },
              ].map((o) => (
                <Chip key={o.key || "none"} active={ageRange === o.key} onClick={() => setAgeRange(o.key)}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label={t("onboarding.timezone")}>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-amber-500/40"
            >
              <option value="">{none}</option>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("onboarding.workStudy")}>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "student", label: t("opt.student") },
                { key: "working", label: t("opt.working") },
                { key: "freelance", label: t("opt.freelance") },
                { key: "looking", label: t("opt.looking") },
                { key: "other", label: t("opt.other") },
                { key: "__none__", label: none },
              ].map((o) => (
                <Chip
                  key={o.key}
                  active={o.key === "__none__" ? workStudy.length === 0 : workStudy.includes(o.key)}
                  onClick={() =>
                    o.key === "__none__" ? setWorkStudy([]) : setWorkStudy((w) => toggleIn(w, o.key))
                  }
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label={t("onboarding.interests")}>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "reading", label: t("opt.reading") },
                { key: "fitness", label: t("opt.fitness") },
                { key: "learning", label: t("opt.learning") },
                { key: "tech", label: t("opt.tech") },
                { key: "music", label: t("opt.music") },
                { key: "art", label: t("opt.art") },
                { key: "travel", label: t("opt.travel") },
                { key: "gaming", label: t("opt.gaming") },
                { key: "mindfulness", label: t("opt.mindfulness") },
              ].map((o) => (
                <Chip
                  key={o.key}
                  active={interests.includes(o.key)}
                  onClick={() => setInterests((i) => toggleIn(i, o.key))}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label={t("onboarding.schedule")}>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "early", label: t("opt.early") },
                { key: "night", label: t("opt.night") },
                { key: "9-5", label: t("opt.nineToFive") },
                { key: "irregular", label: t("opt.irregular") },
                { key: "", label: none },
              ].map((o) => (
                <Chip key={o.key || "none"} active={schedule === o.key} onClick={() => setSchedule(o.key)}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label={t("onboarding.prodPrefs")}>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "deepWork", label: t("opt.deepWork") },
                { key: "sprints", label: t("opt.sprints") },
                { key: "checklists", label: t("opt.checklists") },
                { key: "streaks", label: t("opt.streaks") },
                { key: "deadlines", label: t("opt.deadlines") },
              ].map((o) => (
                <Chip
                  key={o.key}
                  active={prodPrefs.includes(o.key)}
                  onClick={() => setProdPrefs((p) => toggleIn(p, o.key))}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label={t("onboarding.commPrefs")}>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "direct", label: t("opt.direct") },
                { key: "concise", label: t("opt.concise") },
                { key: "encouraging", label: t("opt.encouraging") },
                { key: "detailed", label: t("opt.detailed") },
              ].map((o) => (
                <Chip
                  key={o.key}
                  active={commPrefs.includes(o.key)}
                  onClick={() => setCommPrefs((c) => toggleIn(c, o.key))}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label={t("onboarding.goals")}>
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder={t("onboarding.goalsPh")}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors focus:border-amber-500/40"
            />
          </Field>

          <Field label={t("onboarding.helpWith")}>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "habits", label: t("opt.helpHabits") },
                { key: "focus", label: t("opt.helpFocus") },
                { key: "planning", label: t("opt.helpPlanning") },
                { key: "journaling", label: t("opt.helpJournaling") },
                { key: "organization", label: t("opt.helpOrganization") },
                { key: "wellbeing", label: t("opt.helpWellbeing") },
                { key: "learning", label: t("opt.helpLearning") },
              ].map((o) => (
                <Chip
                  key={o.key}
                  active={helpWith.includes(o.key)}
                  onClick={() => setHelpWith((h) => toggleIn(h, o.key))}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          </Field>
        </div>
      </div>

      <div className="w-full px-6 pb-10 pt-4">
        <div className="mx-auto w-full max-w-sm">
          <button
            onClick={save}
            className="w-full rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
          >
            {t("onboarding.continue")}
          </button>
          <button
            onClick={onSkip}
            className="mt-3 w-full text-center text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground"
          >
            {t("onboarding.skipForNow")}
          </button>
        </div>
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* Appearance: theme, font size and accessibility, before the slides  */
/* ------------------------------------------------------------------ */

const ACCENT_COLORS: { key: AccentColor; label: string; class: string; dark: string }[] = [
  { key: "slate",   label: "Slate",   class: "bg-zinc-400",      dark: "dark:bg-zinc-500" },
  { key: "amber",   label: "Amber",   class: "bg-amber-500",     dark: "dark:bg-amber-400" },
  { key: "emerald", label: "Emerald", class: "bg-emerald-500",   dark: "dark:bg-emerald-400" },
  { key: "sky",     label: "Sky",     class: "bg-sky-500",       dark: "dark:bg-sky-400" },
  { key: "violet",  label: "Violet",  class: "bg-violet-500",    dark: "dark:bg-violet-400" },
  { key: "rose",    label: "Rose",    class: "bg-rose-500",      dark: "dark:bg-rose-400" },
  { key: "orange",  label: "Orange",  class: "bg-orange-500",    dark: "dark:bg-orange-400" },
];

function AppearancePicker({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const initial = storage.getData().theme;
  const [mode, setMode] = useState<string>(initial.theme || "system");
  const [accent, setAccent] = useState<AccentColor>(initial.accentColor || "slate");
  const [size, setSize] = useState<string>(initial.fontSize || "md");
  const [dyslexia, setDyslexia] = useState(!!initial.dyslexiaFriendly);
  const [contrast, setContrast] = useState(!!initial.highContrast);
  const [reduced, setReduced] = useState(!!initial.reducedMotion);
  const [underline, setUnderline] = useState(!!initial.underlineLinks);

  const pickTheme = (m: "light" | "dark" | "system") => {
    storage.updateTheme({ theme: m });
    const isDark =
      m === "dark" ||
      (m === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
    setMode(m);
  };
  const pickSize = (s: "sm" | "md" | "lg") => {
    storage.updateTheme({ fontSize: s });
    document.documentElement.setAttribute("data-font-size", s);
    setSize(s);
  };
  const toggleA11y = (
    key: "dyslexiaFriendly" | "highContrast" | "reducedMotion" | "underlineLinks",
    attr: string,
    set: (v: boolean) => void,
    val: boolean
  ) => {
    storage.updateTheme({ [key]: val });
    if (attr === "high-contrast" || attr === "underline-links") {
      document.documentElement.classList.toggle(attr, val);
    } else {
      document.documentElement.setAttribute(attr, String(val));
    }
    set(val);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background">
      {/* Wordmark, consistent with the welcome + language screens */}
      <div className="mt-14 flex w-full justify-center md:mt-16">
        <p className="text-xs font-sans tracking-[0.5em] text-muted-foreground/40">
          ORLEIA<span className="text-foreground/60">OS</span>
        </p>
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mt-10 text-center font-serif text-3xl font-light tracking-tight text-foreground md:text-4xl"
      >
        {t("onboarding.appearance")}
      </motion.h1>

      {/* Scrollable settings: theme, font size, accessibility */}
      <div className="mt-8 w-full flex-1 overflow-y-auto px-6 pb-4">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
          <div>
            <p className="mb-2.5 text-sm font-medium text-muted-foreground">{t("settings.theme")}</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { m: "light", icon: Sun },
                { m: "dark", icon: Moon },
                { m: "system", icon: Monitor },
              ] as const).map(({ m, icon: Icon }) => (
                <button
                  key={m}
                  onClick={() => pickTheme(m)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs transition-all",
                    mode === m
                      ? "border-amber-500/40 bg-amber-500/10 text-foreground"
                      : "border-border bg-secondary/40 text-muted-foreground hover:border-muted-foreground/30"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t("settings." + m)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-sm font-medium text-muted-foreground">Accent Colour</p>
            <div className="flex gap-2">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => {
                    storage.updateTheme({ accentColor: c.key });
                    document.documentElement.setAttribute("data-accent", c.key);
                    setAccent(c.key);
                  }}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                    accent === c.key ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                  )}
                  aria-label={c.label}
                >
                  <span className={cn("h-5 w-5 rounded-full", c.class, c.dark)} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-sm font-medium text-muted-foreground">{t("settings.fontSize")}</p>
            <div className="grid grid-cols-3 gap-2">
              {(["sm", "md", "lg"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => pickSize(s)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm transition-all",
                    size === s
                      ? "border-amber-500/40 bg-amber-500/10 text-foreground"
                      : "border-border bg-secondary/40 text-muted-foreground hover:border-muted-foreground/30"
                  )}
                >
                  {s === "sm" ? t("settings.fontSmall") : s === "md" ? t("settings.fontMedium") : t("settings.fontLarge")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-sm font-medium text-muted-foreground">{t("settings.accessibility")}</p>
            <div className="flex flex-col gap-1.5">
              {[
                {
                  key: "dyslexiaFriendly" as const,
                  attr: "data-dyslexia",
                  active: dyslexia,
                  set: setDyslexia,
                  label: t("settings.dyslexia"),
                  desc: t("settings.dyslexiaDesc"),
                },                {
                  key: "highContrast" as const,
                  attr: "high-contrast",
                  active: contrast,
                  set: setContrast,
                  label: t("settings.contrast"),
                  desc: t("settings.contrastDesc"),
                },
                {
                  key: "reducedMotion" as const,
                  attr: "data-reduced-motion",
                  active: reduced,
                  set: setReduced,
                  label: t("settings.reducedMotion"),
                  desc: t("settings.reducedMotionDesc"),
                },
                {
                  key: "underlineLinks" as const,
                  attr: "underline-links",
                  active: underline,
                  set: setUnderline,
                  label: t("settings.underlineLinks"),
                  desc: t("settings.underlineLinksDesc"),
                },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => toggleA11y(opt.key, opt.attr, opt.set, !opt.active)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                    opt.active
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-border bg-secondary/40 hover:border-muted-foreground/30"
                  )}
                >
                  <span>
                    <span className="block text-sm font-medium">{opt.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 flex h-6 w-11 items-center rounded-full p-0.5 transition-colors",
                      opt.active ? "bg-amber-500" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "h-5 w-5 rounded-full bg-background shadow transition-transform",
                        opt.active && "translate-x-5"
                      )}
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Continue - always visible at the bottom */}
      <div className="w-full px-6 pb-10 pt-4">
        <div className="mx-auto w-full max-w-sm">
          <button
            onClick={onDone}
            className="w-full rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
          >
            {t("onboarding.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Relationship with Noor: how much Noor is allowed to do             */
/* ------------------------------------------------------------------ */

function RelationshipPicker({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [rel, setRel] = useState<NoorRelationship>(storage.getNoorRelationship());
  const options: { key: NoorRelationship; icon: React.ComponentType<{ className?: string }>; name: string; desc: string }[] = [
    { key: "observer", icon: Eye, name: t("rel.observer"), desc: t("rel.observerDesc") },
    { key: "assistant", icon: Sparkles, name: t("rel.assistant"), desc: t("rel.assistantDesc") },
    { key: "operator", icon: Zap, name: t("rel.operator"), desc: t("rel.operatorDesc") },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background">
      <div className="flex flex-1 flex-col justify-center px-6">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6 flex justify-center">
            <p className="text-xs font-sans tracking-[0.5em] text-muted-foreground/40">
              ORLEIA<span className="text-foreground/60">OS</span>
            </p>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-4 text-center font-serif text-3xl font-light tracking-tight text-foreground md:text-4xl"
          >
            {t("onboarding.relationship")}
          </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="mx-auto mt-4 max-w-sm px-6 text-center text-xs leading-relaxed text-muted-foreground/70"
      >
        {t("onboarding.relationshipDesc")}
      </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mb-6 text-center text-xs leading-relaxed text-muted-foreground/70"
          >
            {t("onboarding.relationshipDesc")}
          </motion.p>

          <div className="flex flex-col gap-3">
            {options.map((o) => {
              const active = rel === o.key;
              return (
                <button
                  key={o.key}
                  onClick={() => setRel(o.key)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                    active
                      ? "border-amber-500/40 bg-amber-500/10"
                      : "border-border bg-secondary/40 hover:border-muted-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      active ? "bg-amber-500/15 text-amber-500" : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <o.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{o.name}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{o.desc}</span>
                  </span>
                  {active && <Check className="mt-1 h-4 w-4 shrink-0 text-amber-500" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              storage.updateNoorRelationship(rel);
              onDone();
            }}
            className="mt-6 w-full rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
          >
            {t("onboarding.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Slide 2 visual: the four tools                                     */
/* ------------------------------------------------------------------ */

function ToolsMock() {
  const tools = [
    { icon: CheckCircle2, name: "Habits", desc: "Streaks", color: "text-emerald-500 bg-emerald-500/10" },
    { icon: FileText, name: "Documents", desc: "A4 pages", color: "text-muted-foreground bg-zinc-300/10" },
    { icon: BookOpen, name: "Mindfulness", desc: "Moods", color: "text-muted-foreground bg-zinc-400/10" },
    { icon: ListTodo, name: "Tasks", desc: "Priority", color: "text-muted-foreground bg-zinc-200/10" },
  ];
  return (
    <div className="grid w-full max-w-[320px] grid-cols-2 gap-3">
      {tools.map((t, i) => (
        <div
          key={t.name}
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/40 p-4"
          style={{ animation: `lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both ${i * 90}ms` }}
        >
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", t.color)}>
            <t.icon className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold">{t.name}</span>
          <span className="text-[10px] text-muted-foreground/60">{t.desc}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 3 visual: local-first + privacy                              */
/* ------------------------------------------------------------------ */

function PrivacyMock() {
  return (
    <div
      className="flex flex-col items-center gap-3"
      style={{ animation: "lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both" }}
    >
      <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-secondary/40">
        <div className="absolute inset-0 rounded-3xl bg-primary-500/5" />
        <Lock className="h-9 w-9 text-primary-500" />
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/40">
          <Shield className="h-3 w-3 text-emerald-500" />
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {["100% Local", "0 Tracking", "0 Accounts"].map((badge, i) => (
          <span
            key={badge}
            className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-[11px] font-medium text-muted-foreground"
            style={{ animation: `lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both ${0.15 + i * 0.12}s` }}
          >
            {badge}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slides                                                             */
/* ------------------------------------------------------------------ */

function IntroSlides({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "ORLEIA",
      subtitle: t("onboarding.s1.subtitle"),
      description: t("onboarding.s1.description"),
      visual: ShellMock,
      label: t("onboarding.s1.label"),
    },
    {
      title: t("onboarding.s2.title"),
      subtitle: t("onboarding.s2.subtitle"),
      description: t("onboarding.s2.description"),
      visual: ToolsMock,
      label: t("onboarding.s2.label"),
    },
    {
      title: t("onboarding.s3.title"),
      subtitle: t("onboarding.s3.subtitle"),
      description: t("onboarding.s3.description"),
      visual: PrivacyMock,
      label: t("onboarding.s3.label"),
    },
  ];
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const Visual = current.visual;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">
      {/* Decorative lines */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/4 top-1/4 h-px w-32 -translate-x-1/2 bg-border" />
        <div className="absolute left-1/4 top-1/4 h-32 w-px -translate-y-1/2 bg-border" />
        <div className="absolute bottom-1/3 right-1/4 h-px w-20 bg-border/50" />
        <div className="absolute right-1/3 top-1/3 h-24 w-px bg-border/30" />
        <div className="absolute bottom-1/4 left-1/3 h-px w-16 bg-border/40" />
      </div>

      <AnimatePresence mode="popLayout">
        <motion.div
          key={step}
          layout
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center gap-8 px-6 py-10 md:grid md:grid-cols-2 md:items-center md:gap-12"
        >
          {/* Visual */}
          <div className="order-2 flex items-center justify-center md:order-1">
            <div className="w-full max-w-sm">
              <Visual />
            </div>
          </div>

          {/* Copy - serif headings, same family as the rest of onboarding */}
          <div className="order-1 md:order-2">
            <p className="mb-6 text-[11px] font-sans tracking-widest text-muted-foreground/40">
              {String(step + 1).padStart(2, "0")}/{String(steps.length).padStart(2, "0")}
            </p>

            <div className="mb-8 h-px w-12 bg-primary-500/50" />

            <h1 className="mb-3 font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
              {current.title}
            </h1>

            <p className="mb-3 text-base font-medium text-muted-foreground">
              {current.subtitle}
            </p>

            <p className="mb-4 max-w-sm text-sm leading-relaxed text-muted-foreground/70">
              {current.description}
            </p>

            <p className="mb-10 text-[11px] font-sans tracking-wider text-muted-foreground/30">
              {current.label}
            </p>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 transition-all duration-300",
                      i === step ? "w-6 bg-foreground" : "w-1 bg-muted-foreground/20"
                    )}
                  />
                ))}
              </div>

              <div className="flex-1" />

              <button
                onClick={isLast ? onDone : () => setStep(step + 1)}
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
              >
                {isLast ? t("onboarding.start") : t("onboarding.next")}
                {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * Onboarding flow:
 *   animated multilingual greeting (typewriter, space to continue)
 *   -> age gate (minimum age) -> language picking
 *   -> appearance (theme, font size, accessibility)
 *   -> 3 intro slides (workspace, tools, privacy)
 *   -> about you (optional profile)
 *   -> relationship with Noor (observer / assistant / operator)
 *   -> voice picker -> Orleia Switch (optional import)
 *   -> done (then password).
 */
const ONBOARD_STEP_KEY = "orleia-onboarding-step";

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const completedRef = useRef(false);
  // Restore persisted step for OAuth redirect resume
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === "undefined") return true;
    return !localStorage.getItem(ONBOARD_STEP_KEY);
  });
  const [showAgeGate, setShowAgeGate] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ONBOARD_STEP_KEY) === "age" || localStorage.getItem(ONBOARD_STEP_KEY) === "language";
  });
  const [showAppearance, setShowAppearance] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ONBOARD_STEP_KEY) === "appearance";
  });
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ONBOARD_STEP_KEY) === "intro";
  });

  const [showProfile, setShowProfile] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ONBOARD_STEP_KEY) === "profile";
  });
  const [showRelationship, setShowRelationship] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ONBOARD_STEP_KEY) === "relationship";
  });
  const [showVoice, setShowVoice] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ONBOARD_STEP_KEY) === "voice";
  });
  const [showSwitch, setShowSwitch] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ONBOARD_STEP_KEY) === "switch";
  });

  const persistStep = (step: string) => localStorage.setItem(ONBOARD_STEP_KEY, step);

  const finish = (withTutorial: boolean) => {
    if (completedRef.current) return;
    completedRef.current = true;
    localStorage.removeItem(ONBOARD_STEP_KEY);
    storage.completeOnboarding();
    if (withTutorial) localStorage.setItem("orleia-tutorial-pending", "true");
    onComplete();
  };

  const handleVoiceDone = () => { persistStep("voice"); setShowSwitch(true); };
  const handleSwitchDone = () => finish(true);

  // Clear persisted step on fresh welcome
  useEffect(() => {
    if (showWelcome) localStorage.removeItem(ONBOARD_STEP_KEY);
  }, [showWelcome]);

  if (showSwitch) {
    return <OrleiaSwitch onComplete={handleSwitchDone} />;
  }
  if (showVoice) {
    return null;
  }
  if (showProfile) {
    return (
      <ProfilePicker
        onDone={() => {
          setShowProfile(false);
          persistStep("relationship");
          setShowRelationship(true);
        }}
        onSkip={() => {
          setShowProfile(false);
          persistStep("relationship");
          setShowRelationship(true);
        }}
      />
    );
  }
  if (showRelationship) {
    return (
      <RelationshipPicker
        onDone={() => {
          setShowRelationship(false);
          persistStep("voice");
          setShowVoice(true);
        }}
      />
    );
  }
  if (showIntro) {
    return (
      <IntroSlides
        onDone={() => {
          setShowIntro(false);
          persistStep("profile");
          setShowProfile(true);
        }}
      />
    );
  }
  if (showAppearance) {
    return (
      <AppearancePicker
        onDone={() => {
          setShowAppearance(false);
          persistStep("intro");
          setShowIntro(true);
        }}
      />
    );
  }
  if (showAgeGate) {
    return (
      <AgeGate
        onDone={() => {
          setShowAgeGate(false);
          persistStep("appearance");
          setShowAppearance(true);
        }}
      />
    );
  }
  if (showWelcome) {
    return (
      <WelcomeScreen
        onDone={() => {
          setShowWelcome(false);
          persistStep("age");
          setShowAgeGate(true);
        }}
      />
    );
  }
  return null;
}
