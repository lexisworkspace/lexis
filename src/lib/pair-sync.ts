// Paired-mode sync.
//
// When a phone opens the pairing QR, it lands on the REAL Orleia app - the
// desktop's pairing server reverse-proxies app.orleia.app over the LAN, so
// the phone runs the exact same app (including its mobile UI) from an HTTP
// origin. That origin is the discriminator: paired mode is only active when
// the app was loaded over plain HTTP (the LAN proxy) with a pairing token in
// the URL. On the real HTTPS site nothing here ever activates.
//
// While paired, this module:
//   - bootstraps the desktop's workspace into the phone's storage once,
//   - pushes local changes back to the desktop as actions (the desktop
//     applies them to ITS storage, so the desktop UI updates too),
//   - polls the desktop snapshot and adopts it when the phone has no
//     pending pushes, keeping both devices converged with the desktop as
//     the source of truth.
//
// No account, no cloud: the only "server" is the desktop itself.

import { storage } from "./storage";
import type { AppData } from "@/types";

const TOKEN_KEY = "orleia-pair-token";

/** True only inside the LAN proxy origin with a session token. */
export function isPaired(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.protocol !== "http:") return false; // the real site is HTTPS
  return !!sessionStorage.getItem(TOKEN_KEY);
}

/** Called at boot (head script + client layout) to capture the token from
 * the QR URL before any navigation can drop the query string. */
export function capturePairToken(): void {
  if (typeof window === "undefined") return;
  if (window.location.protocol !== "http:") return;
  const token = new URLSearchParams(window.location.search).get("token");
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
}

function apiUrl(path: string): string {
  return path + "?token=" + encodeURIComponent(sessionStorage.getItem(TOKEN_KEY) || "");
}

let lastSnapshot: AppData | null = null;
// The exact workspace JSON the desktop last sent. Compared before every
// import: when the desktop is unchanged, importing would otherwise fire
// saveData() -> notify() and re-render the whole app every poll cycle -
// on a phone that swallows taps and pegs the CPU.
let lastJson: string | null = null;
let pendingPushes = 0;
let started = false;

// Deep-copy the current storage state. The storage returns LIVE objects -
// mutating them in place (logHabit, createTask, ...) would otherwise make
// "last snapshot" and "now" the same object, so the diff would never see
// any change and nothing would ever push.
function deepSnapshot(): AppData {
  return JSON.parse(JSON.stringify(storage.getData()));
}

/** Does this workspace hold any REAL content (vs a fresh install)?
 * onboardingCompleted alone doesn't count - a desktop that just finished
 * onboarding with zero habits/tasks/notes/journal is still effectively
 * empty, and a phone that started on mobile should be able to send its
 * workspace there. */
function hasContent(d: AppData | null): boolean {
  if (!d) return false;
  return (
    (d.habits || []).length > 0 ||
    (d.tasks || []).length > 0 ||
    (d.notes || []).length > 0 ||
    (d.journalEntries || []).length > 0
  );
}

export type PairedBootstrap =
  | { status: "ready" } // desktop data adopted - phone mirrors the desktop
  | { status: "phone-first" } // phone has data, desktop is empty -> ask to push
  | { status: "error" };

/** Fetch the desktop's workspace and decide the sync direction.
 *
 * Normal case (desktop has data): the phone adopts it and mirrors the
 * desktop. Phone-first case (phone started on mobile, desktop is fresh):
 * importing would WIPE the phone's data with an empty desktop, so instead
 * we report "phone-first" and let the UI ask whether to push the phone's
 * workspace to the desktop. */
export async function bootstrapPaired(): Promise<PairedBootstrap> {
  try {
    const res = await fetch(apiUrl("/api/data"), { cache: "no-store" });
    if (res.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      return { status: "error" };
    }
    if (!res.ok) return { status: "error" };
    const json = await res.text();
    let desktop: AppData | null = null;
    try {
      desktop = JSON.parse(json);
    } catch {
      desktop = null;
    }
    // Phone already has a workspace and the desktop is empty -> offer to
    // send the phone's data to the desktop instead of wiping it.
    if (!hasContent(desktop) && hasContent(storage.getData())) {
      return { status: "phone-first" };
    }
    if (!storage.importData(json)) return { status: "error" };
    lastSnapshot = deepSnapshot();
    lastJson = json;
    return { status: "ready" };
  } catch {
    return { status: "error" };
  }
}

/** Phone-first sync: push THIS device's whole workspace to the desktop.
 * The desktop replaces its own data (it was empty), then we adopt it back
 * so both devices converge and normal two-way sync takes over. */
export async function pushWorkspaceToDesktop(): Promise<boolean> {
  try {
    const json = storage.exportData();
    const res = await fetch(apiUrl("/api/action"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "workspace.import", json }),
      cache: "no-store",
    });
    if (!res.ok) return false;
    // Desktop now holds our data - adopt it so lastJson/lastSnapshot line up.
    const adopted = await bootstrapPaired();
    return adopted.status === "ready";
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Diff -> actions: what changed locally since the last snapshot.     */
/* ------------------------------------------------------------------ */

function logKey(l: { habitId: string; date?: string }): string {
  return l.habitId + "|" + String(l.date || "").slice(0, 10);
}

export function diffToActions(prev: AppData, next: AppData): unknown[] {
  const actions: unknown[] = [];

  // Tasks: added / status flipped / deleted.
  const prevTasks = new Map((prev.tasks || []).map((t) => [t.id, t]));
  for (const t of next.tasks || []) {
    const p = prevTasks.get(t.id);
    if (!p) actions.push({ type: "task.add", title: t.title, dueDate: t.dueDate });
    else if (p.status !== t.status) actions.push({ type: "task.toggle", taskId: t.id });
  }
  for (const t of prev.tasks || []) {
    if (!next.tasks.some((n) => n.id === t.id) && t.status !== "done" && t.status !== "archived") {
      actions.push({ type: "task.delete", taskId: t.id });
    }
  }

  // Habits: added.
  const prevHabits = new Map((prev.habits || []).map((h) => [h.id, h]));
  for (const h of next.habits || []) {
    if (!prevHabits.has(h.id) && !h.archived) actions.push({ type: "habit.add", name: h.name });
  }

  // Habit logs: entries that appeared / disappeared toggle on/off.
  const prevLogs = new Set((prev.habitLogs || []).map(logKey));
  const nextLogs = new Set((next.habitLogs || []).map(logKey));
  for (const l of next.habitLogs || []) {
    if (!prevLogs.has(logKey(l))) {
      actions.push({ type: "habit.toggle", habitId: l.habitId, date: String(l.date || "").slice(0, 10) });
    }
  }
  for (const l of prev.habitLogs || []) {
    if (!nextLogs.has(logKey(l))) {
      actions.push({ type: "habit.toggle", habitId: l.habitId, date: String(l.date || "").slice(0, 10) });
    }
  }

  // Journal: new dates.
  const prevDates = new Set((prev.journalEntries || []).map((e) => e.date));
  for (const e of next.journalEntries || []) {
    if (!prevDates.has(e.date)) actions.push({ type: "journal.add", date: e.date, content: e.content });
  }

  return actions;
}

/* ------------------------------------------------------------------ */
/* Push local changes + poll the desktop.                              */
/* ------------------------------------------------------------------ */

export function startPairSync(): void {
  if (!isPaired() || started) return;
  started = true;

  let adopting = false;

  // Local changes -> push actions to the desktop.
  storage.subscribe(() => {
    if (adopting) return;
    const next = deepSnapshot();
    if (!lastSnapshot) {
      lastSnapshot = next;
      return;
    }
    const actions = diffToActions(lastSnapshot, next);
    lastSnapshot = next;
    if (actions.length === 0) return;
    pendingPushes += actions.length;
    for (const action of actions) {
      fetch(apiUrl("/api/action"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
        cache: "no-store",
      })
        .catch(() => {})
        .finally(() => {
          pendingPushes = Math.max(0, pendingPushes - 1);
        });
    }
  });

  // Desktop changes -> adopt the snapshot (only when nothing of ours is
  // still in flight, so we never clobber an unsynced local change).
  const poll = async () => {
    if (!isPaired() || pendingPushes > 0 || adopting || document.visibilityState !== "visible") return;
    try {
      const res = await fetch(apiUrl("/api/data"), { cache: "no-store" });
      if (res.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        location.reload();
        return;
      }
      if (!res.ok) return;
      const json = await res.text();
      // Nothing changed on the desktop - skip the import entirely so no
      // re-render fires. This is what keeps the phone UI responsive while
      // paired (import -> save -> notify re-renders the whole app).
      if (json === lastJson) return;
      adopting = true;
      try {
        if (storage.importData(json)) {
          lastSnapshot = deepSnapshot();
          lastJson = json;
        }
      } finally {
        adopting = false;
      }
    } catch {
      /* desktop unreachable - try again on the next tick */
    }
  };

  window.setInterval(poll, 3000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") poll();
  });
  poll();
}

/* ------------------------------------------------------------------ */
/* Mobile-initiated pairing: scan a QR from desktop Settings           */
/* ------------------------------------------------------------------ */

const DESKTOP_URL_KEY = "orleia-desktop-url";
const DESKTOP_TOKEN_KEY = "orleia-desktop-token";

/** Check if this device is in mobile-initiated pair mode. */
export function isMobilePaired(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(DESKTOP_URL_KEY) && !!localStorage.getItem(DESKTOP_TOKEN_KEY);
}

/** Get the stored desktop connection info. */
export function getDesktopConnectionInfo(): { url: string; token: string } | null {
  if (typeof window === "undefined") return null;
  const url = localStorage.getItem(DESKTOP_URL_KEY);
  const token = localStorage.getItem(DESKTOP_TOKEN_KEY);
  if (!url || !token) return null;
  return { url, token };
}

/** Test if a desktop pair server is reachable. */
export async function testDesktopConnection(desktopUrl: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(desktopUrl + "/api/ping?token=" + encodeURIComponent(token), {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

/** Connect to a desktop pair server (scanned from QR code). */
export async function connectToDesktop(desktopUrl: string, token: string): Promise<{ ok: boolean; error?: string }> {
  // Test the connection first
  const reachable = await testDesktopConnection(desktopUrl, token);
  if (!reachable) {
    return { ok: false, error: "Desktop not reachable. Make sure you're on the same WiFi network and Orleia Desktop is open." };
  }

  // Fetch the desktop's workspace
  try {
    const res = await fetch(desktopUrl + "/api/data?token=" + encodeURIComponent(token), {
      cache: "no-store",
    });
    if (res.status === 401) return { ok: false, error: "Invalid pairing token. Try scanning the QR code again." };
    if (!res.ok) return { ok: false, error: "Could not fetch workspace from desktop." };
    const json = await res.text();

    // Import the desktop's data
    if (!storage.importData(json)) return { ok: false, error: "Invalid workspace data from desktop." };

    // Store connection info
    localStorage.setItem(DESKTOP_URL_KEY, desktopUrl);
    localStorage.setItem(DESKTOP_TOKEN_KEY, token);

    // Initialize sync state
    lastSnapshot = deepSnapshot();
    lastJson = json;

    return { ok: true };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || e) };
  }
}

/** Disconnect from the desktop. */
export function disconnectFromDesktop(): void {
  localStorage.removeItem(DESKTOP_URL_KEY);
  localStorage.removeItem(DESKTOP_TOKEN_KEY);
  lastSnapshot = null;
  lastJson = null;
}

/** Start polling for mobile-initiated sync. Call this at app boot. */
export function startMobileSync(): void {
  if (!isMobilePaired() || started) return;
  started = true;

  const info = getDesktopConnectionInfo();
  if (!info) return;

  const desktopApi = (path: string) => info.url + path + "?token=" + encodeURIComponent(info.token);

  let adopting = false;

  // Local changes -> push actions to the desktop
  storage.subscribe(() => {
    if (adopting) return;
    const next = deepSnapshot();
    if (!lastSnapshot) {
      lastSnapshot = next;
      return;
    }
    const actions = diffToActions(lastSnapshot, next);
    lastSnapshot = next;
    if (actions.length === 0) return;
    pendingPushes += actions.length;
    for (const action of actions) {
      fetch(desktopApi("/api/action"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
        cache: "no-store",
      })
        .catch(() => {})
        .finally(() => {
          pendingPushes = Math.max(0, pendingPushes - 1);
        });
    }
  });

  // Desktop changes -> adopt the snapshot
  const poll = async () => {
    if (!isMobilePaired() || pendingPushes > 0 || adopting || document.visibilityState !== "visible") return;
    try {
      const res = await fetch(desktopApi("/api/data"), { cache: "no-store" });
      if (res.status === 401) {
        disconnectFromDesktop();
        return;
      }
      if (!res.ok) return;
      const json = await res.text();
      if (json === lastJson) return;
      adopting = true;
      try {
        if (storage.importData(json)) {
          lastSnapshot = deepSnapshot();
          lastJson = json;
        }
      } finally {
        adopting = false;
      }
    } catch {
      /* desktop unreachable - try again */
    }
  };

  window.setInterval(poll, 3000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") poll();
  });
  poll();
}
