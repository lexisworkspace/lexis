// ============================================================
// Orleia - global search
// Searches every content module at once (notes, tasks, journal,
// habits) and returns ranked, grouped results with snippets.
// Pure function over AppData - instant, private, no API calls.
// ============================================================

import type { AppData } from "@/types";

export type SearchKind = "note" | "task" | "journal" | "habit" | "spreadsheet";

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  snippet: string;
  href: string;
  score: number;
  updatedAt: string;
}

export interface SearchGroup {
  kind: SearchKind;
  label: string;
  results: SearchResult[];
}

export const SEARCH_LABELS: Record<SearchKind, string> = {
  note: "Notes",
  task: "Tasks",
  journal: "Journal",
  habit: "Habits",
  spreadsheet: "Grid",
};

function plainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Build a snippet centered around the first match, with … padding. */
function snippetAround(text: string, q: string, radius = 42): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + q.length + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return prefix + text.slice(start, end).trim() + suffix;
}

/**
 * Search everything. Returns groups in a fixed order, each limited.
 * Score: title match >> content match, + recency (days) bonus.
 */
export function globalSearch(data: AppData, rawQuery: string, perGroup = 5): SearchGroup[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];

  const now = Date.now();
  const recencyBonus = (dateStr: string) => {
    const t = new Date(dateStr || 0).getTime();
    if (!t) return 0;
    const days = (now - t) / 86400000;
    return days < 3 ? 2 : days < 14 ? 1 : 0;
  };

  const noteResults: SearchResult[] = [];
  for (const n of data.notes) {
    if (n.archived) continue;
    const title = n.title || "Untitled";
    const content = plainText(n.contentHtml) || n.content || "";
    const tl = title.toLowerCase();
    let score = 0;
    if (tl.includes(q)) score += 6;
    if (content.toLowerCase().includes(q)) score += 3;
    if (score === 0) continue;
    score += recencyBonus(n.updatedAt);
    noteResults.push({
      kind: "note",
      id: n.id,
      title,
      snippet: tl.includes(q) ? content.slice(0, 90) || "—" : snippetAround(content, q),
      href: `/notes?open=${n.id}`,
      score,
      updatedAt: n.updatedAt,
    });
  }

  const taskResults: SearchResult[] = [];
  for (const t of data.tasks) {
    if (t.status === "archived") continue;
    const title = t.title;
    const content = [t.description, t.tags.join(" ")].filter(Boolean).join(" ");
    const tl = title.toLowerCase();
    let score = 0;
    if (tl.includes(q)) score += 6;
    if (content.toLowerCase().includes(q)) score += 3;
    if (score === 0) continue;
    score += recencyBonus(t.createdAt);
    const statusTag =
      t.status === "done" ? "Done" : t.status === "in_progress" ? "In progress" : t.dueDate ? `Due ${t.dueDate}` : "To do";
    taskResults.push({
      kind: "task",
      id: t.id,
      title,
      snippet: content ? snippetAround(content, q) : statusTag,
      href: "/tasks",
      score,
      updatedAt: t.createdAt,
    });
  }

  const journalResults: SearchResult[] = [];
  for (const j of data.journalEntries) {
    const title = j.title || j.date || "Journal entry";
    const content = [j.content, ...(j.gratitude || [])].filter(Boolean).join(" ");
    const tl = title.toLowerCase();
    let score = 0;
    if (tl.includes(q)) score += 6;
    if (content.toLowerCase().includes(q)) score += 3;
    if (score === 0) continue;
    score += recencyBonus(j.date || j.updatedAt);
    journalResults.push({
      kind: "journal",
      id: j.id,
      title,
      snippet: tl.includes(q) ? content.slice(0, 90) || "—" : snippetAround(content, q),
      href: "/journal",
      score,
      updatedAt: j.updatedAt || j.date || "",
    });
  }

  const habitResults: SearchResult[] = [];
  for (const h of data.habits) {
    if (h.archived) continue;
    const title = h.name;
    const content = h.description || "";
    const tl = title.toLowerCase();
    let score = 0;
    if (tl.includes(q)) score += 6;
    if (content.toLowerCase().includes(q)) score += 3;
    if (score === 0) continue;
    score += recencyBonus(h.createdAt);
    habitResults.push({
      kind: "habit",
      id: h.id,
      title,
      snippet: content ? snippetAround(content, q) : "—",
      href: "/habits",
      score,
      updatedAt: h.createdAt,
    });
  }

  const spreadsheetResults: SearchResult[] = [];
  for (const ss of data.spreadsheets) {
    const title = ss.name || "Untitled spreadsheet";
    const tl = title.toLowerCase();
    let score = 0;
    if (tl.includes(q)) score += 6;
    // Content match: sheet names + cell values (formulas excluded).
    const cellText = ss.sheets
      .map((s) => Object.values(s.cells || {}).map((c) => c?.value || "").join(" "))
      .join(" ")
      .toLowerCase();
    if (cellText.includes(q)) score += 3;
    if (score === 0) continue;
    score += recencyBonus(ss.updatedAt);
    spreadsheetResults.push({
      kind: "spreadsheet",
      id: ss.id,
      title,
      snippet: tl.includes(q) ? `${ss.sheets.length} sheet${ss.sheets.length === 1 ? "" : "s"}` : snippetAround(cellText.slice(0, 400), q),
      href: `/grid?open=${ss.id}`,
      score,
      updatedAt: ss.updatedAt,
    });
  }

  const sort = (a: SearchResult, b: SearchResult) =>
    b.score - a.score || b.updatedAt.localeCompare(a.updatedAt);

  const build = (kind: SearchKind, label: string, results: SearchResult[]): SearchGroup => ({
    kind,
    label,
    results: results.sort(sort).slice(0, perGroup),
  });

  const groups = [
    build("note", SEARCH_LABELS.note, noteResults),
    build("spreadsheet", SEARCH_LABELS.spreadsheet, spreadsheetResults),
    build("task", SEARCH_LABELS.task, taskResults),
    build("journal", SEARCH_LABELS.journal, journalResults),
    build("habit", SEARCH_LABELS.habit, habitResults),
  ].filter((g) => g.results.length > 0);

  return groups;
}
