// ============================================================
// Dictation cleanup - filler removal only.
// Strips filler words and stutters from Whisper transcripts.
// No LLM, no rewriting, no added content - the user's words stay
// exactly as spoken (minus the ums and uhs).
// ============================================================

const FILLER_RE =
  /\b(?:um+|uh+|er+|hmm+|erm+|ah+|uhh+|eh+)\b/gi;

// Filler phrases that are almost never meaningful in dictation.
const FILLER_PHRASE_RE =
  /\b(?:you know|i mean|sort of|kind of|i guess|you see|like basically|basically like|kind of like|sort of like|you know what i mean|you know what|you know like|like you know|and like|so like|but like|it was like|that was like|this is like|i was like|we were like)\b/gi;

// "like" as a discourse marker is only stripped when it is clearly filler:
// a comma follows it ("like, I was thinking..."). This preserves real usage
// like "I like pizza" and "She looks like her mother".
const LIKE_COMMA_RE = /(^|[\s(,])like(?=\s*,)/gi;

// Repeated words from stutters: "I I want", "the the meeting"
const STUTTER_RE = /\b(\w+)(\s+\1\b)+/gi;

export function localCleanTranscript(raw: string): string {
  let t = raw;
  t = t.replace(FILLER_RE, " ");
  t = t.replace(FILLER_PHRASE_RE, " ");
  t = t.replace(LIKE_COMMA_RE, "$1 ");
  t = t.replace(STUTTER_RE, (m, word) => word);
  // Collapse whitespace + stray punctuation artifacts
  t = t.replace(/\s+/g, " ").trim();
  // Repeated punctuation: "hello. . goodbye"
  t = t.replace(/([.!?])\s*([.!?])+/g, "$1 ");
  // Fix spacing around punctuation: "hello , world" -> "hello, world"
  t = t.replace(/\s+([,.!?;:])/g, "$1");
  // Strip leading punctuation/comma artifacts ("like, I..." -> "I...")
  t = t.replace(/^[\s,;:.!?]+/, "");
  // Capitalize the first letter
  if (t.length > 0) {
    t = t.charAt(0).toUpperCase() + t.slice(1);
  }
  return t;
}
