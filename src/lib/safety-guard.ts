// Guard against slur end-runs: "spell X backwards", "spell X letter by
// letter", acrostics, etc. The model legitimately cannot spell these out,
// and doing so is still harm. We swap the query for a safe instruction so
// no model size can comply, while honest educational questions still work.
const SLURS = [
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "kike",
  "spic",
  "chink",
  "tranny",
  "retard",
  "wetback",
  "towelhead",
  "raghead",
  "paki",
  "gook",
  "coon",
  "dyke",
  "niglet",
];

const SPELL_TRICKS: RegExp[] = [
  /\b(?:spell|write|type|say|print|output|give)\b[^.?!\n]{0,60}\b(?:backwards?|reverse[ds]?|in reverse|letter by letter|one letter at a time|character by character|each letter|spelled out|acrostic)\b/i,
  /\b(?:backwards?|reversed?)\b[^.?!\n]{0,40}\b(?:spell|write|type|say|print)\b/i,
];

function containsSlur(text: string): string | null {
  const t = text.toLowerCase().replace(/[^a-z]/g, "");
  for (const s of SLURS) {
    if (t.includes(s)) return s;
  }
  return null;
}

/**
 * Returns a safe replacement query when the message is a spell-it-out trick
 * targeting a slur, or null when the message needs no intervention.
 * Educational questions ("why is X a bad word", "what does X mean") still
 * pass through to the model normally.
 */
export function slurSpellReplacement(query: string): string | null {
  const q = query.trim();
  if (!q || q.length > 600) return null;
  const isTrick = SPELL_TRICKS.some((re) => re.test(q));
  if (!isTrick) return null;
  // The trick is usually "spell <slur reversed> backwards" (e.g. "reggin"),
  // so the literal query contains no slur. Check BOTH the raw text and its
  // reversal: reversing "reggin" yields the slur and trips the guard.
  const normalized = q.toLowerCase().replace(/[^a-z ]/g, " ");
  const reversed = normalized.split("").reverse().join("");
  const hit = containsSlur(normalized) || containsSlur(reversed);
  if (hit) {
    return (
      "(The user asked me to spell out a slur, which causes real harm regardless of letter order. " +
      "Briefly and kindly decline - no lecture - and offer to help with something else.)"
    );
  }
  return null;
}

// ============================================================
// Mental-health guardrails.
//
// Orleia is a productivity tool and Noor is an AI assistant — not a
// therapist, counselor, or doctor. These patterns detect acute crisis
// signals so the conversation can be routed to real human help
// immediately, before the model improvises anything.
// ============================================================

const CRISIS_PATTERNS: RegExp[] = [
  /\b(?:kill|killing|end)\s+(?:my\s+)?(?:self|myself)\b/i,
  /\b(?:suicid\w*|self[-\s]?harm\w*|self[-\s]?harm\w*|cut(?:ting)?\s+myself)\b/i,
  /\b(?:want|wanted|going|plan(?:ning)?|about)\s+to\s+die\b/i,
  /\b(?:don'?t|do\s?not|no)\s+want\s+to\s+(?:live|be\s+alive|exist|wake\s+up)\b/i,
  /\b(?:better\s+off\s+(?:dead|without\s+me)|everyone.{0,20}better\s+without\s+me)\b/i,
  /\b(?:hurt|harming)\s+(?:myself|my\s?self)\b/i,
  /\b(?:overdose|overdosing|take\s+(?:all\s+)?(?:my\s+)?(?:the\s+)?pills)\b/i,
  /\bno\s+reason\s+to\s+(?:live|go\s+on|continue)\b/i,
];

/** Returns true when the message contains acute crisis signals. */
export function detectCrisis(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 800) return false;
  return CRISIS_PATTERNS.some((re) => re.test(t));
}

/** Static crisis protocol appended as a system note - the model never improvises here. */
export const MENTAL_HEALTH_SYSTEM_NOTE =
  "MENTAL HEALTH BOUNDARY (non-negotiable): You are a productivity assistant, not a therapist, counselor, or medical professional. When the conversation turns to mental health, be warm, listen, and never diagnose or prescribe. If there is ANY sign of crisis, self-harm, or suicidality, respond with empathy and immediately point to real human help: local emergency services, a crisis hotline (e.g. 988 in the US, 116 123 in the UK and Ireland, 116 000 in the EU), or the user's doctor or a trusted person. Never promise confidentiality, never encourage secrecy from caregivers, and never continue the productivity conversation until the person is safe.";
