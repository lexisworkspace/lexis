// ============================================================
// iOS share sheet — thin wrapper over the Web Share API.
// On iPhone Safari / installed PWA this opens the NATIVE share
// sheet (copy, Messages, Mail, AirDrop...). On unsupported
// browsers it falls back to clipboard copy and reports that.
// ============================================================

export interface ShareResult {
  ok: boolean;
  /** True when the fallback path (clipboard) was used. */
  fallback: boolean;
}

/**
 * Share text via the native share sheet when available, clipboard
 * otherwise. `title` maps to the iOS share header.
 */
export async function shareText(title: string, text: string): Promise<ShareResult> {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (typeof nav.share === "function") {
    try {
      await nav.share({ title, text });
      return { ok: true, fallback: false };
    } catch {
      // User dismissed the sheet — not an error, just done.
      return { ok: false, fallback: false };
    }
  }
  // Fallback: clipboard copy.
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true, fallback: true };
  } catch {
    return { ok: false, fallback: true };
  }
}

/** Build the plain-text export of a note (markdown-ish, readable). */
export function noteToText(title: string, contentHtml: string): string {
  const div = typeof document !== "undefined" ? document.createElement("div") : null;
  const body = div ? (div.innerHTML = contentHtml, div.textContent || "") : "";
  return `${title}\n\n${body.trim()}`;
}

/** Build the plain-text export of a deck (one line per bullet). */
export function deckToText(title: string, description: string, slides: { title: string; content: string[] }[]): string {
  const parts = slides.map((s, i) => {
    const bullets = (s.content || []).map((c) => `  - ${c}`).join("\n");
    return `${i + 1}. ${s.title}\n${bullets}`;
  });
  return `${title}\n${description || ""}\n\n${parts.join("\n\n")}`;
}
