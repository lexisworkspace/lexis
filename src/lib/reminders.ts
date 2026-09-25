"use client";

// ============================================================
// Orleia Reminders
// Gentle browser notifications built on the Brain situation model:
//   - habit streaks at risk of breaking
//   - overdue tasks
//   - tasks you keep mentioning in notes/journal
// Fully local: nothing leaves the device, and each item nudges at
// most once per day (dedup lives in localStorage).
// ============================================================

import type { AppData } from "@/types";
import type { GraphIndex } from "@/lib/graph/types";
import { buildSituationModel } from "@/lib/graph/situation";
import { ensureWired, getGraph } from "@/lib/graph/engine";
import { getToday } from "@/lib/utils";
import { storage } from "./storage";

export type ReminderKind = "event" | "habit" | "task" | "mention" | "wellness";

export interface ReminderItem {
  kind: ReminderKind;
  id: string;
  title: string;
  body: string;
  href: string;
}

export interface ReminderSettings {
  enabled: boolean;
  events: boolean;
  habits: boolean;
  tasks: boolean;
  mentions: boolean;
  wellness: boolean;
  desktopNotifications: boolean;
}

const SENT_KEY = "orleia-reminders-sent";
const MAX_PER_CHECK = 3;

export function getReminderSettings(): ReminderSettings {
  const theme = storage.getData().theme;
  return {
  // On by default: the reminders feature is core to the product, and a
  // silent default-off left schedules empty so background push never fired
  // (users who never visited Settings got nothing). Users can still turn
  // it off in Settings; that writes an explicit false which we honor.
  enabled: theme.remindersEnabled ?? true,
    events: theme.remindEvents ?? true,
    habits: theme.remindHabits ?? true,
    tasks: theme.remindTasks ?? true,
    mentions: theme.remindMentions ?? true,
    wellness: theme.remindWellness ?? false,
    desktopNotifications: theme.desktopNotifications ?? true,
  };
}

/** Permission state helper for the Settings UI. */
export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function requestReminderPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/** Deterministic list of reminders due right now, from the situation model. */
export function computeReminders(data: AppData, graph: GraphIndex): ReminderItem[] {
  const settings = getReminderSettings();
  const out: ReminderItem[] = [];

  // Evening threshold: after 18:00, unlogged 2+ day streaks escalate from a
  // gentle nudge to an explicit "expires tonight" warning (once per day each).
  const nowD = new Date();
  const curMin = nowD.getHours() * 60 + nowD.getMinutes();
  const EXPIRY_MIN = 18 * 60;

  // Calendar events starting within 30 minutes: the in-app twin of the
  // push schedule's "30 min before" nudge (the push fires when the app is
  // closed; this covers the open-app case). Timed events only; repeats
  // expand exactly like the calendar page does. Dedup id includes the day,
  // so a repeating event nudges once per occurrence, never per check.
  if (settings.events) {
    const day = getToday();
    for (const ev of data.calendarEvents || []) {
      if (!ev.time) continue;
      const d1 = new Date(ev.date + "T00:00:00");
      const d2 = new Date(day + "T00:00:00");
      if (ev.repeat === "none") {
        if (ev.date !== day) continue;
      } else {
        if (day < ev.date) continue;
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / 86400000);
        if (ev.repeat === "weekly" && diffDays % 7 !== 0) continue;
        if (ev.repeat === "monthly" && d2.getDate() !== d1.getDate()) continue;
      }
      const [hh, mm] = ev.time.split(":").map((n) => parseInt(n, 10));
      if (isNaN(hh)) continue;
      const startMin = hh * 60 + (isNaN(mm) ? 0 : mm);
      if (curMin < startMin - 30 || curMin >= startMin) continue;
      out.push({
        kind: "event",
        id: `event:${ev.id}:${day}`, // same shape as the push schedule id so
        // the client sent-log suppresses the matching server push
        title: ev.title,
        body: `Starts at ${ev.time}`,
        href: "/calendar",
      });
    }
  }

  // Daily breathing break - fires once the chosen time of day has passed.
  const wt = data.theme.wellnessTime;
  if (settings.wellness && wt) {
    const parts = wt.split(":").map((n) => parseInt(n, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const atMin = parts[0] * 60 + parts[1];
      if (nowMin >= atMin) {
        out.push({
          kind: "wellness",
          id: "daily-breath",
          title: "Time for a breathing break",
          body: "One minute of box breathing - close your eyes and breathe",
          href: "/journal",
        });
      }
    }
  }

  const s = buildSituationModel(data, graph);
  for (const r of s.risks) {
    if (r.kind === "habit") {
      if (curMin >= EXPIRY_MIN && r.streak) {
        // Evening escalation - own dedup id, so morning nudge and evening
        // warning are each once-per-day and never more than 2 per habit.
        out.push({
          kind: "habit",
          id: "expire-" + r.id,
          title: `${r.streak}-day streak expires tonight`,
          body: `Log "${r.title}" before midnight to keep it alive`,
          href: "/habits",
        });
      } else {
        out.push({ kind: "habit", id: r.id, title: r.title, body: r.detail, href: r.href });
      }
    } else {
      out.push({
        kind: "task",
        id: r.id,
        title: r.title,
        body: r.detail,
        href: r.href,
      });
    }
  }
  for (const m of s.taskMentions) {
    if (m.score < 3) continue; // same bar as the Daily Brief
    out.push({
      kind: "mention",
      id: m.id,
      title: m.title,
      body: `Mentioned ${m.count}x in your notes - maybe it deserves a plan`,
      href: "/tasks",
    });
  }
  return out;
}

function loadSent(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Fire one notification if it hasn't been sent for this item today.
 *  Uses the service worker when available (better notification handling,
 *  click-to-navigate, works in more contexts). Falls back to the raw
 *  Notification API. */
export function sendReminder(item: ReminderItem): boolean {
  const settings = getReminderSettings();
  // If desktop notifications are explicitly disabled, skip browser notifications
  // (the in-app ReminderCenter still works regardless)
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  if (settings.desktopNotifications === false) return false;
  const today = getToday();
  const sent = loadSent();
  const key = `${item.kind}:${item.id}:${today}`;
  if (sent[key]) return false;

  const tag = `orleia-${item.kind}-${item.id}`;

  // Prefer service worker notification (better lifecycle management)
  if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
    try {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(item.title, {
          body: item.body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag,
          data: { href: item.href },
          // vibrate: [100, 50, 100],  // Not in TS types but works in browsers
        });
      });
    } catch {
      // Fall through to raw API
    }
  } else {
    // Fallback: raw Notification API
    try {
      const n = new Notification(item.title, { body: item.body, tag });
      n.onclick = () => {
        window.focus();
        window.dispatchEvent(new CustomEvent<string>("orleia:reminder-open", { detail: item.href }));
        n.close();
      };
    } catch {
      return false;
    }
  }

  sent[key] = today;
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(sent));
  } catch {
    // Quota/private-mode hiccup - the notification still fired.
  }
  return true;
}

/**
 * Run a full reminder pass: respects settings + permission, dedups per
 * item per day, and caps the burst at MAX_PER_CHECK. Returns how many
 * notifications were actually fired.
 */
export function notifyDueReminders(): number {
  const settings = getReminderSettings();
  if (!settings.enabled) return 0;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return 0;

  let data: AppData;
  try {
    data = storage.getData();
  } catch {
    return 0;
  }

  ensureWired();
  const items = computeReminders(data, getGraph()).filter((i) =>
    i.kind === "event" ? settings.events : i.kind === "habit" ? settings.habits : i.kind === "task" ? settings.tasks : i.kind === "mention" ? settings.mentions : settings.wellness
  );
  const priority = { event: 0, habit: 0, task: 1, mention: 2, wellness: 3 } as const;
  items.sort((a, b) => priority[a.kind] - priority[b.kind]);

  let sent = 0;
  for (const item of items) {
    if (sent >= MAX_PER_CHECK) break;
    if (sendReminder(item)) sent++;
  }

  // Prune yesterday's dedup entries so today starts clean.
  const today = getToday();
  const map = loadSent();
  let changed = false;
  for (const k of Object.keys(map)) {
    if (map[k] !== today) {
      delete map[k];
      changed = true;
    }
  }
  if (changed) {
    try {
      localStorage.setItem(SENT_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  }
  return sent;
}

/**
 * Quick check: fire notifications for any newly-due reminders.
 * Called on focus, visibility change, and at short intervals.
 */
export function checkAndNotify(): number {
  const settings = getReminderSettings();
  if (!settings.enabled) return 0;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return 0;
  if (settings.desktopNotifications === false) return 0;

  let data: AppData;
  try {
    data = storage.getData();
  } catch {
    return 0;
  }

  ensureWired();
  const items = computeReminders(data, getGraph()).filter((i) =>
    i.kind === "event" ? settings.events : i.kind === "habit" ? settings.habits : i.kind === "task" ? settings.tasks : i.kind === "mention" ? settings.mentions : settings.wellness
  );
  const priority = { event: 0, habit: 0, task: 1, mention: 2, wellness: 3 } as const;
  items.sort((a, b) => priority[a.kind] - priority[b.kind]);

  let sent = 0;
  for (const item of items) {
    if (sent >= 2) break; // Max 2 per quick check
    if (sendReminder(item)) sent++;
  }
  return sent;
}

// ============================================================
// In-app notification center
// The same situation model, surfaced as a bell + panel + toast so
// reminders work on every device (including iOS Safari, where the
// browser Notification API doesn't exist). Dismissing an item
// snoozes it for the day - the badge reflects what's pending NOW.
// ============================================================

const DISMISSED_KEY = "orleia-reminders-dismissed";

/**
 * Dismissed state now lives in AppData.reminderDismissed so it syncs
 * across paired devices. The localStorage fallback is only used when
 * AppData isn't available yet (before storage.init).
 */
function loadDismissed(data?: AppData): Record<string, string> {
  if (data?.reminderDismissed) return data.reminderDismissed;
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDismissed(map: Record<string, string>): void {
  // Write to AppData so it syncs across paired devices
  try {
    const data = storage.getData();
    data.reminderDismissed = map;
    storage.saveData();
  } catch {
    // Fallback to localStorage if storage isn't ready
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(map));
    } catch {
      // private mode / quota - the bell still reflects live state
    }
  }
}

/** Dismiss an item for the rest of today (badge stops counting it). */
export function dismissReminder(item: ReminderItem): void {
  const map = loadDismissed();
  map[`${item.kind}:${item.id}`] = getToday();
  saveDismissed(map);
}

export function dismissAllReminders(): void {
  const data = storage.getData();
  const items = computeReminders(data, getGraph());
  const map: Record<string, string> = {};
  const today = getToday();
  for (const item of items) {
    map[`${item.kind}:${item.id}`] = today;
  }
  saveDismissed(map);
}

function pruneDismissed(map: Record<string, string>): Record<string, string> {
  const today = getToday();
  let changed = false;
  for (const k of Object.keys(map)) {
    if (map[k] !== today) {
      delete map[k];
      changed = true;
    }
  }
  return changed ? map : map;
}

/**
 * Reminders due right now that the user hasn't dismissed today,
 * honoring the same settings toggles as browser notifications.
 */
export function pendingReminders(data: AppData, graph: GraphIndex): ReminderItem[] {
  const settings = getReminderSettings();
  if (!settings.enabled) return [];
  const dismissed = pruneDismissed(loadDismissed(data));
  return computeReminders(data, graph).filter((i) => {
    if (i.kind === "habit" ? !settings.habits : i.kind === "task" ? !settings.tasks : i.kind === "mention" ? !settings.mentions : !settings.wellness) {
      return false;
    }
    return !dismissed[`${i.kind}:${i.id}`];
  });
}
