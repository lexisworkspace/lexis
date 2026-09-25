"use client";

// ============================================================
// Orleia Calendar — natural language quick-add parser.
// Cron-style: type "Gym with Tom tomorrow 18:00" or "Standup every
// monday 9:15" and get a structured event. 100% local, zero deps.
//
// Grammar (all parts optional except the title):
//   [every daily|weekly|monthly] [on <date words>] [at <time>] <title>
//   <title> [tomorrow|today|tonight] [at <time>] [<weekday>] [in N weeks]
// Examples that parse:
//   Gym with Tom tomorrow 18:00
//   Mom's birthday 26 Sep
//   Standup every monday 9:15
//   Dentist fri at 14:30
//   Release in 2 weeks at 17:00
//   Family dinner saturday 19:00 1h30m
// ============================================================

export interface ParsedEvent {
  title: string;
  date: string; // yyyy-mm-dd
  time: string | null; // HH:mm or null (all-day)
  endTime: string | null; // HH:mm or null
  repeat: "none" | "daily" | "weekly" | "monthly";
}

const WEEKDAYS = [
  ["sun", "sunday"],
  ["mon", "monday"],
  ["tue", "tues", "tuesday"],
  ["wed", "weds", "wednesday"],
  ["thu", "thur", "thurs", "thursday"],
  ["fri", "friday"],
  ["sat", "saturday"],
] as const;

const MONTHS = [
  ["jan", "january"],
  ["feb", "february"],
  ["mar", "march"],
  ["apr", "april"],
  ["may"],
  ["jun", "june"],
  ["jul", "july"],
  ["aug", "august"],
  ["sep", "sept", "september"],
  ["oct", "october"],
  ["nov", "november"],
  ["dec", "december"],
] as const;

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseTimeToken(tok: string): string | null {
  // 9, 9:15, 9.15, 0915, 18:00, 6pm, 6:30pm, 9am
  const m =
    tok.match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/i) ||
    tok.match(/^(\d{3,4})$/) ||
    tok.match(/^(\d{1,2})\s*(am|pm)$/i);
  if (!m) return null;
  let h: number;
  let min = 0;
  if (m.length >= 3 && /^(am|pm)$/i.test(m[2] ?? "")) {
    h = parseInt(m[1], 10) % 12;
    if (/pm/i.test(m[2])) h += 12;
  } else if (m.length >= 4 && m[3]) {
    h = parseInt(m[1], 10) % 12;
    if (/pm/i.test(m[3])) h += 12;
  } else if (tok.match(/^\d{3,4}$/)) {
    const s = tok.padStart(4, "0");
    h = parseInt(s.slice(0, 2), 10);
    min = parseInt(s.slice(2), 10);
  } else {
    h = parseInt(m[1], 10);
    min = m[2] ? parseInt(m[2], 10) : 0;
  }
  if (isNaN(h) || isNaN(min) || h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Parse a duration token like "1h", "45m", "1h30m", "1.5h" -> minutes. */
function parseDuration(tok: string): number | null {
  const m = tok.match(/^(\d+(?:[.,]\d+)?)(h|hr|hrs|hour|hours|m|min|mins|minutes)$/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  if (isNaN(n)) return null;
  return /^h/i.test(m[2]) ? Math.round(n * 60) : Math.round(n);
}

export function parseQuickEvent(input: string, today = new Date()): ParsedEvent | null {
  let text = input.trim();
  if (!text) return null;

  const result: ParsedEvent = {
    title: text,
    date: iso(today),
    time: null,
    endTime: null,
    repeat: "none",
  };

  // ---- Repeat ----
  const rep = text.match(/\b(every|daily|weekly|monthly)\b/i);
  if (rep) {
    const w = rep[1].toLowerCase();
    if (w === "daily") {
      result.repeat = "daily";
      text = text.replace(/\bdaily\b/i, "");
    } else if (w === "weekly") {
      result.repeat = "weekly";
      text = text.replace(/\bweekly\b/i, "");
    } else if (w === "monthly") {
      result.repeat = "monthly";
      text = text.replace(/\bmonthly\b/i, "");
    } else {
      // "every" — look ahead for a weekday; otherwise treat as daily
      const after = text.slice(rep.index! + rep[0].length).trim();
      const wd = WEEKDAYS.findIndex((names) =>
        names.some((n) => new RegExp(`^${n}\\b`, "i").test(after))
      );
      if (wd >= 0) result.repeat = "weekly";
      else result.repeat = "daily";
      text = text.replace(/\bevery\b/i, "");
    }
  }

  // ---- Explicit relative days ----
  const rel = text.match(/\b(today|tonight|tomorrow|tmr)\b/i);
  if (rel) {
    if (/tomorrow|tmr/i.test(rel[1])) today.setDate(today.getDate() + 1);
    result.date = iso(today);
    if (/tonight/i.test(rel[1]) && !result.time) result.time = "19:00";
    text = text.replace(rel[0], "");
  }

  // ---- "in N days/weeks" ----
  const inD = text.match(/\bin\s+(\d+)\s*(day|days|week|weeks)\b/i);
  if (inD) {
    const n = parseInt(inD[1], 10);
    today.setDate(today.getDate() + (inD[2].toLowerCase().startsWith("week") ? n * 7 : n));
    result.date = iso(today);
    text = text.replace(inD[0], "");
  }

  // ---- Weekday (next occurrence) ----
  const wdMatch = text.match(
    new RegExp(`\\b(${WEEKDAYS.flat().join("|")})\\b`, "i")
  );
  if (wdMatch) {
    const name = wdMatch[1].toLowerCase();
    const wd = WEEKDAYS.findIndex((names) => names.some((n) => n === name));
    const cur = today.getDay();
    let delta = (wd - cur + 7) % 7;
    if (delta === 0) delta = 7; // "monday" on a Monday = next Monday
    today.setDate(today.getDate() + delta);
    result.date = iso(today);
    text = text.replace(wdMatch[0], "");
  }

  // ---- Explicit date: "26 sep", "sep 26", "2026-09-26", "26/09" ----
  // Lookarounds keep these away from times (10:30-11:30) and durations (9.5h).
  const dmy = /(?<![:\d.])(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?(?![\d:]|\s?[\d.]*\s*(?:h|hr|hrs|hours?|m|min|mins?|minutes?)\b)/i.exec(text);
  const monthAlt = MONTHS.flat().join("|");
  const mdY = new RegExp(
    `\\b(${monthAlt})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`,
    "i"
  ).exec(text);
  const dmY = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthAlt})\\b`,
    "i"
  ).exec(text);
  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  const monthIndex = (name: string) =>
    MONTHS.findIndex((names) => names.some((n) => n === name.toLowerCase()));

  if (isoMatch) {
    result.date = isoMatch[0];
    text = text.replace(isoMatch[0], "");
  } else if (mdY || dmY) {
    const m = (mdY || dmY)!;
    const mon = monthIndex(mdY ? m[1] : m[2]);
    const day = parseInt(mdY ? m[2] : m[1], 10);
    if (mon >= 0 && day >= 1 && day <= 31) {
      const d = new Date(today);
      d.setMonth(mon, day);
      if (d < today) d.setFullYear(d.getFullYear() + 1); // next occurrence
      result.date = iso(d);
      text = text.replace(m[0], "");
    }
  } else if (dmy) {
    const day = parseInt(dmy[1], 10);
    const mon = parseInt(dmy[2], 10) - 1;
    if (day >= 1 && day <= 31 && mon >= 0 && mon <= 11) {
      const d = new Date(today.getFullYear(), mon, day);
      if (d < today) d.setFullYear(d.getFullYear() + 1);
      result.date = iso(d);
      text = text.replace(dmy[0], "");
    }
  }

  // ---- Duration (before time so "1h" isn't read as a time) ----
  const dur = text.match(
    /(?<!\d)(\d+(?:[.,]\d+)?\s*(?:h|hr|hrs|hours?|m|min|mins?|minutes?)(?:\s*\d+\s*(?:m|min|mins?|minutes?))?)(?!\w)/i
  );
  let durMin: number | null = null;
  if (dur) {
    const parts = dur[1].match(/(\d+(?:[.,]\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minutes)/gi) || [];
    durMin = parts.reduce((acc, p) => acc + (parseDuration(p.replace(/\s+/g, "")) ?? 0), 0);
    if (!durMin) durMin = null;
    if (durMin !== null) text = text.replace(dur[0], "");
  }

  // ---- Time: "at 18:00" or a bare "18:00" / "6pm" (not a range tail) ----
  const atM = text.match(/\b(?:at|@)\s+(\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm)|\d{1,2})\b/i);
  const bareM = text.match(/(?<!\d)(?<!\d[-–]\s*)(\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm))(?!\s*[-–]\s*\d{1,2}[:.]\d{2})/i);
  const timeTok = atM ? atM[1] : bareM ? bareM[1] : null;
  if (timeTok) {
    const t = parseTimeToken(timeTok.replace(/\s+/g, ""));
    if (t) {
      result.time = t;
      // Strip the consumed token plus an optional "-11:00" range tail.
      const consumed = atM ? atM[0] : bareM![0];
      text = text.replace(consumed, "").replace(/\s*[-–]\s*\d{1,2}[:.]\d{2}\s*(?:am|pm)?/i, "");
    }
  }

  // ---- End time from duration ----
  if (result.time && durMin) {
    const [h, m] = result.time.split(":").map((n) => parseInt(n, 10));
    const end = new Date(2000, 0, 1, h, m + durMin);
    result.endTime = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  }

  // ---- Clean the title ----
  result.title = text
    .replace(/\b(at|@|on|in)\b\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+|\s+$/g, "");
  if (!result.title) result.title = input.trim();

  return result;
}
