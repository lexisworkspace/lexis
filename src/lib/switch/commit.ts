"use client";

import { storage } from "@/lib/storage";
import { generateId } from "@/lib/utils";
import type { ImportedTask, ImportedDocument } from "./types";

export interface CommitStats {
  tasksCreated: number;
  documentsCreated: number;
  listsCreated: number;
  foldersCreated: number;
  skipped: number;
}

const MAX_TASK_TITLE = 300;
const MAX_DOC_TITLE = 300;
const MAX_DESCRIPTION = 5000;
const MAX_CONTENT = 200_000;

function clamp(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

/** Turn markdown-ish content into the simple HTML the notes editor expects. */
function mdToHtml(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split("\n");
  const out: string[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (list.length) {
      out.push(`<ul>${list.map((l) => `<li>${l}</li>`).join("")}</ul>`);
      list = [];
    }
  };
  for (let raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      list.push(esc(line.replace(/^\s*[-*]\s+/, "")));
      continue;
    }
    flushList();
    if (/^#{1,6}\s+/.test(line)) {
      const level = line.match(/^(#+)/)![1].length;
      out.push(`<h${Math.min(level, 6)}>${esc(line.replace(/^#+\s*/, ""))}</h${Math.min(level, 6)}>`);
    } else if (/^\s*$/.test(line)) {
      out.push("<p><br/></p>");
    } else {
      out.push(`<p>${esc(line)}</p>`);
    }
  }
  flushList();
  return out.join("");
}

/**
 * Import parsed tasks + documents into the live Lexis data.
 * - Tasks map to lists by name (created on demand), keep priority/due/status/tags.
 * - Documents map to folders by name (created on demand), content converted to HTML.
 * - Dedup: skip items whose title already exists (case-insensitive) to avoid
 *   clobbering a workspace the user already started.
 */
export function commitImport(
  tasks: ImportedTask[],
  documents: ImportedDocument[]
): CommitStats {
  const data = storage.getData();
  const stats: CommitStats = {
    tasksCreated: 0,
    documentsCreated: 0,
    listsCreated: 0,
    foldersCreated: 0,
    skipped: 0,
  };

  // Resolve list id by name (create if missing)
  const listIdFor = (name: string | null | undefined): string | null => {
    if (!name) return null;
    const existing = data.taskLists.find((l) => l.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const list = {
      id: generateId(),
      name: clamp(name, 60),
      color: "#64748b",
      icon: "inbox",
      createdAt: new Date().toISOString(),
    };
    data.taskLists.push(list);
    stats.listsCreated++;
    return list.id;
  };

  // Resolve folder id by name (create if missing) - nested paths become "A / B"
  const folderIdFor = (name: string | null | undefined): string | null => {
    if (!name) return null;
    const existing = data.noteFolders.find((f) => f.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const folder = {
      id: generateId(),
      name: clamp(name, 80),
      parentId: null,
      createdAt: new Date().toISOString(),
    };
    data.noteFolders.push(folder);
    stats.foldersCreated++;
    return folder.id;
  };

  const existingTaskTitles = new Set(data.tasks.map((t) => t.title.toLowerCase()));
  const existingNoteTitles = new Set(data.notes.map((n) => n.title.toLowerCase()));

  for (const t of tasks) {
    const title = clamp(t.title, MAX_TASK_TITLE).trim();
    if (!title) {
      stats.skipped++;
      continue;
    }
    if (existingTaskTitles.has(title.toLowerCase())) {
      stats.skipped++;
      continue;
    }
    const now = new Date().toISOString();
    data.tasks.push({
      id: generateId(),
      title,
      description: t.description ? clamp(t.description, MAX_DESCRIPTION) : "",
      status: t.status || "todo",
      priority: t.priority || "medium",
      dueDate: t.dueDate || null,
      dueTime: t.dueTime || null,
      completedAt: t.status === "done" ? now : null,
      tags: t.tags || [],
      listId: listIdFor(t.list),
      recurring: "none",
      recurringDays: undefined,
      recurringEndDate: null,
      estimatedMinutes: null,
      order: data.tasks.length,
      createdAt: now,
      updatedAt: now,
    });
    existingTaskTitles.add(title.toLowerCase());
    stats.tasksCreated++;
  }

  for (const d of documents) {
    const title = clamp(d.title, MAX_DOC_TITLE).trim();
    if (!title) {
      stats.skipped++;
      continue;
    }
    if (existingNoteTitles.has(title.toLowerCase())) {
      stats.skipped++;
      continue;
    }
    const content = clamp(d.content || "", MAX_CONTENT);
    const now = new Date().toISOString();
    data.notes.push({
      id: generateId(),
      title,
      content,
      contentHtml: mdToHtml(content),
      folderId: folderIdFor(d.folder),
      tags: d.tags || [],
      pinned: false,
      archived: false,
      favorite: false,
      attachments: [],
      createdAt: now,
      updatedAt: now,
    });
    existingNoteTitles.add(title.toLowerCase());
    stats.documentsCreated++;
  }

  if (stats.tasksCreated > 0 || stats.documentsCreated > 0) {
    storage.saveData();
  }

  return stats;
}
