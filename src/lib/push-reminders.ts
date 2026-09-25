"use client";

// ============================================================
// Orleia Web Push — notifications that work when the app is CLOSED.
//
// Flow:
//   1. While Orleia is open, the in-app ReminderCenter owns
//      notifications. The server schedule is kept EMPTY.
//   2. The moment the app is hidden or closed (visibilitychange ->
//      hidden / pagehide), we upload a forward-looking schedule of the
//      next 7 DAYS of reminders via navigator.sendBeacon — sendBeacon
//      survives page teardown, fetch() does not. The multi-day horizon
//      is essential: a today-only schedule went silent the moment the
//      date rolled over, because nothing re-armed it overnight.
//   3. The external cron (every 5 min) pushes anything due from that
//      schedule through the service worker, even with Orleia closed.
//   4. Next time Orleia opens, the schedule is cleared again.
//
// iOS note: Web Push works on iOS 16.4+ but ONLY for PWAs added to
// the Home Screen. The in-app bell keeps working everywhere else.
// ============================================================

import { getDeviceId } from "./device-id";
import { format } from "date-fns";
import { calculateStreak, getToday } from "./utils";
import { getReminderSettings } from "./reminders";
import type { AppData } from "@/types";

const PUSH_ENDPOINT_KEY = "orleia-push-endpoint";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
}

let swRegistering: Promise<ServiceWorkerRegistration | null> | null = null;

/**
 * Register /sw.js once. Historically NOTHING registered the worker, so
 * reminders.ts always fell back to page-only notifications. This makes
 * the SW real: it controls the page (SW notifications + push + click
 * routing) and survives page closes for incoming pushes.
 */
export function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }
  if (!swRegistering) {
    swRegistering = navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Deploy-propagation flow: check for an updated worker on every
        // open. If one is found, activate it NOW (skipWaiting via the
        // worker's message handler) — the next navigation runs the new
        // build. Without this, a waiting worker (and its new cache) can
        // sit idle until every tab closes, so users kept running old
        // bundles across deploys.
        try {
          reg.addEventListener("updatefound", () => {
            const nw = reg.installing;
            nw?.addEventListener("statechange", () => {
              if (nw.state === "installed" && navigator.serviceWorker.controller) {
                nw.postMessage("SKIP_WAITING");
              }
            });
          });
        } catch { /* update flow is best-effort */ }
        return reg;
      })
      .then(async (reg) => {
        try { await reg.update(); } catch { /* offline — keep current */ }
        return reg;
      })
      .catch(() => null);
  }
  return swRegistering;
}

export interface ScheduledReminder {
  /** unique dedup id, e.g. "habit:abc123:2026-09-14:evening" */
  id: string;
  /** ISO timestamp of when to notify */
  at: string;
  title: string;
  body: string;
  href: string;
}

/** Does an identical push notification already exist in today's sent log? */
function wasSentToday(id: string): boolean {
  try {
    const sent = JSON.parse(localStorage.getItem("orleia-reminders-sent") || "{}");
    const today = getToday();
    return Boolean(sent[`${id}:${today}`] || sent[`${id}`]);
  } catch {
    return false;
  }
}

/** Skip items that would duplicate a notification already shown in-app today. */
function filterAlreadySent(items: ScheduledReminder[]): ScheduledReminder[] {
  return items.filter((i) => !wasSentToday(i.id));
}

/**
 * Subscribe this device to Web Push and register the subscription with
 * the server. Idempotent — reuses an existing subscription.
 */
export async function ensurePushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  if (Notification.permission !== "granted") return null;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublic) return null;

  const reg = (await ensureServiceWorker()) || (await navigator.serviceWorker.ready);
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublic).buffer as ArrayBuffer,
    });
  }

  try { localStorage.setItem(PUSH_ENDPOINT_KEY, sub.endpoint); } catch { /* ignore */ }
  return sub;
}

/** Remove this device's subscription + schedule (opt-out). */
export async function removePushSubscription(): Promise<void> {
  try {
    const endpoint = localStorage.getItem(PUSH_ENDPOINT_KEY);
    if (endpoint) {
      await fetch(`/api/reminders/subscribe?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "DELETE",
      });
    }
    const reg = (await ensureServiceWorker()) || (await navigator.serviceWorker.ready);
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    localStorage.removeItem(PUSH_ENDPOINT_KEY);
  } catch {
    // best-effort
  }
}

// ------------------------------------------------------------
// Future schedule generation
// ------------------------------------------------------------

/** Habit time-of-day -> the earliest wall-clock minute it nudges. */
const TIME_OF_DAY_MIN: Record<string, number> = {
  morning: 9 * 60,
  afternoon: 14 * 60,
  evening: 19 * 60,
  anytime: 12 * 60,
};

function atHM(base: Date, minutes: number): Date {
  const d = new Date(base);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

/**
 * Expand one calendar event into its occurrence on `day` (or null).
 * Mirrors the calendar page's recurrence rules exactly so a repeating
 * event nudges on every occurrence, not just its start date.
 */
function eventOccurrenceOn(ev: AppData["calendarEvents"][number], day: string): AppData["calendarEvents"][number] | null {
  if (ev.repeat === "none") return ev.date === day ? ev : null;
  if (day < ev.date) return null;
  const d1 = new Date(ev.date + "T00:00:00");
  const d2 = new Date(day + "T00:00:00");
  const diffDays = Math.round((d2.getTime() - d1.getTime()) / 86400000);
  if (ev.repeat === "daily") return ev;
  if (ev.repeat === "weekly" && diffDays % 7 === 0) return ev;
  if (ev.repeat === "monthly" && d2.getDate() === d1.getDate()) return ev;
  return null;
}

/**
 * Build the next 7 DAYS of reminders as future-dated schedule items:
 *  - calendar events, pushed 30 MINUTES before the event starts
 *  - habit streaks at risk, nudged in their time-of-day window
 *  - tasks with a due date/time (due soon; overdue nudges are today-only)
 *  - the daily breathing break at the user's chosen time
 * Anything already shown in-app today (sent log) is skipped.
 *
 * The multi-day horizon is the whole point: this schedule is uploaded
 * when the app is hidden/closed, so after midnight it must still cover
 * the NEW day. A today-only schedule silently died overnight — the cron
 * found nothing to send and the closed app went quiet for a whole day.
 */
export function buildFutureSchedule(data: AppData): ScheduledReminder[] {
  const out: ScheduledReminder[] = [];
  const now = new Date();
  const settings = getReminderSettings();
  const push = (
    id: string, at: Date, title: string, body: string, href: string
  ) => {
    if (at.getTime() <= now.getTime()) return; // window already passed
    out.push({ id, at: at.toISOString(), title, body, href });
  };

  // Arm up to 7 days ahead: the server holds the schedule while the app
  // is closed, so it must keep working across midnight boundaries.
  for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
    const dayDate = new Date();
    dayDate.setDate(dayDate.getDate() + dayOffset);
    const day = format(dayDate, "yyyy-MM-dd");

    // Habits: log that day to keep the streak.
    for (const h of data.habits) {
      if (h.archived || !settings.habits) continue;
      if (data.habitLogs.some((l) => l.habitId === h.id && l.date === day)) continue;
      const loggedDates = data.habitLogs.filter((l) => l.habitId === h.id).map((l) => l.date);
      const streak = calculateStreak(loggedDates);
      if (streak.current < 2) continue; // same bar as the situation model
      if (h.frequency === "weekly" && Array.isArray(h.customDays) && h.customDays.length > 0) {
        if (!h.customDays.includes(dayDate.getDay())) continue;
      }
      const at = atHM(dayDate, TIME_OF_DAY_MIN[h.timeOfDay] ?? 12 * 60);
      push(
        `habit:${h.id}:${day}`,
        at,
        h.name,
        `${streak.current}-day streak - log today to keep it`,
        "/habits"
      );
    }

    // Tasks: nudge when the due moment arrives; overdue items nudge at ONE
    // fixed evening slot (18:00) on TODAY only — never "now + 10 min" (that
    // re-armed a new push on every app close and nagged the same task all
    // day long), and never day after day for a week.
    for (const t of data.tasks) {
      if (t.status === "done" || t.status === "archived" || !t.dueDate || !settings.tasks) continue;
      if (t.dueDate < day) {
        if (dayOffset !== 0) continue;
        const at = atHM(dayDate, 18 * 60); // one overdue nudge per day, fixed slot
        push(`task:${t.id}:${day}`, at, t.title, `${t.dueDate} overdue - reschedule or finish it`, "/tasks");
        continue;
      }
      if (t.dueDate !== day) continue;
      let at: Date;
      if (t.dueTime) {
        const [hh, mm] = t.dueTime.split(":").map((n) => parseInt(n, 10));
        at = atHM(dayDate, (isNaN(hh) ? 12 : hh) * 60 + (isNaN(mm) ? 0 : mm));
      } else {
        at = atHM(dayDate, 12 * 60);
      }
      const when =
        dayOffset === 0
          ? "Due today" + (t.dueTime ? ` at ${t.dueTime}` : "")
          : `Due ${format(dayDate, "EEE d MMM")}` + (t.dueTime ? `, ${t.dueTime}` : "");
      push(`task:${t.id}:${day}`, at, t.title, when, "/tasks");
    }

    // Calendar events: push 30 minutes before the event starts (timed
    // events only — an all-day event has no meaningful "before" moment).
    if (settings.events) {
      for (const ev of data.calendarEvents || []) {
        const occ = eventOccurrenceOn(ev, day);
        if (!occ || !occ.time) continue;
        const [hh, mm] = occ.time.split(":").map((n) => parseInt(n, 10));
        if (isNaN(hh)) continue;
        const startMin = hh * 60 + (isNaN(mm) ? 0 : mm);
        push(
          `event:${ev.id}:${day}`,
          atHM(dayDate, Math.max(0, startMin - 30)),
          occ.title,
          dayOffset === 0 ? `Starts at ${occ.time}` : `Starts ${format(dayDate, "EEE d MMM")} at ${occ.time}`,
          "/calendar"
        );
      }
    }

    // Wellness: daily breathing break at the user's chosen time.
    const wt = data.theme.wellnessTime;
    if (settings.wellness && wt) {
      const parts = wt.split(":").map((n) => parseInt(n, 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        push(
          `wellness:daily-breath:${day}`,
          atHM(dayDate, parts[0] * 60 + parts[1]),
          "Time for a breathing break",
          "One minute of box breathing - close your eyes and breathe",
          "/journal"
        );
      }
    }
  }

  // Nearest first, then cap: the ceiling only exists as a corrupt-payload
  // guard. A user with several DAILY timed events blows past 20 items in the
  // 7-day horizon on event rows alone (5 events x 7 days = 35), so every
  // reminder beyond the cap silently never armed — calendar pushes "didn't
  // work" while tasks did. 120 items x ~300 bytes still fits the 64 KB
  // server guard with room to spare.
  return filterAlreadySent(out).sort((a, b) => a.at.localeCompare(b.at)).slice(0, 120);
}

// ------------------------------------------------------------
// Upload paths
// ------------------------------------------------------------

/** POST the schedule using sendBeacon — survives page hide/close. */
export function beaconSchedule(endpoint: string, items: ScheduledReminder[]): boolean {
  try {
    const payload = JSON.stringify({
      endpoint,
      deviceId: getDeviceId(),
      items: items.slice(0, 120),
    });
    const blob = new Blob([payload], { type: "application/json" });
    return navigator.sendBeacon("/api/reminders/schedule", blob);
  } catch {
    return false;
  }
}

/**
 * Upload a schedule with a normal fetch (used outside page teardown,
 * e.g. testing the pipeline from Settings).
 */
export async function uploadSchedule(items: ScheduledReminder[]): Promise<boolean> {
  const sub = await ensurePushSubscription();
  if (!sub) return false;
  try {
    const res = await fetch("/api/reminders/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, deviceId: getDeviceId(), items: items.slice(0, 120) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** The app is open — cancel scheduled pushes (in-app handles it now). */
export async function clearPushSchedule(): Promise<void> {
  if (!isPushSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    const sub = await ensurePushSubscription();
    if (!sub) return;
    await fetch("/api/reminders/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, deviceId: getDeviceId(), items: [] }),
    });
  } catch {
    // ignore
  }
}

/** Register the subscription with the server (called on app open). */
export async function registerPushOnServer(): Promise<void> {
  if (!isPushSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    const sub = await ensurePushSubscription();
    if (!sub) return;
    const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
    if (!json.keys?.p256dh || !json.keys?.auth) return;
    await fetch("/api/reminders/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        deviceId: getDeviceId(),
        keys: json.keys,
      }),
    });
  } catch {
    // ignore
  }
}
