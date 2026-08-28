"use client";

import JSZip from "jszip";
import type {
  ImportResult,
  ImportedTask,
  ImportedDocument,
  ParsedFile,
  SwitchSource,
} from "./types";
import type { TaskPriority, TaskStatus } from "@/types";

/* ================================================================
 * CSV parsing (quote-aware)
 * ================================================================ */

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      if (row.some((r) => r.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((r) => r.trim() !== "")) rows.push(row);
  return rows;
}

export function csvToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = (r[i] ?? "").trim();
    });
    return obj;
  });
}

function headerIndex(header: string[], names: string[]): number {
  // Exact match first, then fall back to substring - so "due date" always
  // beats "creation date" regardless of column order.
  for (const n of names) {
    const exact = header.findIndex((h) => h === n);
    if (exact !== -1) return exact;
  }
  return header.findIndex((h) => names.some((n) => n.length >= 4 && h.includes(n)));
}

/* ================================================================
 * ZIP parsing (browser, via jszip - already a dependency)
 * ================================================================ */

export async function unzipFiles(file: File | ArrayBuffer): Promise<ParsedFile[]> {
  // Convert File -> ArrayBuffer first: jszip accepts ArrayBuffer reliably in
  // every environment (browser + Node), avoiding Blob/File quirks.
  const data =
    file instanceof ArrayBuffer ? file : await (file as File).arrayBuffer();
  const zip = await JSZip.loadAsync(data);
  const out: ParsedFile[] = [];
  const tasks: Promise<void>[] = [];
  zip.forEach((relPath, entry) => {
    if (entry.dir) return;
    const isText =
      /\.(csv|md|markdown|txt|json|html)$/i.test(relPath) && !/^__MACOSX\//.test(relPath);
    if (!isText) return;
    // Guard against giant text files in big exports - skip > 10 MB entries
    tasks.push(
      entry.async("uint8array").then((bytes) => {
        if (bytes.byteLength > 10 * 1024 * 1024) return;
        const text = new TextDecoder().decode(bytes);
        out.push({ name: relPath.split("/").pop() || relPath, path: relPath, text });
      })
    );
  });
  await Promise.all(tasks);
  return out;
}

/* ================================================================
 * Date parsing - flexible: ISO, "Mon 05 Sep", "today", "tomorrow",
 * "in 3 days", "Sep 5", weekday names.
 * Returns { date: "YYYY-MM-DD", time?: "HH:MM" } or null.
 * ================================================================ */

export function parseFlexibleDate(raw: string): { date: string; time?: string } | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Already ISO / YYYY-MM-DD (possibly with time). Note: s is lowercased,
  // so accept both 't' and 'T' as the separator.
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[t ](\d{1,2}):(\d{2}))?/);
  if (m) {
    return {
      date: `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`,
      time: m[4] ? `${pad(+m[4])}:${m[5]}` : undefined,
    };
  }
  // DD/MM/YYYY or MM/DD/YYYY (ambiguity -> treat as DD/MM if day>12 else MM/DD)
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    let a = +m[1];
    let b = +m[2];
    let y = +m[3];
    if (y < 100) y += 2000;
    if (a > 12 && b <= 12) {
      // day/month
      return { date: `${y}-${pad(b)}-${pad(a)}`, time: extractTime(s) };
    }
    return { date: `${y}-${pad(a)}-${pad(b)}`, time: extractTime(s) };
  }

  const now = new Date();

  // Relative
  if (s === "today") return { date: toYMD(now) };
  if (s === "tomorrow" || s === "tmr") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return { date: toYMD(d) };
  }
  m = s.match(/^in (\d+)\s*(day|days|week|weeks|hour|hours|min|mins|minute|minutes)?/);
  if (m) {
    const d = new Date(now);
    const n = +m[1];
    const unit = m[2] || "days";
    if (unit.startsWith("day")) d.setDate(d.getDate() + n);
    else if (unit.startsWith("week")) d.setDate(d.getDate() + n * 7);
    else if (unit.startsWith("hour")) d.setHours(d.getHours() + n);
    else d.setMinutes(d.getMinutes() + n);
    return { date: toYMD(d), time: unit.startsWith("hour") || unit.startsWith("min") ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : undefined };
  }

  // "Mon 05 Sep 09:00" / "05 Sep" / "Sep 5"
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  m = s.match(/(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\s+)?(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/i);
  if (m) {
    const day = +m[1];
    const mon = months[m[2].toLowerCase().slice(0, 3)];
    const d = new Date(now.getFullYear(), mon, day);
    if (d.getTime() < now.getTime() - 86400000) d.setFullYear(d.getFullYear() + 1);
    return { date: toYMD(d), time: extractTime(s) };
  }
  m = s.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})/i);
  if (m) {
    const day = +m[2];
    const mon = months[m[1].toLowerCase().slice(0, 3)];
    const d = new Date(now.getFullYear(), mon, day);
    if (d.getTime() < now.getTime() - 86400000) d.setFullYear(d.getFullYear() + 1);
    return { date: toYMD(d), time: extractTime(s) };
  }

  // Weekday: "monday", "friday"
  const wd: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  m = s.match(/^(next\s+)?(sun|mon|tue|wed|thu|fri|sat)[a-z]*/i);
  if (m) {
    const target = wd[m[2].toLowerCase().slice(0, 3)];
    let diff = (target - now.getDay() + 7) % 7;
    if (diff === 0 && !m[1]) diff = 7; // "monday" -> next monday, not today
    const d = new Date(now);
    d.setDate(d.getDate() + diff);
    return { date: toYMD(d), time: extractTime(s) };
  }

  // "next week"
  if (s.includes("next week")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return { date: toYMD(d) };
  }

  // ISO full datetime from APIs e.g. "2024-01-15T10:00:00.000Z"
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})t(\d{2}):(\d{2})/);
  if (m) {
    return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` };
  }

  return null;
}

function extractTime(s: string): string | undefined {
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return undefined;
  return `${String(+m[1]).padStart(2, "0")}:${m[2]}`;
}

/* ================================================================
 * Priority / status helpers
 * ================================================================ */

export function todoistPriority(n: string): TaskPriority | undefined {
  const v = parseInt(n, 10);
  if (Number.isNaN(v)) return undefined;
  // Todoist: 1 = highest ... 4 = lowest
  if (v <= 1) return "urgent";
  if (v === 2) return "high";
  if (v === 3) return "medium";
  if (v >= 4) return "low";
  return undefined;
}

export function applePriority(n: string): TaskPriority | undefined {
  const v = parseInt(n, 10);
  if (Number.isNaN(v)) return undefined;
  // Apple: 9 = high, 5 = medium, 1 = low
  if (v >= 9) return "high";
  if (v >= 5) return "medium";
  if (v >= 1) return "low";
  return undefined;
}

export function statusFromText(s: string): TaskStatus | undefined {
  const t = s.trim().toLowerCase();
  if (!t || t === "todo" || t === "to do" || t === "open" || t === "pending" || t === "not started") return "todo";
  if (t.includes("progress") || t === "doing" || t === "active" || t === "in_progress") return "in_progress";
  if (t === "done" || t === "complete" || t === "completed" || t === "closed") return "done";
  return undefined;
}

function splitTags(s: string): string[] {
  return s
    .split(/[;,|]/)
    .map((t) => t.trim().replace(/^#/, ""))
    .filter((t) => t.length > 0);
}

/* ================================================================
 * Notion - full workspace export ZIP (Markdown & CSV)
 * Database CSVs -> tasks; page markdown -> documents (folder from path)
 * ================================================================ */

export function parseNotion(files: ParsedFile[]): ImportResult {
  const tasks: ImportedTask[] = [];
  const documents: ImportedDocument[] = [];
  const warnings: string[] = [];
  const csvs = files.filter((f) => f.name.endsWith(".csv"));
  const mds = files.filter((f) => /\.md$/i.test(f.name));

  for (const f of csvs) {
    const rows = parseCSV(f.text);
    if (rows.length < 2) continue;
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const titleIdx = headerIndex(header, ["name", "title", "task", "item", "property"]);
    if (titleIdx === -1) continue; // not a task-like table
    const statusIdx = headerIndex(header, ["status", "state"]);
    const dateIdx = headerIndex(header, ["due date", "date", "when", "deadline"]);
    const prioIdx = headerIndex(header, ["priority", "importance"]);
    const tagsIdx = headerIndex(header, ["tags", "labels", "category", "categories"]);
    const doneIdx = headerIndex(header, ["done", "completed", "checked"]);

    for (const obj of csvToObjects(rows)) {
      const title = obj[header[titleIdx]] || "";
      if (!title) continue;
      const task: ImportedTask = { title, tags: [] };
      if (statusIdx !== -1) task.status = statusFromText(obj[header[statusIdx]]);
      if (doneIdx !== -1) {
        const v = obj[header[doneIdx]].toLowerCase();
        if (v === "true" || v === "yes" || v === "1" || v === "done" || v === "completed") task.status = "done";
      }
      if (prioIdx !== -1) {
        const v = obj[header[prioIdx]].toLowerCase();
        if (v.includes("urgent") || v.includes("high") || v === "p1" || v === "1") task.priority = "high";
        else if (v.includes("med")) task.priority = "medium";
        else if (v.includes("low") || v === "p4" || v === "4") task.priority = "low";
      }
      if (dateIdx !== -1) {
        const parsed = parseFlexibleDate(obj[header[dateIdx]]);
        if (parsed) {
          task.dueDate = parsed.date;
          task.dueTime = parsed.time;
        }
      }
      if (tagsIdx !== -1) task.tags = splitTags(obj[header[tagsIdx]]);
      if (task.tags?.length === 0) delete task.tags;
      tasks.push(task);
    }
  }

  for (const f of mds) {
    // Strip YAML frontmatter
    let body = f.text;
    let tags: string[] = [];
    const fm = f.text.match(/^---\n([\s\S]*?)\n---\n?/);
    if (fm) {
      const meta = fm[1];
      const t = meta.match(/^tags?:\s*(.+)$/im);
      if (t) tags = splitTags(t[1]);
      body = f.text.slice(fm[0].length);
    }
    const cleanBody = body.replace(/^#\s+.+\n?/, "").trim();
    const title = f.name.replace(/\.md$/i, "").replace(/[-_]+/g, " ");
    const folderParts = f.path.split("/").filter(Boolean);
    folderParts.pop(); // drop file name
    documents.push({
      title: title || "Untitled",
      content: cleanBody,
      tags: tags.length ? tags : undefined,
      folder: folderParts.length ? folderParts.join(" / ") : null,
    });
  }

  if (tasks.length === 0 && documents.length === 0) {
    warnings.push("No Notion tables or pages were recognized. Make sure the ZIP is a full workspace export (Markdown & CSV).");
  }
  return { source: "notion", tasks, documents, warnings };
}

/* ================================================================
 * Todoist - full export ZIP (tasks.csv, projects.csv, labels.csv)
 * ================================================================ */

export function parseTodoist(files: ParsedFile[]): ImportResult {
  const tasks: ImportedTask[] = [];
  const warnings: string[] = [];
  const tasksCsv = files.find((f) => f.name.toLowerCase() === "tasks.csv");
  if (!tasksCsv) {
    warnings.push("No tasks.csv found in the ZIP. Make sure it's a Todoist full data export.");
    return { source: "todoist", tasks, documents: [], warnings };
  }

  // label id -> name and project id -> name
  const labels: Record<string, string> = {};
  const projects: Record<string, string> = {};
  const labelsCsv = files.find((f) => f.name.toLowerCase() === "labels.csv");
  if (labelsCsv) {
    for (const obj of csvToObjects(parseCSV(labelsCsv.text))) {
      const id = obj.id || obj["label id"] || obj["id"] || "";
      const name = obj.name || obj["label"] || obj["label name"] || "";
      if (id && name) labels[id] = name;
    }
  }
  const projectsCsv = files.find((f) => f.name.toLowerCase() === "projects.csv");
  if (projectsCsv) {
    for (const obj of csvToObjects(parseCSV(projectsCsv.text))) {
      const id = obj.id || obj["project id"] || "";
      const name = obj.name || obj["project"] || "";
      if (id && name) projects[id] = name;
    }
  }

  const rows = parseCSV(tasksCsv.text);
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const typeIdx = headerIndex(header, ["type"]);
  const contentIdx = headerIndex(header, ["content", "title", "task"]);
  const descIdx = headerIndex(header, ["description", "notes", "note"]);
  const prioIdx = headerIndex(header, ["priority"]);
  const dateIdx = headerIndex(header, ["date", "due date", "datetime"]);
  const labelsIdx = headerIndex(header, ["labels", "label"]);
  // Todoist exports use "project_id"/"project_name" - normalize underscores
  // so both spellings resolve. project_id must never win for the name.
  const projIdIdx = (() => {
    const i = header.findIndex((h) => h === "project_id" || h === "project id");
    return i;
  })();
  const projNameIdx = (() => {
    const i = header.findIndex((h) => h === "project_name" || h === "project name" || h === "project");
    return i;
  })();
  const completedIdx = headerIndex(header, ["completed", "complete", "done", "checked"]);

  for (const obj of csvToObjects(rows)) {
    if (typeIdx !== -1 && obj[header[typeIdx]] && !obj[header[typeIdx]].toLowerCase().includes("task")) {
      // Skip notes / sections / headers, keep tasks + completed tasks
      if (!obj[header[typeIdx]].toLowerCase().includes("complete")) continue;
    }
    const title = contentIdx !== -1 ? obj[header[contentIdx]] : "";
    if (!title) continue;
    const task: ImportedTask = { title, tags: [] };
    if (descIdx !== -1 && obj[header[descIdx]]) task.description = obj[header[descIdx]];
    if (prioIdx !== -1) task.priority = todoistPriority(obj[header[prioIdx]]);
    if (completedIdx !== -1) {
      const v = obj[header[completedIdx]].toLowerCase();
      if (v === "true" || v === "yes" || v === "1" || v === "completed") task.status = "done";
    }
    // date column contains e.g. "Mon 05 Sep 09:00"
    const dateVal = dateIdx !== -1 ? obj[header[dateIdx]] : "";
    if (dateVal && dateVal !== "-" && dateVal !== "no date") {
      const parsed = parseFlexibleDate(dateVal);
      if (parsed) {
        task.dueDate = parsed.date;
        task.dueTime = parsed.time;
      }
    }
    if (labelsIdx !== -1) {
      const raw = obj[header[labelsIdx]];
      const tagNames = splitTags(raw);
      // Labels may be IDs (comma separated) - resolve via labels.csv
      const resolved: string[] = [];
      for (const t of tagNames) resolved.push(labels[t] || t);
      task.tags = [...new Set(resolved)];
    }
    const projName = projNameIdx !== -1 ? obj[header[projNameIdx]] : "";
    if (projName) task.list = projName;
    else if (projIdIdx !== -1 && obj[header[projIdIdx]]) task.list = projects[obj[header[projIdIdx]]] || null;
    if (task.tags?.length === 0) delete task.tags;
    tasks.push(task);
  }

  if (tasks.length === 0) {
    warnings.push("No tasks were found in tasks.csv.");
  }
  return { source: "todoist", tasks, documents: [], warnings };
}

/* ================================================================
 * Google Tasks (Takeout CSV): Title, Notes, Status, Due Date, Completed Date
 * ================================================================ */

export function parseGoogleTasks(files: ParsedFile[]): ImportResult {
  const tasks: ImportedTask[] = [];
  const warnings: string[] = [];
  for (const f of files) {
    if (!f.name.endsWith(".csv")) continue;
    const rows = parseCSV(f.text);
    if (rows.length < 2) continue;
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const titleIdx = headerIndex(header, ["title", "name"]);
    if (titleIdx === -1) continue;
    const notesIdx = headerIndex(header, ["notes", "note", "description"]);
    const statusIdx = headerIndex(header, ["status"]);
    const dueIdx = headerIndex(header, ["due date", "due", "date"]);
    const doneIdx = headerIndex(header, ["completed date", "completed"]);
    const listIdx = headerIndex(header, ["list", "task list", "tasklist"]);
    for (const obj of csvToObjects(rows)) {
      const title = obj[header[titleIdx]];
      if (!title) continue;
      const task: ImportedTask = { title, tags: [] };
      if (notesIdx !== -1 && obj[header[notesIdx]]) task.description = obj[header[notesIdx]];
      if (statusIdx !== -1) task.status = statusFromText(obj[header[statusIdx]]);
      if (dueIdx !== -1 && obj[header[dueIdx]]) {
        const parsed = parseFlexibleDate(obj[header[dueIdx]]);
        if (parsed) {
          task.dueDate = parsed.date;
          task.dueTime = parsed.time;
        }
      }
      if (doneIdx !== -1 && obj[header[doneIdx]]) task.status = "done";
      if (listIdx !== -1 && obj[header[listIdx]]) task.list = obj[header[listIdx]];
      if (task.tags?.length === 0) delete task.tags;
      tasks.push(task);
    }
  }
  if (tasks.length === 0) {
    warnings.push("No recognizable Google Tasks CSV was found.");
  }
  return { source: "google", tasks, documents: [], warnings };
}

/* ================================================================
 * Apple Reminders CSV: Title, Notes, Due Date, Priority, List
 * ================================================================ */

export function parseAppleReminders(files: ParsedFile[]): ImportResult {
  const tasks: ImportedTask[] = [];
  const warnings: string[] = [];
  for (const f of files) {
    if (!f.name.endsWith(".csv")) continue;
    const rows = parseCSV(f.text);
    if (rows.length < 2) continue;
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const titleIdx = headerIndex(header, ["title", "name", "task"]);
    if (titleIdx === -1) continue;
    const notesIdx = headerIndex(header, ["notes", "note", "description"]);
    const dueIdx = headerIndex(header, ["due date", "due", "date"]);
    const prioIdx = headerIndex(header, ["priority", "importance"]);
    const listIdx = headerIndex(header, ["list", "list name", "reminder list"]);
    const doneIdx = headerIndex(header, ["completed", "done", "checked"]);
    for (const obj of csvToObjects(rows)) {
      const title = obj[header[titleIdx]];
      if (!title) continue;
      const task: ImportedTask = { title, tags: [] };
      if (notesIdx !== -1 && obj[header[notesIdx]]) task.description = obj[header[notesIdx]];
      if (dueIdx !== -1 && obj[header[dueIdx]]) {
        const parsed = parseFlexibleDate(obj[header[dueIdx]]);
        if (parsed) {
          task.dueDate = parsed.date;
          task.dueTime = parsed.time;
        }
      }
      if (prioIdx !== -1) task.priority = applePriority(obj[header[prioIdx]]);
      if (doneIdx !== -1) {
        const v = obj[header[doneIdx]].toLowerCase();
        if (v === "true" || v === "yes" || v === "1" || v === "completed") task.status = "done";
      }
      if (listIdx !== -1 && obj[header[listIdx]]) task.list = obj[header[listIdx]];
      if (task.tags?.length === 0) delete task.tags;
      tasks.push(task);
    }
  }
  if (tasks.length === 0) {
    warnings.push("No recognizable Apple Reminders CSV was found.");
  }
  return { source: "apple", tasks, documents: [], warnings };
}

/* ================================================================
 * Trello board JSON: lists -> task lists, cards -> tasks
 * ================================================================ */

interface TrelloBoard {
  name?: string;
  lists?: { id: string; name: string }[];
  cards?: {
    name: string;
    desc?: string;
    due?: string | null;
    dueComplete?: boolean;
    idList?: string;
    labels?: { name?: string }[];
    closed?: boolean;
  }[];
}

export function parseTrello(files: ParsedFile[]): ImportResult {
  const tasks: ImportedTask[] = [];
  const warnings: string[] = [];
  const jsonFile = files.find((f) => f.name.endsWith(".json"));
  if (!jsonFile) {
    warnings.push("No JSON board file found.");
    return { source: "trello", tasks, documents: [], warnings };
  }
  let board: TrelloBoard;
  try {
    const parsed = JSON.parse(jsonFile.text);
    // Trello export can be a single board object or an array of boards
    board = Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    warnings.push("The JSON file could not be read as a Trello board.");
    return { source: "trello", tasks, documents: [], warnings };
  }

  const listNames: Record<string, string> = {};
  for (const l of board.lists || []) listNames[l.id] = l.name;

  for (const card of board.cards || []) {
    if (!card.name) continue;
    if (card.closed && !card.dueComplete) continue; // skip archived, keep done
    const task: ImportedTask = { title: card.name, tags: [] };
    if (card.desc) task.description = card.desc;
    if (card.due) {
      const parsed = parseFlexibleDate(card.due);
      if (parsed) {
        task.dueDate = parsed.date;
        task.dueTime = parsed.time;
      }
    }
    if (card.dueComplete) task.status = "done";
    if (card.idList && listNames[card.idList]) task.list = listNames[card.idList];
    if (card.labels && card.labels.length) {
      task.tags = [...new Set(card.labels.map((l) => l.name || "").filter(Boolean))];
    }
    if (task.tags?.length === 0) delete task.tags;
    tasks.push(task);
  }

  if (tasks.length === 0) {
    warnings.push("No cards were found in this Trello board.");
  }
  return { source: "trello", tasks, documents: [], warnings };
}

/* ================================================================
 * Generic: CSV -> tasks (auto-detect columns) or docs; .md/.txt -> docs
 * ================================================================ */

export function parseGeneric(
  files: ParsedFile[],
  mode: "auto" | "tasks" | "documents" = "auto"
): ImportResult {
  const tasks: ImportedTask[] = [];
  const documents: ImportedDocument[] = [];
  const warnings: string[] = [];

  for (const f of files) {
    if (/\.(md|markdown|txt)$/i.test(f.name)) {
      let body = f.text;
      const fm = f.text.match(/^---\n([\s\S]*?)\n---\n?/);
      if (fm) body = f.text.slice(fm[0].length);
      const title = f.name.replace(/\.(md|markdown|txt)$/i, "").replace(/[-_]+/g, " ");
      documents.push({ title: title || "Untitled", content: body.trim() });
      continue;
    }
    if (f.name.endsWith(".csv")) {
      const rows = parseCSV(f.text);
      if (rows.length < 2) continue;
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const titleIdx = headerIndex(header, ["title", "name", "task", "content", "todo", "item", "subject"]);

      // Forced documents mode: every row becomes a document
      if (mode === "documents") {
        const docTitleIdx = titleIdx !== -1 ? titleIdx : 0;
        for (const obj of csvToObjects(rows)) {
          const title = obj[header[docTitleIdx]] || `Row ${documents.length + 1}`;
          const body = Object.entries(obj)
            .filter(([k]) => k !== header[docTitleIdx])
            .map(([, v]) => v)
            .filter(Boolean)
            .join("\n\n");
          documents.push({ title, content: body });
        }
        continue;
      }

      if (titleIdx === -1) {
        if (mode === "tasks") {
          // Forced tasks mode: first column is the title
          for (const obj of csvToObjects(rows)) {
            const title = Object.values(obj)[0];
            if (!title) continue;
            const desc = Object.entries(obj)
              .slice(1)
              .map(([, v]) => v)
              .filter(Boolean)
              .join(" ");
            tasks.push({ title, description: desc || undefined, tags: [] });
          }
          continue;
        }
        // No title column - treat whole rows as documents
        documents.push({
          title: f.name.replace(/\.csv$/i, "").replace(/[-_]+/g, " "),
          content: rows
            .slice(1)
            .map((r) => r.join(", "))
            .filter((r) => r.trim())
            .join("\n"),
        });
        continue;
      }
      const descIdx = headerIndex(header, ["description", "notes", "note", "details", "body"]);
      const dueIdx = headerIndex(header, ["due date", "due", "date", "deadline"]);
      const prioIdx = headerIndex(header, ["priority", "importance"]);
      const statusIdx = headerIndex(header, ["status", "state", "done", "completed", "complete"]);
      const tagsIdx = headerIndex(header, ["tags", "labels", "category", "categories"]);
      for (const obj of csvToObjects(rows)) {
        const title = obj[header[titleIdx]];
        if (!title) continue;
        const task: ImportedTask = { title, tags: [] };
        if (descIdx !== -1 && obj[header[descIdx]]) task.description = obj[header[descIdx]];
        if (dueIdx !== -1 && obj[header[dueIdx]]) {
          const parsed = parseFlexibleDate(obj[header[dueIdx]]);
          if (parsed) {
            task.dueDate = parsed.date;
            task.dueTime = parsed.time;
          }
        }
        if (prioIdx !== -1) {
          const v = obj[header[prioIdx]].toLowerCase();
          if (v.includes("urgent") || v === "p1" || v === "1") task.priority = "urgent";
          else if (v.includes("high") || v === "p2" || v === "2") task.priority = "high";
          else if (v.includes("med") || v === "p3" || v === "3") task.priority = "medium";
          else if (v.includes("low") || v === "p4" || v === "4") task.priority = "low";
        }
        if (statusIdx !== -1) task.status = statusFromText(obj[header[statusIdx]]);
        if (tagsIdx !== -1) task.tags = splitTags(obj[header[tagsIdx]]);
        if (task.tags?.length === 0) delete task.tags;
        tasks.push(task);
      }
    }
  }

  if (tasks.length === 0 && documents.length === 0) {
    warnings.push("No tasks or documents were recognized. CSV files need a title/name column; .md and .txt files become documents.");
  }
  return { source: "generic", tasks, documents, warnings };
}

/* ================================================================
 * Dispatch
 * ================================================================ */

export async function parseImport(
  source: SwitchSource,
  files: File[],
  genericMode: "auto" | "tasks" | "documents" = "auto"
): Promise<ImportResult> {
  let parsed: ParsedFile[];
  if (files.length === 1 && /\.zip$/i.test(files[0].name)) {
    parsed = await unzipFiles(files[0]);
  } else {
    parsed = await Promise.all(
      files.map(async (f) => ({ name: f.name, path: f.name, text: await f.text() }))
    );
  }

  switch (source) {
    case "notion":
      return parseNotion(parsed);
    case "todoist":
      return parseTodoist(parsed);
    case "google":
      return parseGoogleTasks(parsed);
    case "apple":
      return parseAppleReminders(parsed);
    case "trello":
      return parseTrello(parsed);
    case "generic":
      return parseGeneric(parsed, genericMode);
  }
}
