"use client";

/**
 * The action marker the model emits to request an action - plus the common
 * misspellings/formatting variants it drifts into (missing X, a space, a
 * hyphen, no separator). Every detection site uses these so a typo'd marker
 * can NEVER leak raw JSON into the chat: if the model can't write the exact
 * token, we still catch the shape of it and run it in the background.
 */
export const ACTION_MARKER_VARIANTS = [
  "orleia_action",
  "levis_action",
  "orleia action",
  "orleia-action",
  "orleiaaction",
] as const;

/** Matches any marker variant (case-insensitive). Non-global - safe for .test/.search. */
export const ACTION_MARKER_RE = /\b(?:orleia|levis)[-_ ]?action\b/i;

/** Matches a complete action block: fuzzy marker + optional colon + JSON. */
export const ACTION_BLOCK_RE =
  /\b(?:orleia|levis)[-_ ]?action\s*:?\s*(\{(?:[^{}]|\{[^{}]*\})*\})/gi;

/**
 * Final safety net: strips any action marker and whatever follows it
 * (complete JSON or a truncated remnant) so raw action JSON can never reach
 * the chat UI. Returns the cleaned text (possibly "").
 */
export function stripActionRemnants(text: string): string {
  if (!text) return "";
  let out = text;
  // Complete but unexecuted blocks (paranoia - normally handled earlier).
  out = out.replace(ACTION_BLOCK_RE, "");
  // If a marker still remains, the block after it is truncated/malformed -
  // drop from the marker to the end of the text. Safe: per the tool contract
  // an action block is always the final thing the model emits, so any
  // user-visible prose sits BEFORE the marker and is preserved.
  const idx = out.search(ACTION_MARKER_RE);
  if (idx >= 0) out = out.slice(0, idx);
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Cleans leaked action JSON out of a stored reply (used when loading old
 * conversations that may have been saved before the marker filters hardened).
 * Only rewrites the string when something actually needs cleaning, so loading
 * a conversation never rewrites healthy messages.
 */
export function sanitizeStoredReply(text: string): string {
  if (!text) return text;
  if (!ACTION_MARKER_RE.test(text)) return text;
  return stripActionRemnants(text);
}
