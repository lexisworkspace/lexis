"use client";

// ============================================================
// Import from other tools — local-first migration.
// Parses common export formats entirely in the browser: Todoist
// CSV, TickTick CSV, Things CSV, plain markdown checklists.
// Nothing uploads anywhere; parsing + import happen on-device.
// ============================================================

import { storage } from "@/lib/storage";
import type { Task } from "@/types";

export type ImportSource = "todoist" | "ticktick" | "things" | "markdown";

export interface ImportPreviewItem {
  title: string;
  dueDate: string | null;
  priority: Task["priority"];
  tags: string[];
}

export interface ImportPreview {
  source: ImportSource | null;
  fileName: string;
  items: ImportPreviewItem[];
  skipped: number;
  error: string | null;
}

const PRIORITIES: Task["priority"][] = ["low", "medium", "high", "urgent"];

function toOrleiaPriority(numericPriority: number): Task["priority"] {
  // Different tools use different scales; normalize to Orleia's four.
  if (numericPriority >= 4) return "urgent";
  if (numericPriority === 3) return "high";
  if (numericPriority === 2) return "medium";
  return "low";
}

/** RFC-4180-ish CSV line splitter honoring quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(text: string, source: ImportSource): ImportPreview {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { source, fileName: "", items: [], skipped: 0, error: "File looks empty." };

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const col = (...names: string[]) =>
    header.findIndex((h) => names.some((n) => h === n || h.includes(n)));

  const cContent = col("content", "title", "task", "name");
  if (cContent < 0) {
    return { source, fileName: "", items: [], skipped: 0, error: "No task-title column found." };
  }
  const cDue = col("due date", "duedate", "due", "date");
  const cPriority = col("priority");
  const cTags = col("labels", "tags", "list", "project");

  const items: ImportPreviewItem[] = [];
  let skipped = 0;
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const title = (cells[cContent] || "").trim();
    if (!title) { skipped++; continue; }

    let dueDate: string | null = null;
    const rawDue = cDue >= 0 ? cells[cDue] : "";
    if (rawDue) {
      const d = new Date(rawDue);
      if (!Number.isNaN(d.getTime())) dueDate = d.toISOString().slice(0, 10);
    }
    let priority: Task["priority"] = "low";
    if (cPriority >= 0 && cells[cPriority]) {
      const n = parseInt(cells[cPriority], 10);
      // Todoist: P1 = most urgent. TickTick/Things: higher = more urgent.
      priority = toOrleiaPriority(source === "todoist" ? 5 - (n || 1) : n || 1);
    }
    const tags = cTags >= 0 && cells[cTags]
      ? cells[cTags].split(/[,;|]/).map((s) => s.trim()).filter(Boolean).slice(0, 5)
      : [];

    items.push({ title: title.slice(0, 200), dueDate, priority, tags });
  }
  return { source, fileName: "", items, skipped, error: null };
}

function parseMarkdown(text: string): ImportPreview {
  const items: ImportPreviewItem[] = [];
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    const m = /^\s*[-*+]\s+\[( |x|X)\]\s+(.*)$/.exec(raw);
    if (!m) { skipped++; continue; }
    let title = m[2].trim();
    if (!title) { skipped++; continue; }

    // Supports natural-language fragments: @yyyy-mm-dd, !high / !!!, #tag
    let dueDate: string | null = null;
    title = title.replace(/@(\d{4}-\d{2}-\d{2})\b/, (_s, d) => { dueDate = d; return ""; });
    let priority: Task["priority"] = "low";
    if (/!!!|!high\b/i.test(title)) priority = "high";
    title = title.replace(/!{1,3}(high|med|low)?\b/i, "").trim();
    const tags: string[] = [];
    title = title.replace(/#([\w-]+)/g, (_s, tg) => { tags.push(tg); return ""; });
    title = title.replace(/\s{2,}/g, " ").trim();

    items.push({ title: title.slice(0, 200), dueDate, priority, tags: tags.slice(0, 5) });
  }
  if (items.length === 0) {
    return { source: "markdown", fileName: "", items, skipped, error: "No markdown checkboxes (- [ ]) found." };
  }
  return { source: "markdown", fileName: "", items, skipped, error: null };
}

/** Parse an imported file into a preview. never throws. */
export function parseImportFile(fileName: string, text: string): ImportPreview {
  const lower = fileName.toLowerCase();
  try {
    if (lower.endsWith(".csv")) {
      const head = text.slice(0, 2000).toLowerCase();
      const source: ImportSource = head.includes("todoist") ? "todoist"
        : head.includes("ticktick") ? "ticktick"
        : head.includes("things") ? "things"
        : "todoist"; // generic CSV: column sniffing handles the rest
      return { ...parseCsv(text, source), fileName };
    }
    if (lower.endsWith(".md") || lower.endsWith(".markdown") || lower.endsWith(".txt")) {
      return { ...parseMarkdown(text), fileName };
    }
    return { source: null, fileName, items: [], skipped: 0, error: "Unsupported file — export a CSV or markdown checklist." };
  } catch {
    return { source: null, fileName, items: [], skipped: 0, error: "That file could not be read." };
  }
}

/** Commit a preview: create real Orleia tasks in the Inbox list. */
export function commitImport(preview: ImportPreview): number {
  if (!preview.items.length) return 0;
  const note = `Imported${preview.source ? ` from ${preview.source}` : ""}${preview.fileName ? ` (${preview.fileName})` : ""}`;
  let created = 0;
  for (const item of preview.items) {
    storage.createTask({
      title: item.title,
      description: note,
      status: "todo",
      priority: item.priority,
      dueDate: item.dueDate,
      dueTime: null,
      completedAt: null,
      tags: item.tags,
      listId: "inbox",
      projectId: null,
      recurring: "none",
      recurringEndDate: null,
      estimatedMinutes: null,
    });
    created++;
  }
  return created;
}
