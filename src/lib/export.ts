import { MOODS } from "@/types";
import type { AppData } from "@/types";

// ============================================================
// Portable export helpers - Markdown (notes/journal) + CSV (tasks/habits)
// Everything is generated client-side; nothing leaves the device.
// ============================================================

function moodEmoji(mood: string | undefined): string {
  if (!mood) return "";
  return MOODS.find((m) => m.value === mood)?.emoji ?? "";
}

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

// ------------------------------------------------------------
// Markdown: Notes
// ------------------------------------------------------------

export function notesToMarkdown(data: AppData): string {
  const sorted = [...data.notes].sort(
    (a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "")
  );
  const parts = sorted.map((note) => {
    const lines: string[] = [];
    lines.push(`# ${note.title || "Untitled"}`);
    lines.push("");
    const meta: string[] = [];
    if (note.createdAt) meta.push(`Created: ${formatDate(note.createdAt)}`);
    if (note.updatedAt && note.updatedAt !== note.createdAt)
      meta.push(`Updated: ${formatDate(note.updatedAt)}`);
    if (note.tags.length) meta.push(`Tags: ${note.tags.map((t) => `#${t}`).join(", ")}`);
    if (note.pinned) meta.push("Pinned");
    if (note.favorite) meta.push("Favorite");
    if (meta.length) {
      lines.push(`> ${meta.join("  ·  ")}`);
      lines.push("");
    }
    const content = (note.contentHtml ? note.contentHtml.replace(/<[^>]*>/g, "") : note.content || "").trim();
    if (content) {
      lines.push(content);
      lines.push("");
    } else {
      lines.push("_Empty note_");
      lines.push("");
    }
    return lines.join("\n");
  });

  const header = [
    "# Orleia Notes Export",
    "",
    `Exported: ${new Date().toISOString().split("T")[0]}  ·  ${data.notes.length} notes`,
    "",
    "---",
    "",
  ];
  return header.join("\n") + parts.join("\n\n---\n\n") + "\n";
}

export function exportNotesMarkdown(data: AppData) {
  downloadTextFile(
    `orleia-notes-${new Date().toISOString().split("T")[0]}.md`,
    notesToMarkdown(data),
    "text/markdown"
  );
}

// ------------------------------------------------------------
// Markdown: Journal
// ------------------------------------------------------------

export function journalToMarkdown(data: AppData): string {
  const sorted = [...data.journalEntries].sort((a, b) =>
    (b.date || "").localeCompare(a.date || "")
  );
  const parts = sorted.map((entry) => {
    const lines: string[] = [];
    lines.push(`# ${entry.title || "Journal Entry"}`);
    lines.push("");
    const meta: string[] = [];
    if (entry.date) meta.push(`Date: ${formatDate(entry.date)}`);
    if (entry.mood) meta.push(`Mood: ${moodEmoji(entry.mood)} ${entry.mood}`);
    if (meta.length) {
      lines.push(`> ${meta.join("  ·  ")}`);
      lines.push("");
    }
    if (entry.gratitude.length) {
      lines.push("**Grateful for:**");
      entry.gratitude.forEach((g) => lines.push(`- ${g}`));
      lines.push("");
    }
    if (entry.reflectionPrompts?.length) {
      entry.reflectionPrompts.forEach((rp) => {
        if (rp.answer?.trim()) {
          lines.push(`**${rp.question}**`);
          lines.push("");
          lines.push(rp.answer.replace(/<[^>]*>/g, "").trim());
          lines.push("");
        }
      });
    }
    const content = (entry.content || "").trim();
    if (content) {
      lines.push(content);
      lines.push("");
    }
    return lines.join("\n");
  });

  const header = [
    "# Orleia Journal Export",
    "",
    `Exported: ${new Date().toISOString().split("T")[0]}  ·  ${data.journalEntries.length} entries`,
    "",
    "---",
    "",
  ];
  return header.join("\n") + parts.join("\n\n---\n\n") + "\n";
}

export function exportJournalMarkdown(data: AppData) {
  downloadTextFile(
    `orleia-journal-${new Date().toISOString().split("T")[0]}.md`,
    journalToMarkdown(data),
    "text/markdown"
  );
}

// ------------------------------------------------------------
// CSV helpers
// ------------------------------------------------------------

function csvEscape(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvEscape).join(",");
}

// ------------------------------------------------------------
// CSV: Tasks
// ------------------------------------------------------------

export function tasksToCsv(data: AppData): string {
  const rows: string[] = [
    csvRow(["Title", "Status", "Priority", "Due date", "Tags", "Description", "Created"]),
  ];
  const sorted = [...data.tasks].sort((a, b) =>
    (a.createdAt || "").localeCompare(b.createdAt || "")
  );
  for (const task of sorted) {
    rows.push(
      csvRow([
        task.title,
        task.status,
        task.priority,
        task.dueDate ? formatDate(task.dueDate) : "",
        task.tags.join(" | "),
        task.description,
        task.createdAt ? formatDate(task.createdAt) : "",
      ])
    );
  }
  return rows.join("\n") + "\n";
}

export function exportTasksCsv(data: AppData) {
  downloadTextFile(
    `orleia-tasks-${new Date().toISOString().split("T")[0]}.csv`,
    tasksToCsv(data),
    "text/csv"
  );
}

// ------------------------------------------------------------
// CSV: Habits (with streak + completion stats)
// ------------------------------------------------------------

export function habitsToCsv(data: AppData): string {
  const rows: string[] = [
    csvRow(["Name", "Description", "Frequency", "Time of day", "Target", "Color", "Created", "Total completions", "Active"]),
  ];
  const sorted = [...data.habits].sort((a, b) =>
    (a.createdAt || "").localeCompare(b.createdAt || "")
  );
  for (const habit of sorted) {
    const completions = data.habitLogs.filter((l) => l.habitId === habit.id).length;
    rows.push(
      csvRow([
        habit.name,
        habit.description,
        habit.frequency,
        habit.timeOfDay,
        habit.targetCount,
        habit.color,
        habit.createdAt ? formatDate(habit.createdAt) : "",
        completions,
        habit.archived ? "no" : "yes",
      ])
    );
  }
  return rows.join("\n") + "\n";
}

export function exportHabitsCsv(data: AppData) {
  downloadTextFile(
    `orleia-habits-${new Date().toISOString().split("T")[0]}.csv`,
    habitsToCsv(data),
    "text/csv"
  );
}
