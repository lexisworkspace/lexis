// ============================================================
// Habit game layer — streak freezes + personal records.
//
// Duolingo-style mechanics, local-first (all state in AppData):
//  - freezeTokens: earned one per perfect week (all habits checked
//    every day, Mon–Sun). Auto-spent to bridge a SINGLE missed day
//    so a streak survives instead of dying.
//  - frozenDates: per-habit calendar days protected by a spent token.
//  - records: personal-best streak per habit (freeze-aware).
//  - perfectWeeks: count of perfect weeks (lifetime stat).
//
// Pure functions over log dates — no storage imports, so the habits
// page (and any future surface) can compose them freely.
// ============================================================

import { addDays, format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { getToday } from "@/lib/utils";

export interface FreezeState {
  freezeTokens: number;
  frozenDates: Record<string, string[]>;
  records: Record<string, number>;
  perfectWeeks: number;
  lastPerfectWeek?: string; // ISO monday of the last awarded week
}

const DEFAULT: FreezeState = {
  freezeTokens: 0,
  frozenDates: {},
  records: {},
  perfectWeeks: 0,
};

export function getFreezeState(data: any): FreezeState {
  return {
    freezeTokens: data?.streakFreezeTokens ?? DEFAULT.freezeTokens,
    frozenDates: data?.habitFrozenDates ?? {},
    records: data?.habitStreakRecords ?? {},
    perfectWeeks: data?.perfectWeeks ?? 0,
    lastPerfectWeek: data?.lastPerfectWeek,
  };
}

/** Write the freeze state back into AppData (mutates + saves). */
export function setFreezeState(
  storageApi: { getData: () => any; saveData: () => void },
  next: FreezeState
): void {
  const data = storageApi.getData();
  data.streakFreezeTokens = next.freezeTokens;
  data.habitFrozenDates = next.frozenDates;
  data.habitStreakRecords = next.records;
  data.perfectWeeks = next.perfectWeeks;
  data.lastPerfectWeek = next.lastPerfectWeek;
  storageApi.saveData();
}

const dayStr = (d: Date) => format(d, "yyyy-MM-dd");

/** Which of the last `lookback` days (ending yesterday) are missing a log. */
export function missingDays(
  habitId: string,
  loggedDates: Set<string>,
  lookback = 3
): string[] {
  const out: string[] = [];
  const yesterday = dayStr(addDays(parseISO(getToday()), -1));
  for (let i = 1; i <= lookback; i++) {
    const d = dayStr(addDays(parseISO(yesterday), -(i - 1)));
    if (!loggedDates.has(d)) out.push(d);
  }
  return out;
}

/**
 * Auto-protect a streak: if the streak is about to die (last log is
 * 2+ days ago, i.e. yesterday was missed) and a token is available,
 * spend one and mark the earliest missing day as frozen.
 * Returns the updated state, or null if nothing happened.
 */
export function autoFreeze(
  state: FreezeState,
  habitId: string,
  loggedDates: Set<string>
): FreezeState | null {
  const missing = missingDays(habitId, loggedDates, 3);
  if (missing.length === 0 || state.freezeTokens <= 0) return null;

  const sorted = [...loggedDates].sort().reverse();
  const lastLog = sorted[0];
  if (!lastLog) return null;

  // Only intervene while the streak is still alive: last log is today
  // or the first missing day is exactly yesterday.
  const yesterday = dayStr(addDays(parseISO(getToday()), -1));
  const isYesterdayMissed = lastLog === dayStr(addDays(parseISO(yesterday), -1));
  if (lastLog !== getToday() && !isYesterdayMissed) return null;

  // Bridge ONE day (the most recent gap) — the freeze saves the streak,
  // it doesn't rewrite history.
  const target = missing[0];
  if (state.frozenDates[habitId]?.includes(target)) return null;

  return {
    ...state,
    freezeTokens: state.freezeTokens - 1,
    frozenDates: {
      ...state.frozenDates,
      [habitId]: [...(state.frozenDates[habitId] ?? []), target],
    },
  };
}

/**
 * Award a freeze token for a perfect week: every active habit logged
 * on every day from Monday to Sunday. Evaluated once per week
 * (idempotent via lastPerfectWeek).
 */
export function checkPerfectWeek(
  state: FreezeState,
  allHabits: { id: string }[],
  logsByDate: Map<string, Set<string>> // date -> habitIds logged
): { state: FreezeState; awarded: boolean } {
  const now = new Date();
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  const sunday = endOfWeek(now, { weekStartsOn: 1 });

  // Only completed weeks (after this Sunday) can be perfect.
  if (now < sunday) {
    // Allow evaluating YESTERDAY's completed week on Monday morning.
    const lastMonday = addDays(monday, -7);
    const lastSunday = addDays(sunday, -7);
    if (now < lastSunday) return { state, awarded: false };
    return evaluate(state, allHabits, logsByDate, lastMonday, lastSunday);
  }
  return evaluate(state, allHabits, logsByDate, monday, sunday);
}

function evaluate(
  state: FreezeState,
  allHabits: { id: string }[],
  logsByDate: Map<string, Set<string>>,
  monday: Date,
  sunday: Date
): { state: FreezeState; awarded: boolean } {
  const mondayKey = dayStr(monday);
  if (state.lastPerfectWeek === mondayKey) return { state, awarded: false };
  if (allHabits.length === 0) return { state, awarded: false };

  for (let d = 0; d < 7; d++) {
    const day = dayStr(addDays(monday, d));
    const logged = logsByDate.get(day);
    if (!logged) return { state, awarded: false };
    for (const h of allHabits) {
      if (!logged.has(h.id)) return { state, awarded: false };
    }
  }

  return {
    state: {
      ...state,
      freezeTokens: state.freezeTokens + 1,
      perfectWeeks: state.perfectWeeks + 1,
      lastPerfectWeek: mondayKey,
    },
    awarded: true,
  };
}

/**
 * Streak math, freeze-aware: frozen days count as "logged" for
 * continuity. Also updates the personal record when current > best.
 * Returns current streak, whether a record was just set, and the
 * updated state (record may change).
 */
export function freezeAwareStreak(
  state: FreezeState,
  habitId: string,
  loggedDates: string[]
): { current: number; longest: number; recordBeaten: boolean; state: FreezeState } {
  const frozen = new Set(state.frozenDates[habitId] ?? []);
  const all = new Set([...loggedDates, ...frozen]);

  const today = getToday();
  const sorted = [...all].sort().reverse();

  // Current streak: walk back from today/yesterday across no gaps.
  let current = 0;
  const last = sorted[0];
  if (last && (last === today || last === dayStr(addDays(parseISO(today), -1)))) {
    let cursor = last === today ? parseISO(today) : parseISO(dayStr(addDays(parseISO(today), -1)));
    let walk = last;
    while (walk && all.has(walk)) {
      current++;
      const prev = dayStr(addDays(cursor, -1));
      walk = all.has(prev) ? prev : "";
      cursor = parseISO(prev);
    }
  }

  // Longest run across the whole merged set (frozen days included).
  const asc = [...all].sort();
  let longest = asc.length ? 1 : 0;
  let run = 1;
  for (let i = 1; i < asc.length; i++) {
    const prev = dayStr(addDays(parseISO(asc[i]), -1));
    if (prev === asc[i - 1]) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // Personal record (stored best so far) + record-beaten moment.
  const stored = state.records[habitId] ?? 0;
  let recordBeaten = false;
  let nextState = state;
  if (current > stored && current > 0) {
    recordBeaten = stored > 0; // first-ever streak isn't a "record beaten" moment
    nextState = { ...state, records: { ...state.records, [habitId]: current } };
  }

  return { current, longest: Math.max(longest, stored), recordBeaten, state: nextState };
}

/** Flame color stage by time of day when today's check-in is still missing. */
export function flameStage(date = new Date()): "ok" | "warn" | "danger" {
  const h = date.getHours();
  if (h >= 18) return "danger";
  if (h >= 12) return "warn";
  return "ok";
}
