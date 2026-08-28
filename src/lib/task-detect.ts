import { getToday } from "./utils";

export interface DetectedTask {
  text: string;
  dueDate?: string; // yyyy-MM-dd
}

const ACTION_VERBS = [
  "create", "make", "build", "develop", "write", "draft", "compose",
  "call", "email", "message", "contact", "send", "submit", "file",
  "complete", "finish", "finalize", "review", "check", "verify",
  "update", "fix", "repair", "resolve", "solve", "address",
  "prepare", "organize", "plan", "schedule", "book", "reserve",
  "buy", "purchase", "order", "get", "fetch", "pick", "collect",
  "meet", "attend", "join", "participate", "discuss", "present",
  "read", "study", "learn", "research", "explore", "investigate",
  "implement", "deploy", "launch", "publish", "share", "post",
  "clean", "organize", "tidy", "pack", "setup", "configure",
  "answer", "reply", "respond", "fill", "print", "sign", "deliver",
  "practice", "train", "prepare", "prove", "explain", "present",
  "run", "go", "visit", "eat", "ask", "talk", "speak", "find",
  "start", "stop", "begin", "save", "delete", "add", "remove",
  "open", "close", "download", "install", "upload", "move", "turn",
  "watch", "listen", "read", "record", "measure", "calculate",
  "translate", "summarize", "prove", "draw", "design", "sketch",
];

/**
 * Leading intent phrases ("I need to finish X", "I should write Y",
 * "Please call Z", "Don't forget to send W"). When matched, the phrase
 * is stripped from the sentence and the remainder becomes the task title.
 * The "to" after the modal is optional to cover "I should write..." vs
 * "I need to finish...".
 */
const LEADING_RE =
  /^(?:(?:i|we|you|they|he|she)\s+(?:also|just|really|actually|still|definitely|finally|eventually|simply)?\s*(?:need|have|want|must|should|plan|aim|hope|intend|got|would like|am going|are going|am|are)\s+(?:also|just|really|actually|still|definitely|finally|eventually|simply)?\s*(?:to\s+)?|(?:please|remember|try|make sure|be sure)\s+(?:to\s+)?|(?:don'?t|do not|never)\s+forget\s+to\s+|(?:my|our|your)\s+(?:goal|plan|priority|target)\s+is\s+to\s+|(?:i'?m|we'?re)\s+(?:going|planning|hoping)\s+to\s+)/i;

function fmt(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseRelativeDate(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return fmt(d);
  }
  if (/\btoday\b|\btonight\b/.test(lower)) return getToday();
  if (/\bnext week\b/.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return fmt(d);
  }
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${days[i]}\\b`).test(lower)) {
      const d = new Date();
      let diff = (i - d.getDay() + 7) % 7;
      if (diff === 0) diff = 7; // next occurrence, not today
      d.setDate(d.getDate() + diff);
      return fmt(d);
    }
  }
  return undefined;
}

const cleanWord = (w: string) => w.toLowerCase().replace(/[^a-z]/g, "");

/**
 * Scans free text for task-like sentences ("Finish X tomorrow",
 * "I need to finish a presentation", "Please call Y by Friday").
 * Purely local regex - instant, private, no API calls.
 */
export function detectTasks(text: string): DetectedTask[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || (text.trim() ? [text.trim()] : []);
  const tasks: DetectedTask[] = [];
  const seen = new Set<string>();

  for (const raw of sentences) {
    const s = raw.trim();
    if (!s || s.length < 3 || s.length > 160) continue;

    const hasDeadline = /\bby\b|\bdue\b|deadline|until|before|tomorrow|today|tonight|next\s+week|on\s+\w+day\b/i.test(s);

    // Strip leading intent phrases: "i need to finish a presentation" -> "finish a presentation"
    const stripped = s.replace(LEADING_RE, "");
    const leadingMatched = stripped !== s;

    const firstWord = cleanWord(stripped.split(/\s+/)[0] || "");
    const startsWithVerb = !!firstWord && ACTION_VERBS.includes(firstWord);

    // Fallback: with a leading intent phrase, any verb in the first 4 words counts
    const earlyVerb =
      leadingMatched &&
      stripped
        .split(/\s+/)
        .slice(0, 4)
        .some((w) => {
          const cw = cleanWord(w);
          return !!cw && ACTION_VERBS.includes(cw);
        });

    if (!startsWithVerb && !earlyVerb && !hasDeadline) continue;

    const text = stripped.replace(/[.!?\n]+$/, "").trim();
    if (text.length < 3) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    tasks.push({ text, dueDate: parseRelativeDate(s) });
    if (tasks.length >= 6) break;
  }

  return tasks;
}
