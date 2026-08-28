"use client";

import type { TaskPriority, TaskStatus } from "@/types";

export type SwitchSource =
  | "notion"
  | "todoist"
  | "google"
  | "apple"
  | "trello"
  | "generic";

export interface SwitchSourceDef {
  id: SwitchSource;
  name: string;
  desc: string;
  /** File extensions the source accepts */
  extensions: string[];
  /** Accept multiple files (generic) vs single file */
  multi: boolean;
  /** Short "how to export" helper shown in the drop zone */
  howTo: string;
}

export const SWITCH_SOURCES: SwitchSourceDef[] = [
  {
    id: "notion",
    name: "Notion",
    desc: "Full workspace export (Markdown & CSV)",
    extensions: [".zip"],
    multi: false,
    howTo: "In Notion: Settings → Workspace → Export all workspace content → Markdown & CSV → Export as ZIP.",
  },
  {
    id: "todoist",
    name: "Todoist",
    desc: "Full data export",
    extensions: [".zip"],
    multi: false,
    howTo: "In Todoist: Settings → Privacy → Export data → you receive a ZIP file with tasks.csv.",
  },
  {
    id: "google",
    name: "Google Tasks",
    desc: "Takeout CSV export",
    extensions: [".csv"],
    multi: false,
    howTo: "From Google Takeout, export only Google Tasks as CSV, or export the tasks list from Google Tasks (Settings → Export).",
  },
  {
    id: "apple",
    name: "Apple Reminders",
    desc: "CSV export",
    extensions: [".csv"],
    multi: false,
    howTo: "On Mac: File → Export in Reminders (or use a Reminders → CSV converter) and save the CSV.",
  },
  {
    id: "trello",
    name: "Trello",
    desc: "Board JSON export",
    extensions: [".json"],
    multi: false,
    howTo: "In Trello: open a board → Show menu → More → Print and export → Export as JSON.",
  },
  {
    id: "generic",
    name: "Anything else",
    desc: "CSV or Markdown files",
    extensions: [".csv", ".md", ".markdown", ".txt"],
    multi: true,
    howTo: "Select CSV files (turned into tasks) or Markdown/text files (turned into documents). Lexis auto-detects the columns.",
  },
];

/** A task parsed from an external source, ready to map into Lexis. */
export interface ImportedTask {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  dueTime?: string | null;
  status?: TaskStatus;
  tags?: string[];
  /** List/project name - resolved to a Lexis task list */
  list?: string | null;
}

/** A document parsed from an external source (markdown content). */
export interface ImportedDocument {
  title: string;
  content: string;
  tags?: string[];
  /** Folder name - resolved to a Lexis folder */
  folder?: string | null;
}

export interface ImportResult {
  source: SwitchSource;
  tasks: ImportedTask[];
  documents: ImportedDocument[];
  warnings: string[];
}

export interface ParsedFile {
  /** Normalized file name, lowercased, no path */
  name: string;
  /** Full path inside the archive (zip) or just the file name */
  path: string;
  text: string;
}
