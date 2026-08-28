// Actions a paired phone can send to the desktop. Each one maps directly to
// a storage primitive, so the desktop's own data (IndexedDB) is what changes
// - the phone never holds its own copy of the workspace, it just tells the
// desktop what to do. Kept dependency-free from the pairing bridge so it can
// be unit-tested and reused wherever the bridge is registered.

import { storage } from "./storage";
import { getToday } from "./utils";

export type PairAction =
  | { type: "habit.toggle"; habitId: string; date?: string }
  | { type: "habit.add"; name: string }
  | { type: "task.add"; title: string; dueDate?: string | null }
  | { type: "task.toggle"; taskId: string }
  | { type: "task.delete"; taskId: string }
  | { type: "journal.add"; date: string; content: string }
  // Phone-first sync: a phone that started on mobile pushes its ENTIRE
  // workspace to a fresh desktop. The desktop replaces its own data with
  // the phone's JSON, then both converge (desktop stays the mirror).
  | { type: "workspace.import"; json: string };

export type PairActionResult = { ok: true } | { ok: false; error: string };

/** Apply one phone action to the desktop's real storage. */
export function applyPairAction(action: PairAction): PairActionResult {
  try {
    switch (action.type) {
      case "habit.toggle": {
        const date = action.date || getToday();
        const habit = storage.getHabit(action.habitId);
        if (!habit || habit.archived) return { ok: false, error: "Habit not found" };
        if (storage.isHabitLogged(habit.id, date)) storage.unlogHabit(habit.id, date);
        else storage.logHabit(habit.id, date);
        return { ok: true };
      }

      case "habit.add": {
        const name = String(action.name || "").trim();
        if (!name) return { ok: false, error: "Name is required" };
        storage.createHabit({
          name,
          description: `Track "${name}" daily`,
          categoryId: "health",
          frequency: "daily",
          timeOfDay: "anytime",
          targetCount: 1,
          color: "#6366f1",
          icon: "⭐",
        });
        return { ok: true };
      }

      case "task.add": {
        const title = String(action.title || "").trim();
        if (!title) return { ok: false, error: "Title is required" };
        storage.createTask({
          title,
          description: "",
          status: "todo",
          priority: "medium",
          dueDate: action.dueDate || null,
          dueTime: null,
          completedAt: null,
          tags: [],
          listId: null,
          recurring: "none",
          recurringEndDate: null,
          estimatedMinutes: null,
        });
        return { ok: true };
      }

      case "task.toggle": {
        const t = storage.toggleTask(action.taskId);
        if (!t) return { ok: false, error: "Task not found" };
        return { ok: true };
      }

      case "task.delete": {
        storage.deleteTask(action.taskId);
        return { ok: true };
      }

      case "journal.add": {
        const content = String(action.content || "").trim();
        if (!content) return { ok: false, error: "Content is required" };
        storage.createJournalEntry({
          date: action.date || getToday(),
          title: "",
          content,
          mood: "neutral",
          gratitude: [],
          reflectionPrompts: [],
        });
        return { ok: true };
      }

      // Phone-first sync: replace the desktop's workspace with the phone's.
      case "workspace.import": {
        const json = String(action.json || "");
        if (!json) return { ok: false, error: "Empty workspace" };
        if (!storage.importData(json)) return { ok: false, error: "Invalid workspace data" };
        return { ok: true };
      }

      default:
        return { ok: false, error: "Unknown action type" };
    }
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || e) };
  }
}
