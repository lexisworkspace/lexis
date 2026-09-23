"use client";

import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Upload,
  Trash2,
  Sparkles,
  Palette,
  Monitor,
  Check,
  AlertTriangle,
  Shield,
  ScrollText,
  ArrowUpRight,
  ArrowLeft,
  AudioLines,
  Accessibility as AccessibilityIcon,
  FileText,
  Eye,
  Bell,
  Globe,
  ChevronDown,
  ChevronRight,
  Zap,
  LayoutGrid,
  PenTool,
  Copy,
  Hand,
  Lock,
  RefreshCw,
  User,
  Fingerprint,
  Keyboard,
  type LucideIcon,
} from "lucide-react";
import { isBiometricsAvailable, isBiometricsEnabled, registerBiometric, removeBiometric } from "@/lib/biometric";
import { storage } from "@/lib/storage";
import { exportNotesMarkdown, exportJournalMarkdown, exportTasksCsv, exportHabitsCsv } from "@/lib/export";
import { cn } from "@/lib/utils";
import { notificationPermission, requestReminderPermission } from "@/lib/reminders";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import { verifyPassword, isPasswordSet, PasswordGate } from "@/components/layout/PasswordGate";
import { SyncSettings } from "@/components/SyncSettings";

import { VoiceOrb } from "@/components/assistant/VoiceOrb";
import { VOICE_PERSONAS, getVoicePersona, speakPreview, stopSpeaking } from "@/lib/voices";
import { LexisSwitch } from "@/components/switch/LexisSwitch";
import { getShortcuts, setShortcuts, isDesktop, getAutoStart, setAutoStart } from "@/lib/desktop-bridge";



type SettingsCategory =
  | "profile"
  | "appearance"
  | "accessibility"
  | "voice"
  | "noor"
  | "mode"
  | "reminders"
  | "sync"
  | "shortcuts"
  | "data"
  | "security"
  | "legal"
  | "about"
  | null;

const LEXIS_VERSION = "2.0.0";

const legalLinks = [
  { href: "/privacy", tKey: "settings.linkPrivacy" },
  { href: "/terms", tKey: "settings.linkTerms" },
  { href: "/cookies", tKey: "settings.linkCookies" },
  { href: "/disclaimer", tKey: "settings.linkDisclaimer" },
  { href: "/gdpr", tKey: "settings.linkGdpr" },
  { href: "/ccpa", tKey: "settings.linkCcpa" },
  { href: "/acceptable-use", tKey: "settings.linkAup" },
  { href: "/eula", tKey: "settings.linkEula" },
  { href: "/accessibility", tKey: "settings.linkAccessibility" },
];

/* ------------------------------------------------------------------ */
/* Toggle switch helper                                                */
/* ------------------------------------------------------------------ */
function Toggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "shrink-0 flex h-6 w-11 items-center rounded-full p-0.5 transition-colors",
        active ? "bg-primary-500" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "h-5 w-5 rounded-full bg-background shadow transition-transform",
          active && "translate-x-5"
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Profile Editor (About You)                                          */
/* ------------------------------------------------------------------ */
function ProfileEditor({
  data,
  refresh,
  t,
  onBack,
}: {
  data: ReturnType<typeof storage.getData>;
  refresh: () => void;
  t: (key: string) => string;
  onBack: () => void;
}) {
  const profile = data.profile || ({} as any);
  const toggleIn = (arr: string[], key: string) =>
    arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];

  const [name, setName] = useState(profile.name || "");
  const [pronouns, setPronouns] = useState(profile.pronouns || "");
  const [ageRange, setAgeRange] = useState(profile.ageRange || "");
  const [timezone, setTimezone] = useState(profile.timeZone || "");
  const [workStudy, setWorkStudy] = useState<string[]>(Array.isArray(profile.workStudy) ? profile.workStudy : []);
  const [interests, setInterests] = useState<string[]>(profile.interests || []);
  const [schedule, setSchedule] = useState(profile.schedule || "");
  const [prodPrefs, setProdPrefs] = useState<string[]>(Array.isArray(profile.productivityPrefs) ? profile.productivityPrefs : []);
  const [commPrefs, setCommPrefs] = useState<string[]>(Array.isArray(profile.communicationPrefs) ? profile.communicationPrefs : []);
  const [goals, setGoals] = useState(profile.goals || "");
  const [helpWith, setHelpWith] = useState<string[]>(profile.helpWith || []);
  const [saved, setSaved] = useState(false);

  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf?.("timeZone") || [];
    } catch {
      return [];
    }
  }, []);

  const save = () => {
    storage.updateProfile({
      name: name.trim(),
      pronouns,
      ageRange,
      timeZone: timezone,
      workStudy,
      interests,
      schedule,
      productivityPrefs: prodPrefs,
      communicationPrefs: commPrefs,
      goals: goals.trim(),
      helpWith,
    });
    refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const none = "—";

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        {t("settings.title")}
      </button>
      <h2 className="text-lg font-bold">{t("settings.profile")}</h2>
      <p className="text-sm text-muted-foreground">{t("settings.profileDesc")}</p>

      {/* Name */}
      <div className="space-y-1">
        <label className="text-sm font-medium">{t("onboarding.name")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("onboarding.namePh")}
          className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500/40"
        />
      </div>

      {/* Pronouns */}
      <div className="space-y-1">
        <label className="text-sm font-medium">{t("onboarding.pronouns")}</label>
        <div className="flex flex-wrap gap-2">
          {[{ key: "she/her", label: t("opt.sheHer") }, { key: "he/him", label: t("opt.heHim") }, { key: "they/them", label: t("opt.theyThem") }, { key: "", label: none }].map((o) => (
            <button key={o.key || "none"} onClick={() => setPronouns(o.key)} className={`rounded-full border px-3 py-1 text-xs transition-all ${pronouns === o.key ? "border-primary-500 bg-primary-500/10 text-primary-500" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Age Range */}
      <div className="space-y-1">
        <label className="text-sm font-medium">{t("onboarding.ageRange")}</label>
        <div className="flex flex-wrap gap-2">
          {[{ key: "13-17", label: t("opt.age1317") }, { key: "18-24", label: t("opt.age1824") }, { key: "25-34", label: t("opt.age2534") }, { key: "35-44", label: t("opt.age3544") }, { key: "45-54", label: t("opt.age4554") }, { key: "55+", label: t("opt.age55") }, { key: "", label: none }].map((o) => (
            <button key={o.key || "none"} onClick={() => setAgeRange(o.key)} className={`rounded-full border px-3 py-1 text-xs transition-all ${ageRange === o.key ? "border-primary-500 bg-primary-500/10 text-primary-500" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Timezone */}
      <div className="space-y-1">
        <label className="text-sm font-medium">{t("onboarding.timeZone")}</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500/40"
        >
          <option value="">{none}</option>
          {timezones.map((tz) => (
            <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {/* Work / Study */}
      <div className="space-y-1">
        <label className="text-sm font-medium">{t("onboarding.workStudy")}</label>
        <div className="flex flex-wrap gap-2">
          {[{ key: "student", label: t("opt.student") }, { key: "working", label: t("opt.working") }, { key: "freelance", label: t("opt.freelance") }, { key: "looking", label: t("opt.looking") }, { key: "other", label: t("opt.other") }, { key: "__none__", label: none }].map((o) => (
            <button key={o.key} onClick={() => o.key === "__none__" ? setWorkStudy([]) : setWorkStudy((w) => toggleIn(w, o.key))} className={`rounded-full border px-3 py-1 text-xs transition-all ${(o.key === "__none__" ? workStudy.length === 0 : workStudy.includes(o.key)) ? "border-primary-500 bg-primary-500/10 text-primary-500" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Interests */}
      <div className="space-y-1">
        <label className="text-sm font-medium">{t("onboarding.interests")}</label>
        <div className="flex flex-wrap gap-2">
          {[{ key: "reading", label: t("opt.reading") }, { key: "fitness", label: t("opt.fitness") }, { key: "learning", label: t("opt.learning") }, { key: "tech", label: t("opt.tech") }, { key: "music", label: t("opt.music") }, { key: "art", label: t("opt.art") }, { key: "travel", label: t("opt.travel") }, { key: "gaming", label: t("opt.gaming") }, { key: "mindfulness", label: t("opt.mindfulness") }].map((o) => (
            <button key={o.key} onClick={() => setInterests((i) => toggleIn(i, o.key))} className={`rounded-full border px-3 py-1 text-xs transition-all ${interests.includes(o.key) ? "border-primary-500 bg-primary-500/10 text-primary-500" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div className="space-y-1">
        <label className="text-sm font-medium">{t("onboarding.schedule")}</label>
        <div className="flex flex-wrap gap-2">
          {[{ key: "early", label: t("opt.early") }, { key: "night", label: t("opt.night") }, { key: "9-5", label: t("opt.nineToFive") }, { key: "irregular", label: t("opt.irregular") }, { key: "", label: none }].map((o) => (
            <button key={o.key || "none"} onClick={() => setSchedule(o.key)} className={`rounded-full border px-3 py-1 text-xs transition-all ${schedule === o.key ? "border-primary-500 bg-primary-500/10 text-primary-500" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Productivity Prefs */}
      <div className="space-y-1">
        <label className="text-sm font-medium">{t("onboarding.prodPrefs")}</label>
        <div className="flex flex-wrap gap-2">
          {[{ key: "deepWork", label: t("opt.deepWork") }, { key: "sprints", label: t("opt.sprints") }, { key: "checklists", label: t("opt.checklists") }, { key: "streaks", label: t("opt.streaks") }, { key: "deadlines", label: t("opt.deadlines") }].map((o) => (
            <button key={o.key} onClick={() => setProdPrefs((p) => toggleIn(p, o.key))} className={`rounded-full border px-3 py-1 text-xs transition-all ${prodPrefs.includes(o.key) ? "border-primary-500 bg-primary-500/10 text-primary-500" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Communication Prefs */}
      <div className="space-y-1">
        <label className="text-sm font-medium">{t("onboarding.commPrefs")}</label>
        <div className="flex flex-wrap gap-2">
          {[{ key: "direct", label: t("opt.direct") }, { key: "concise", label: t("opt.concise") }, { key: "encouraging", label: t("opt.encouraging") }, { key: "detailed", label: t("opt.detailed") }].map((o) => (
            <button key={o.key} onClick={() => setCommPrefs((c) => toggleIn(c, o.key))} className={`rounded-full border px-3 py-1 text-xs transition-all ${commPrefs.includes(o.key) ? "border-primary-500 bg-primary-500/10 text-primary-500" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Goals */}
      <div className="space-y-1">
        <label className="text-sm font-medium">{t("onboarding.goals")}</label>
        <textarea
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          placeholder={t("onboarding.goalsPh")}
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500/40"
        />
      </div>

      {/* Help With */}
      <div className="space-y-1">
        <label className="text-sm font-medium">{t("onboarding.helpWith")}</label>
        <div className="flex flex-wrap gap-2">
          {[{ key: "habits", label: t("opt.helpHabits") }, { key: "focus", label: t("opt.helpFocus") }, { key: "planning", label: t("opt.helpPlanning") }, { key: "journaling", label: t("opt.helpJournaling") }, { key: "organization", label: t("opt.helpOrganization") }, { key: "wellbeing", label: t("opt.helpWellbeing") }, { key: "learning", label: t("opt.helpLearning") }].map((o) => (
            <button key={o.key} onClick={() => setHelpWith((h) => toggleIn(h, o.key))} className={`rounded-full border px-3 py-1 text-xs transition-all ${helpWith.includes(o.key) ? "border-primary-500 bg-primary-500/10 text-primary-500" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={save}
        className="w-full rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
      >
        {saved ? "✓ Saved" : "Save"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Biometric Toggle                                                    */
/* ------------------------------------------------------------------ */
function BiometricToggle() {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    isBiometricsAvailable().then(setAvailable);
    setEnabled(isBiometricsEnabled());
  }, []);

  if (!available) return null;

  const handleToggle = async () => {
    setLoading(true);
    if (enabled) {
      removeBiometric();
      setEnabled(false);
    } else {
      const result = await registerBiometric();
      if (result.ok) setEnabled(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
      <span className="flex items-center gap-3">
        <Fingerprint className="h-5 w-5 shrink-0 text-muted-foreground" />
        <span>
          <span className="block text-sm font-medium">Biometric unlock</span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            {enabled ? "Fingerprint / face unlock enabled" : "Use fingerprint or face to unlock Lexis"}
          </span>
        </span>
      </span>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          "shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all",
          enabled
            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
            : "bg-foreground text-background hover:opacity-90"
        )}
      >
        {loading ? "..." : enabled ? "Enabled" : "Enable"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings Page                                                       */
/* ------------------------------------------------------------------ */
export default function SettingsPage() {
  const [data, setData] = useState(storage.getData());
  const { t } = useI18n();
  const persona = getVoicePersona(data.theme.voiceId);
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(null);

  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const coarse = !!window.matchMedia?.("(pointer: coarse)").matches;
    const narrow = !!window.matchMedia?.("(max-width: 767px)").matches;
    const noHover = !!window.matchMedia?.("(hover: none)").matches;
    setIsTouch(coarse || narrow || noHover);
  }, []);

  useEffect(() => () => { stopSpeaking(); }, []);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearPassword, setClearPassword] = useState("");
  const [clearPasswordError, setClearPasswordError] = useState("");
  const [hasPassword, setHasPassword] = useState(isPasswordSet());
  const [shortcuts, setShortcutsState] = useState<Record<string, string>>({});
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [shortcutError, setShortcutError] = useState("");
  const [shortcutSaved, setShortcutSaved] = useState(false);
  const [autoStart, setAutoStartState] = useState(false);

  useEffect(() => {
    if (isDesktop()) {
      getShortcuts().then((s) => { if (s) setShortcutsState(s); });
      getAutoStart().then(setAutoStartState);
    }
  }, []);

  const handleShortcutChange = async (action: string, value: string) => {
    const updated = { ...shortcuts, [action]: value };
    setShortcutsState(updated);
    setShortcutError("");
    setShortcutSaved(false);
    const ok = await setShortcuts(updated);
    if (ok) {
      setShortcutSaved(true);
      setTimeout(() => setShortcutSaved(false), 2000);
    }
  };

  const resetShortcuts = async () => {
    const defaults: Record<string, string> = {
      "Focus Lexis": "CommandOrControl+Shift+L",
      "New Note": "CommandOrControl+Shift+N",
      "New Task": "CommandOrControl+Shift+T",
    };
    setShortcutsState(defaults);
    await setShortcuts(defaults);
    setShortcutSaved(true);
    setTimeout(() => setShortcutSaved(false), 2000);
  };
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    notificationPermission()
  );
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!langOpen) return;
    const onDown = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node))
        setLangOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLangOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [langOpen]);

  useEffect(() => {
    setHasPassword(isPasswordSet());
  }, []);

  const refresh = () => setData({ ...storage.getData() });
  useEffect(
    () => storage.subscribe(() => setData({ ...storage.getData() })),
    []
  );

  const handleExport = () => {
    const json = storage.exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lexis-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (storage.importData(content)) {
            refresh();
            alert(t("settings.importSuccess"));
          } else {
            alert(t("settings.importFail"));
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleClear = async () => {
    if (clearPassword) {
      setClearPasswordError("");
      const valid = await verifyPassword(clearPassword);
      if (!valid) {
        setClearPasswordError("Incorrect password.");
        setClearing(false);
        return;
      }
    } else if (isPasswordSet()) {
      setClearPasswordError("Enter your password to confirm.");
      return;
    }
    setClearing(true);
    try {
      await storage.clearAll();
      window.location.href = "/";
    } catch (e) {
      console.error("Failed to clear data", e);
      setClearing(false);
    }
  };

  /* ----- Category definitions ----- */
  const categories: {
    id: SettingsCategory & string;
    icon: LucideIcon;
    label: string;
    desc: string;
    color: string;
    desktopOnly?: boolean;
  }[] = [
    {
      id: "profile",
      icon: User,
      label: t("settings.profile"),
      desc: t("settings.profileDesc"),
      color: "text-primary",
    },
    {
      id: "appearance",
      icon: Palette,
      label: t("settings.appearance"),
      desc: t("settings.theme") + ", " + t("settings.language"),
      color: "text-primary",
    },
    {
      id: "accessibility",
      icon: AccessibilityIcon,
      label: t("settings.accessibility"),
      desc: t("settings.dyslexia") + ", " + t("settings.contrast"),
      color: "text-primary",
    },
    {
      id: "voice",
      icon: AudioLines,
      label: t("settings.voice"),
      desc: t("settings.voiceDesc"),
      color: "text-primary",
    },
    {
      id: "noor",
      icon: Sparkles,
      label: t("settings.noorSees"),
      desc: t("settings.noorSeesDesc"),
      color: "text-primary",
    },
    {
      id: "mode",
      icon: LayoutGrid,
      label: t("mode.title"),
      desc: t("mode.desc"),
      color: "text-primary",
    },
    {
      id: "reminders",
      icon: Bell,
      label: t("settings.reminders"),
      desc: t("settings.remindersDesc"),
      color: "text-primary",
    },
    {
      id: "sync",
      icon: RefreshCw,
      label: t("settings.sync"),
      desc: t("settings.syncRelayDesc"),
      color: "text-primary",
    },
    {
      id: "shortcuts",
      icon: Keyboard,
      label: t("settings.shortcuts"),
      desc: t("settings.shortcutsDesc"),
      color: "text-primary",
      desktopOnly: true,
    },
    {
      id: "data",
      icon: Download,
      label: t("settings.data"),
      desc: t("settings.dataDesc"),
      color: "text-primary",
    },
    {
      id: "security",
      icon: Shield,
      label: t("settings.security"),
      desc: hasPassword
        ? t("settings.securityDesc1")
        : t("settings.securityDesc2"),
      color: "text-primary",
    },
    {
      id: "legal",
      icon: ScrollText,
      label: t("settings.legal"),
      desc: t("settings.legalDesc"),
      color: "text-primary",
    },
    {
      id: "about",
      icon: FileText,
      label: t("settings.about"),
      desc: t("settings.aboutDesc"),
      color: "text-primary",
    },
  ];

  const visibleCategories = categories.filter(
    (c) => true
  );

  /* ----- Back button for detail view ----- */
  const DetailHeader = () => (
    <button
      onClick={() => setActiveCategory(null)}
      className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      {t("settings.title")}
    </button>
  );

  /* ================================================================ */
  /* HUB VIEW                                                         */
  /* ================================================================ */
  if (!activeCategory) {  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl">
        {/* ── User Profile Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-5"
        >
          {/* Avatar */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-secondary">
            <svg className="h-10 w-10 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold md:text-2xl truncate">
              {data.profile?.name || t("onboarding.namePh") || "User"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Lexis {LEXIS_VERSION} · <span className="text-emerald-400">{t("settings.upToDate")}</span>
            </p>
          </div>
        </motion.div>

        {/* Desktop: Grid of category cards (Windows Settings style) */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleCategories.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 + i * 0.03 }}
              onClick={() => setActiveCategory(cat.id)}
              className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-muted-foreground/30 hover:bg-secondary/40 active:scale-[0.98]"
            >
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary",
                  cat.color
                )}
              >
                <cat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{cat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {cat.desc}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30 mt-1 group-hover:text-muted-foreground transition-colors" />
            </motion.button>
          ))}
        </div>

        {/* Mobile: List of category rows (iOS Settings style) */}
        <div className="md:hidden space-y-1">
          {visibleCategories.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.02 + i * 0.02 }}
              onClick={() => setActiveCategory(cat.id)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left transition-colors active:bg-secondary/60"
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary",
                  cat.color
                )}
              >
                <cat.icon className="h-4 w-4" />
              </div>
              <span className="flex-1 text-sm font-medium">{cat.label}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30" />
            </motion.button>
          ))}
        </div>

        {/* Clear Confirmation Modal */}
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                  <AlertTriangle className="h-7 w-7 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2">
                {t("settings.clearTitle")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("settings.clearDesc")}
              </p>
              {isPasswordSet() && (
                <div className="mb-4">
                  <input
                    type="password"
                    value={clearPassword}
                    onChange={(e) => {
                      setClearPassword(e.target.value);
                      setClearPasswordError("");
                    }}
                    placeholder="Enter your password to confirm"
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary-500/40"
                    autoFocus
                  />
                  {clearPasswordError && (
                    <p className="mt-1.5 text-xs text-red-400">
                      {clearPasswordError}
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setClearPassword("");
                    setClearPasswordError("");
                  }}
                  className="btn-secondary flex-1"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleClear}
                  disabled={clearing}
                  className="flex-1 rounded-xl bg-zinc-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("settings.deleteEverything")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showSwitch && (
          <LexisSwitch
            onClose={() => {
              setShowSwitch(false);
              refresh();
            }}
            onComplete={() => {
              setShowSwitch(false);
              refresh();
            }}
          />
        )}

        {showPasswordSetup && (
          <div className="fixed inset-0 z-[100]">
            <PasswordGate
              mode="setup"
              onUnlock={() => {
                setShowPasswordSetup(false);
                setHasPassword(true);
              }}
            />
          </div>
        )}
      </div>
    );
  }

  /* ================================================================ */
  /* DETAIL VIEW — rendered per category                               */
  /* ================================================================ */
  return (
    <div className="space-y-6 md:space-y-8 max-w-2xl">
      <DetailHeader />

      {/* ---- PROFILE (About You) ---- */}
      {activeCategory === "profile" && (
        <ProfileEditor data={data} refresh={refresh} t={t} onBack={() => setActiveCategory(null)} />
      )}

      {/* ---- APPEARANCE ---- */}
      {activeCategory === "appearance" && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{t("settings.appearance")}</h2>
          </div>
          <div className="space-y-5">
            {/* Theme */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t("settings.theme")}
              </label>
              <div className="flex gap-2">
                {(["light", "dark", "system"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      storage.updateTheme({ theme: mode as any });
                      const isDark =
                        mode === "dark" ||
                        (mode === "system" &&
                          window.matchMedia("(prefers-color-scheme: dark)")
                            .matches);
                      document.documentElement.classList.toggle("dark", isDark);
                      refresh();
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-all",
                      data.theme.theme === mode
                        ? "border-primary-500 bg-primary-500/10 text-primary-500"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <Monitor className="h-4 w-4" />
                    {t("settings." + mode)}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="relative" ref={langRef}>
              <label className="text-sm font-medium mb-2 block">
                {t("settings.language")}
              </label>
              <button
                type="button"
                onClick={() => setLangOpen((o) => !o)}
                aria-expanded={langOpen}
                aria-haspopup="listbox"
                className="flex w-full sm:w-72 items-center justify-between gap-2 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm transition-all hover:border-muted-foreground/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {LANGUAGES.find(
                      (l) => l.code === (data.theme.language || "en")
                    )?.name || "English"}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    langOpen && "rotate-180"
                  )}
                />
              </button>
              {langOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 top-full z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-background p-1.5 shadow-xl shadow-black/20"
                >
                  {LANGUAGES.map((l) => {
                    const active =
                      (data.theme.language || "en") === l.code;
                    return (
                      <button
                        key={l.code}
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          storage.updateTheme({ language: l.code });
                          document.documentElement.setAttribute("lang", l.code);
                          document.documentElement.setAttribute("dir", l.dir);
                          refresh();
                          setLangOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          active
                            ? "bg-primary-500/10 text-primary-500"
                            : "hover:bg-secondary"
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              active ? "bg-primary-500" : "bg-muted-foreground/25"
                            )}
                          />
                          <span className="truncate">{l.name}</span>
                        </span>
                        {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Font Size */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t("settings.fontSize")}
              </label>
              <div className="flex gap-2">
                {(["sm", "md", "lg"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      storage.updateTheme({ fontSize: size });
                      document.documentElement.setAttribute(
                        "data-font-size",
                        size
                      );
                      refresh();
                    }}
                    className={cn(
                      "rounded-xl border px-4 py-2 text-sm transition-all",
                      data.theme.fontSize === size
                        ? "border-primary-500 bg-primary-500/10 text-primary-500"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    {size === "sm"
                      ? t("settings.fontSmall")
                      : size === "md"
                      ? t("settings.fontMedium")
                      : t("settings.fontLarge")}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Colour */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Accent Colour
              </label>
              <div className="flex gap-2">
                {(
                  [
                    { key: "slate", cls: "bg-zinc-400 dark:bg-zinc-500" },
                    { key: "amber", cls: "bg-amber-500 dark:bg-amber-400" },
                    {
                      key: "emerald",
                      cls: "bg-emerald-500 dark:bg-emerald-400",
                    },
                    { key: "sky", cls: "bg-sky-500 dark:bg-sky-400" },
                    {
                      key: "violet",
                      cls: "bg-violet-500 dark:bg-violet-400",
                    },
                    { key: "rose", cls: "bg-rose-500 dark:bg-rose-400" },
                    {
                      key: "orange",
                      cls: "bg-orange-500 dark:bg-orange-400",
                    },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.key}
                    onClick={() => {
                      storage.updateTheme({ accentColor: c.key });
                      document.documentElement.setAttribute(
                        "data-accent",
                        c.key
                      );
                      refresh();
                    }}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                      (data.theme.accentColor || "slate") === c.key
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    aria-label={c.key}
                  >
                    <span className={cn("h-5 w-5 rounded-full", c.cls)} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ---- ACCESSIBILITY ---- */}
      {activeCategory === "accessibility" && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-4">
            <AccessibilityIcon className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{t("settings.accessibility")}</h2>
          </div>
          <div className="space-y-3">
            {(
              [
                {
                  key: "dyslexiaFriendly" as const,
                  label: t("settings.dyslexia"),
                  desc: t("settings.dyslexiaDesc"),
                },
                {
                  key: "highContrast" as const,
                  label: t("settings.contrast"),
                  desc: t("settings.contrastDesc"),
                },
                {
                  key: "reducedMotion" as const,
                  label: t("settings.reducedMotion"),
                  desc: t("settings.reducedMotionDesc"),
                },
              ] as const
            ).map((opt) => {
              const active = !!data.theme[opt.key];
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    storage.updateTheme({ [opt.key]: !active });
                    document.documentElement.setAttribute(
                      "data-" +
                        (opt.key === "dyslexiaFriendly"
                          ? "dyslexia"
                          : opt.key === "highContrast"
                          ? "contrast"
                          : "reduced-motion"),
                      (!active).toString()
                    );
                    refresh();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-all",
                    active
                      ? "border-primary-500 bg-primary-500/10"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <span>
                    <span className="block text-sm font-medium">
                      {opt.label}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {opt.desc}
                    </span>
                  </span>
                  <Toggle active={active} onToggle={() => {}} />
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ---- VOICE ---- */}
      {activeCategory === "voice" && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-4">
            <AudioLines className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{t("settings.voice")}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t("settings.voiceDesc")}
          </p>
          <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-secondary/30 p-4 mb-4">
            <VoiceOrb state="idle" size="md" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{persona.name}</p>
              <p className="text-xs text-muted-foreground">{persona.tagline}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {VOICE_PERSONAS.map((p) => {
              const active = (data.theme.voiceId || persona.id) === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    storage.updateTheme({ voiceId: p.id });
                    refresh();
                    speakPreview(p, data.theme.language || "en");
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.98]",
                    active
                      ? "border-primary-500 bg-primary-500/10"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      p.gender === "male" ? "bg-sky-500" : "bg-pink-500"
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {p.name}
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground/70">
                      {p.tagline}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ---- NOOR ---- */}
      {activeCategory === "noor" && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {/* Relationship */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">
                {t("onboarding.relationship")}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t("onboarding.relationshipDesc")}
            </p>
            <div className="space-y-2">
              {(
                [
                  {
                    key: "observer",
                    icon: Eye,
                    name: t("rel.observer"),
                    desc: t("rel.observerDesc"),
                  },
                  {
                    key: "assistant",
                    icon: Sparkles,
                    name: t("rel.assistant"),
                    desc: t("rel.assistantDesc"),
                  },
                  {
                    key: "operator",
                    icon: Zap,
                    name: t("rel.operator"),
                    desc: t("rel.operatorDesc"),
                  },
                ] as const
              ).map((o) => {
                const active = data.noorRelationship === o.key;
                return (
                  <button
                    key={o.key}
                    onClick={() => {
                      storage.updateNoorRelationship(o.key);
                      refresh();
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-all",
                      active
                        ? "border-primary-500 bg-primary-500/10"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <o.icon
                        className={cn(
                          "h-5 w-5 shrink-0",
                          active ? "text-primary-500" : "text-muted-foreground"
                        )}
                      />
                      <span>
                        <span className="block text-sm font-medium">
                          {o.name}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {o.desc}
                        </span>
                      </span>
                    </span>
                    {active && (
                      <Check className="h-4 w-4 shrink-0 text-primary-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* What Noor sees */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-emerald-500" />
              <h2 className="font-semibold">{t("settings.noorSees")}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t("settings.noorSeesDesc")}
            </p>
            <ul className="space-y-3 text-sm">
              {[
                t("settings.noorSeesLocal"),
                t("settings.noorSeesAi"),
                t("settings.noorSeesVoice"),
                t("settings.noorSeesNoTracking"),
                t("settings.noorSeesDelete"),
              ].map((text, i) => (
                <li key={i} className="flex gap-3">
                  <Check className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {/* ---- LEXIS MODE ---- */}
      {activeCategory === "mode" && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{t("mode.title")}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t("mode.desc")}</p>
          <div className="space-y-2">
            {(
              [
                {
                  key: "workspace",
                  icon: LayoutGrid,
                  name: t("mode.workspace"),
                  desc: t("mode.workspaceDesc"),
                  soon: false,
                },
                {
                  key: "canvas",
                  icon: PenTool,
                  name: t("mode.canvas"),
                  desc: t("mode.canvasDesc"),
                  soon: true,
                },
                {
                  key: "clone",
                  icon: Copy,
                  name: t("mode.clone"),
                  desc: t("mode.cloneDesc"),
                  soon: true,
                },
              ] as const
            ).map((o) => {
              const active = data.lexisMode === o.key;
              return (
                <button
                  key={o.key}
                  onClick={() => {
                    if (o.soon) return;
                    storage.updateLexisMode(o.key);
                    refresh();
                  }}
                  disabled={o.soon}
                  className={cn(
                    "w-full flex items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-all",
                    o.soon
                      ? "cursor-not-allowed border-border/60 opacity-60"
                      : active
                      ? "border-primary-500 bg-primary-500/10"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <o.icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        o.soon
                          ? "text-muted-foreground/50"
                          : active
                          ? "text-primary-500"
                          : "text-muted-foreground"
                      )}
                    />
                    <span>
                      <span className="block text-sm font-medium">
                        {o.name}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {o.desc}
                      </span>
                    </span>
                  </span>
                  {o.soon ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                      <Lock className="h-2.5 w-2.5" />
                      {t("mode.comingSoon")}
                    </span>
                  ) : (
                    active && (
                      <Check className="h-4 w-4 shrink-0 text-primary-500" />
                    )
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ---- REMINDERS ---- */}
      {activeCategory === "reminders" && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{t("settings.reminders")}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t("settings.remindersDesc")}
          </p>

          {perm === "unsupported" ? (
            <p className="text-xs text-muted-foreground mb-4">
              {t("settings.remindersUnsupported")}
            </p>
          ) : perm === "granted" ? (
            <div className="flex items-center gap-2 text-sm text-emerald-400 mb-4">
              <Check className="h-4 w-4" />
              {t("settings.remindersEnabled")}
            </div>
          ) : perm === "denied" ? (
            <p className="text-xs text-muted-foreground mb-4">
              {t("settings.remindersDenied")}
            </p>
          ) : (
            <button
              onClick={async () => {
                await requestReminderPermission();
                setPerm(notificationPermission());
              }}
              className="btn-secondary flex items-center gap-2 mb-4"
            >
              <Bell className="h-4 w-4" />
              {t("settings.remindersEnable")}
            </button>
          )}

          <div className="space-y-3">
            {(
              [
                {
                  key: "remindersEnabled" as const,
                  label: t("settings.remindersMaster"),
                  desc: t("settings.remindersMasterDesc"),
                },
                {
                  key: "remindHabits" as const,
                  label: t("settings.remindHabits"),
                  desc: t("settings.remindHabitsDesc"),
                },
                {
                  key: "remindTasks" as const,
                  label: t("settings.remindTasks"),
                  desc: t("settings.remindTasksDesc"),
                },
                {
                  key: "remindMentions" as const,
                  label: t("settings.remindMentions"),
                  desc: t("settings.remindMentionsDesc"),
                },
                {
                  key: "remindWellness" as const,
                  label: t("settings.remindWellness"),
                  desc: t("settings.remindWellnessDesc"),
                },
              ] as const
            ).map((opt) => {
              const active = !!data.theme[opt.key];
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    storage.updateTheme({ [opt.key]: !active });
                    refresh();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-all",
                    active
                      ? "border-primary-500 bg-primary-500/10"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <span>
                    <span className="block text-sm font-medium">
                      {opt.label}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {opt.desc}
                    </span>
                  </span>
                  <Toggle active={active} onToggle={() => {}} />
                </button>
              );
            })}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
              <span>
                <span className="block text-sm font-medium">
                  {t("settings.wellnessTime")}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {t("settings.wellnessTimeDesc")}
                </span>
              </span>
              <input
                type="time"
                value={data.theme.wellnessTime || "15:00"}
                onChange={(e) => {
                  storage.updateTheme({ wellnessTime: e.target.value });
                  refresh();
                }}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
        </motion.div>
      )}

      


{/* ---- SYNC ---- */}
      {activeCategory === "sync" && (
        <SyncSettings refresh={refresh} />
      )}

      {/* ---- SHORTCUTS (Desktop only) ---- */}
      {activeCategory === "shortcuts" && isDesktop() && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Keyboard className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">{t("settings.shortcuts")}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t("settings.shortcutsDesc")}</p>
            {shortcutSaved && (
              <div className="mb-3 flex items-center gap-2 text-sm text-green-500">
                <Check className="h-4 w-4" /> {t("settings.shortcutsSaved")}
              </div>
            )}
            {shortcutError && (
              <div className="mb-3 flex items-center gap-2 text-sm text-red-500">
                <AlertTriangle className="h-4 w-4" /> {shortcutError}
              </div>
            )}
            <div className="space-y-2">
              {Object.entries(shortcuts).map(([action, key]) => (
                <div key={action} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">{action}</span>
                  <div className="flex items-center gap-2">
                    {editingShortcut === action ? (
                      <input
                        autoFocus
                        className="rounded-lg border border-primary bg-background px-3 py-1.5 text-sm font-mono focus:outline-none"
                        placeholder="Press keys..."
                        onKeyDown={(e) => {
                          e.preventDefault();
                          const combo = [];
                          if (e.ctrlKey || e.metaKey) combo.push("CommandOrControl");
                          if (e.shiftKey) combo.push("Shift");
                          if (e.altKey) combo.push("Alt");
                          const key = e.key;
                          if (!["Control", "Shift", "Alt", "Meta"].includes(key)) {
                            combo.push(key.length === 1 ? key.toUpperCase() : key);
                            const accelerator = combo.join("+");
                            handleShortcutChange(action, accelerator);
                            setEditingShortcut(null);
                          }
                        }}
                        onBlur={() => setEditingShortcut(null)}
                      />
                    ) : (
                      <button
                        onClick={() => { setEditingShortcut(action); setShortcutError(""); }}
                        className="rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-mono hover:border-primary transition-colors"
                      >
                        {key.replace("CommandOrControl", "Ctrl")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3 mt-4">
                <div>
                  <span className="text-sm font-medium">Start with Windows</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Open Lexis automatically when you sign in</p>
                </div>
                <button
                  onClick={async () => {
                    const next = !autoStart;
                    await setAutoStart(next);
                    setAutoStartState(next);
                  }}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    autoStart ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    autoStart ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>
              <button onClick={resetShortcuts} className="btn-secondary mt-4 text-sm">
              {t("settings.shortcutsReset")}
            </button>
          </div>
        </motion.div>
      )}

      {/* ---- DATA ---- */}
      {activeCategory === "data" && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Download className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">{t("settings.data")}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t("settings.dataDesc")}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExport}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {t("settings.exportData")}
              </button>
              <button
                onClick={handleImport}
                className="btn-secondary flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {t("settings.importData")}
              </button>
              <button
                onClick={() => setShowSwitch(true)}
                className="btn-secondary flex items-center gap-2 border-primary-500/30 bg-primary-500/10 text-primary-500 hover:bg-primary-500/20"
              >
                <ArrowUpRight className="h-4 w-4" />
                Lexis Switch
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                className="btn-secondary flex items-center gap-2 text-muted-foreground border-zinc-400/20 hover:bg-muted"
              >
                <Trash2 className="h-4 w-4" />
                {t("settings.clearAll")}
              </button>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-3">
                {t("settings.portableDesc")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => exportNotesMarkdown(data)}
                  className="btn-secondary flex items-center gap-2 text-xs"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {t("settings.exportNotesMd")}
                </button>
                <button
                  onClick={() => exportJournalMarkdown(data)}
                  className="btn-secondary flex items-center gap-2 text-xs"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {t("settings.exportJournalMd")}
                </button>
                <button
                  onClick={() => exportTasksCsv(data)}
                  className="btn-secondary flex items-center gap-2 text-xs"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {t("settings.exportTasksCsv")}
                </button>
                <button
                  onClick={() => exportHabitsCsv(data)}
                  className="btn-secondary flex items-center gap-2 text-xs"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {t("settings.exportHabitsCsv")}
                </button>
              </div>
            </div>
            {copied && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4" />
                {t("settings.exported")}
              </div>
            )}
          </div>

          {/* Storage Stats */}
          <div className="card">
            <h2 className="font-semibold mb-4">{t("settings.storage")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: t("settings.habits"), value: data.habits.length },
                { label: t("settings.notes"), value: data.notes.length },
                {
                  label: t("settings.journalEntries"),
                  value: data.journalEntries.length,
                },
                { label: t("settings.tasks"), value: data.tasks.length },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl bg-muted p-3 text-center"
                >
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ---- SECURITY ---- */}
      {activeCategory === "security" && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <DetailHeader />
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{t("settings.security")}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {hasPassword
              ? t("settings.securityDesc1")
              : t("settings.securityDesc2")}
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
              <span className="flex items-center gap-3">
                <Shield className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">{hasPassword ? t("settings.changePassword") : t("settings.setPassword")}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{hasPassword ? t("settings.securityDesc1") : t("settings.securityDesc2")}</span>
                </span>
              </span>
              <button onClick={() => setShowPasswordSetup(true)} className="shrink-0 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background transition-all hover:opacity-90">
                {hasPassword ? "Change" : "Set"}
              </button>
            </div>
            <BiometricToggle />
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
              <span className="flex items-center gap-3">
                <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">Data encryption</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">All data encrypted with AES-256 in your browser</span>
                </span>
              </span>
              <Check className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
              <span className="flex items-center gap-3">
                <Monitor className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">Offline-first</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">All data stored locally on your device</span>
                </span>
              </span>
              <Check className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
        </motion.div>
      )}

      {/* ---- LEGAL ---- */}
      {activeCategory === "legal" && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-4">
            <ScrollText className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">{t("settings.legal")}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t("settings.legalDesc")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {legalLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-all duration-200"
              >
                {t(l.tKey)}
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
              </Link>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground/40">
            {t("settings.affiliationDisclaimer")}
          </p>
        </motion.div>
      )}

      {/* ---- UPDATE ---- */}
      {activeCategory === "about" && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <DetailHeader />
          <h2 className="text-lg font-bold">{t("settings.about")}</h2>

          {/* Version + Status */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="text-sm font-mono font-medium">{LEXIS_VERSION}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="text-sm text-emerald-500 font-medium">{t("settings.upToDate")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">AI Model</span>
              <span className="text-sm font-medium">Ethos 4.7</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Framework</span>
              <span className="text-sm font-medium">Next.js + Electron</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Privacy</span>
              <span className="text-sm font-medium">All data local</span>
            </div>
          </div>

          {/* Check for updates */}
          <button
            onClick={async () => {
              try {
                const res = await fetch("/version.json?t=" + Date.now(), { cache: "no-store" });
                const json = await res.json();
                if (json.version && json.version !== LEXIS_VERSION) {
                  window.dispatchEvent(new CustomEvent("lexis:update-available", { detail: { version: json.version } }));
                  alert(t("settings.updateAvailable") + " — v" + json.version);
                } else {
                  alert(t("settings.upToDate") + " (v" + LEXIS_VERSION + ")");
                }
              } catch {
                alert("Could not check for updates.");
              }
            }}
            className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary-500/40 hover:bg-secondary/40 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="h-4 w-4 text-primary-500" />
              <div>
                <p className="text-sm font-medium">{t("settings.updateCheck") || "Check for updates"}</p>
                <p className="text-xs text-muted-foreground">{t("settings.updateCheckDesc") || "See if a newer version of Lexis is available"}</p>
              </div>
            </div>
          </button>

          {/* Download update */}
          <a
            href="https://app.lexisapp.xyz/downloads"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary-500/40 hover:bg-secondary/40 active:scale-[0.98]"
          >
            <Download className="h-4 w-4 text-primary-500" />
            <div>
              <p className="text-sm font-medium">{t("settings.updateDownload")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.updateDownloadDesc") || "Download the latest version for your device"}</p>
            </div>
          </a>
        </motion.div>
      )}

      {/* ---- ABOUT (legacy, now merged above) ---- */}
      {/* ---- Modals ---- */}
      {showConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <AlertTriangle className="h-7 w-7 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2">
              {t("settings.clearTitle")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("settings.clearDesc")}
            </p>
            {isPasswordSet() && (
              <div className="mb-4">
                <input
                  type="password"
                  value={clearPassword}
                  onChange={(e) => {
                    setClearPassword(e.target.value);
                    setClearPasswordError("");
                  }}
                  placeholder="Enter your password to confirm"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary-500/40"
                  autoFocus
                />
                {clearPasswordError && (
                  <p className="mt-1.5 text-xs text-red-400">
                    {clearPasswordError}
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setClearPassword("");
                  setClearPasswordError("");
                }}
                className="btn-secondary flex-1"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleClear}
                disabled={clearing}
                className="flex-1 rounded-xl bg-zinc-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("settings.deleteEverything")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showSwitch && (
        <LexisSwitch
          onClose={() => {
            setShowSwitch(false);
            refresh();
          }}
          onComplete={() => {
            setShowSwitch(false);
            refresh();
          }}
        />
      )}

      {showPasswordSetup && (
        <div className="fixed inset-0 z-[100]">
          <PasswordGate
            mode="setup"
            onUnlock={() => {
              setShowPasswordSetup(false);
              setHasPassword(true);
            }}
          />
        </div>
      )}
    </div>
  );
}

