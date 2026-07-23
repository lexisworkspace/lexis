"use client";

import { storage } from "./storage";
import { getToday, calculateStreak } from "./utils";
import { Habit, Task, JournalEntry, Note, Mood } from "@/types";

// ============================================================
// Action Types
// ============================================================

export interface ActionResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface AIAction {
  matched: boolean;
  type: ActionType | null;
  params: Record<string, any>;
  confidence: number; // 0-1
}

export type ActionType =
  | "create_habit"
  | "log_habit"
  | "unlog_habit"
  | "delete_habit"
  | "update_habit"
  | "create_task"
  | "complete_task"
  | "update_task"
  | "delete_task"
  | "create_journal"
  | "update_journal"
  | "create_note"
  | "update_note"
  | "delete_note"
  | "search_data"
  | "export_data"
  | "read_data";

// ============================================================
// Action Detector — understands what the user wants to DO
// ============================================================

export function detectAction(query: string): AIAction {
  const q = query.toLowerCase().trim();

  // --- CREATE HABIT ---
  const createHabitMatch = q.match(
    /(?:create|add|make|start|new)\s+(?:a\s+)?(?:habit|routine|practice)\s+(?:called|named|for|to|of|:)?\s*(.+?)(?:\s+(?:daily|weekly|every|each|in|with|at))?(?:$|\.)/
  );
  if (createHabitMatch) {
    return {
      matched: true,
      type: "create_habit",
      params: { name: createHabitMatch[1].trim() },
      confidence: 0.85,
    };
  }

  // --- LOG HABIT ---
  const logHabitMatch = q.match(
    /(?:log|check|mark|done|complete|track|record)\s+(?:my\s+)?(?:habit\s+)?([\w\s-]+?)(?:\s+(?:for|today|now))?\s*(?:$|\.)/
  );
  if (logHabitMatch && !q.includes("unlog") && !q.includes("undo")) {
    return {
      matched: true,
      type: "log_habit",
      params: { habitName: logHabitMatch[1].trim() },
      confidence: 0.8,
    };
  }

  // --- UNLOG HABIT ---
  if (
    /(?:unlog|undo|remove|uncheck|unmark)\s+(?:my\s+)?(?:habit\s+)?([\w\s-]+?)\s*(?:$|\.)/.test(q)
  ) {
    const unlogMatch = q.match(
      /(?:unlog|undo|remove|uncheck|unmark)\s+(?:my\s+)?(?:habit\s+)?([\w\s-]+?)\s*(?:$|\.)/
    );
    if (unlogMatch) {
      return {
        matched: true,
        type: "unlog_habit",
        params: { habitName: unlogMatch[1].trim() },
        confidence: 0.8,
      };
    }
  }

  // --- DELETE HABIT ---
  const deleteHabitMatch = q.match(
    /(?:delete|remove|destroy)\s+(?:the\s+)?(?:habit|routine)\s+(?:called\s+|named\s+)?["']?([\w\s-]+)["']?\s*(?:$|\.)/
  );
  if (deleteHabitMatch) {
    return {
      matched: true,
      type: "delete_habit",
      params: { habitName: deleteHabitMatch[1].trim() },
      confidence: 0.85,
    };
  }

  // --- CREATE TASK ---
  const createTaskMatch = q.match(
    /(?:create|add|make|new)\s+(?:a\s+)?(?:task|todo|to-do)\s+(?:called|named|for|to|of|:)?\s*(.+?)(?:\s+(?:due|by|before|priority|with|at|on))?(?:$|\.)/
  );
  if (createTaskMatch) {
    const params: Record<string, any> = { title: createTaskMatch[1].trim() };

    // Detect priority
    if (/\burge[nt]\b/.test(q)) params.priority = "urgent";
    else if (/\bhigh\s*priority\b/.test(q)) params.priority = "high";
    else if (/\blow\s*priority\b/.test(q)) params.priority = "low";
    else params.priority = "medium";

    // Detect due date
    const dueMatch = q.match(
      /(?:due|by|before)\s+(?:(?:tomorrow|today|next\s+\w+|\d{4}-\d{2}-\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d+))/
    );
    if (dueMatch) {
      const dueStr = dueMatch[1] || dueMatch[0].replace(/(?:due|by|before)\s+/, "").trim();
      if (dueStr === "tomorrow") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        params.dueDate = tomorrow.toISOString().split("T")[0];
      } else if (dueStr === "today") {
        params.dueDate = getToday();
      } else {
        params.dueDate = dueStr;
      }
    }

    return {
      matched: true,
      type: "create_task",
      params,
      confidence: 0.85,
    };
  }

  // --- COMPLETE / TOGGLE TASK ---
  const completeTaskMatch = q.match(
    /(?:complete|finish|done|mark|check)\s+(?:the\s+)?(?:task\s+)?["']?([\w\s-]+)["']?\s*(?:$|\.|as\s+done)/
  );
  if (completeTaskMatch) {
    return {
      matched: true,
      type: "complete_task",
      params: { taskTitle: completeTaskMatch[1].trim() },
      confidence: 0.8,
    };
  }

  // --- DELETE TASK ---
  const deleteTaskMatch = q.match(
    /(?:delete|remove)\s+(?:the\s+)?(?:task\s+)?["']?([\w\s-]+)["']?\s*(?:$|\.)/
  );
  if (deleteTaskMatch) {
    return {
      matched: true,
      type: "delete_task",
      params: { taskTitle: deleteTaskMatch[1].trim() },
      confidence: 0.8,
    };
  }

  // --- CREATE JOURNAL ENTRY ---
  const journalMatch = q.match(
    /(?:write|create|add|make)\s+(?:a\s+)?(?:journal|diary)\s+(?:entry\s+)?(?:about|for|titled|named|:)?\s*(.+?)(?:\s+(?:feeling|mood|with|and))?(?:$|\.)/i
  );
  if (journalMatch && q.includes("journal")) {
    const params: Record<string, any> = {
      title: journalMatch[1].trim().length > 50
        ? journalMatch[1].trim().slice(0, 50) + "..."
        : journalMatch[1].trim(),
      content: journalMatch[1].trim(),
      date: getToday(),
    };
    // Detect mood
    if (/\b(amazing|great|fantastic|wonderful|excellent)\b/i.test(q))
      params.mood = "amazing";
    else if (/\b(good|nice|fine|okay|alright|decent)\b/i.test(q))
      params.mood = "good";
    else if (/\b(neutral|okay|fine|so-so)\b/i.test(q))
      params.mood = "neutral";
    else if (/\b(bad|rough|tough|hard|difficult|sad|down)\b/i.test(q))
      params.mood = "bad";
    else if (/\b(terrible|awful|horrible|worst)\b/i.test(q))
      params.mood = "terrible";
    else params.mood = "neutral";

    return {
      matched: true,
      type: "create_journal",
      params,
      confidence: 0.8,
    };
  }

  // --- CREATE NOTE ---
  const noteMatch = q.match(
    /(?:create|add|make|write|save)\s+(?:a\s+)?(?:note)\s+(?:called|named|titled|about|for|:)?\s*(.+?)(?:\s+(?:in|with|tag|and))?(?:$|\.)/i
  );
  if (noteMatch) {
    const params: Record<string, any> = {
      title: noteMatch[1].trim().length > 60
        ? noteMatch[1].trim().slice(0, 60) + "..."
        : noteMatch[1].trim(),
      content: noteMatch[1].trim(),
    };
    return {
      matched: true,
      type: "create_note",
      params,
      confidence: 0.75,
    };
  }

  // --- SEARCH ---
  if (
    /(?:search|find|look\s+(?:up|for)|show\s+me)\s+(.+?)(?:\s+(?:in|about|for))?\s*(?:$|\.)/i.test(q) &&
    !/(?:create|add|make|write|delete|remove|log)\b/i.test(q)
  ) {
    const searchMatch = q.match(
      /(?:search|find|look\s+(?:up|for)|show\s+me)\s+(.+?)(?:\s+(?:in|about|for))?\s*(?:$|\.)/i
    );
    if (searchMatch) {
      return {
        matched: true,
        type: "search_data",
        params: { query: searchMatch[1].trim() },
        confidence: 0.7,
      };
    }
  }

  // --- UPDATE HABIT (rename, change frequency, etc.) ---
  const updateHabitMatch = q.match(
    /(?:update|change|rename|modify|edit)\s+(?:the\s+)?(?:habit|routine)\s+(?:called\s+|named\s+)?["']?([\w\s-]+)["']?\s+(?:to|so|with|frequency|time|category|color)\s*(.+?)?(?:$|\.)/i
  );
  if (updateHabitMatch) {
    return {
      matched: true,
      type: "update_habit",
      params: { 
        habitName: updateHabitMatch[1].trim(),
        change: updateHabitMatch[2]?.trim() || ""
      },
      confidence: 0.75,
    };
  }

  // --- UPDATE TASK (reprioritize, reschedule, rename) ---
  const updateTaskMatch = q.match(
    /(?:update|change|move|reprioritize|reschedule|rename)\s+(?:the\s+)?(?:task\s+)?["']?([\w\s-]+)["']?\s+(?:to|as|priority|due|status)\s*(.+?)?(?:$|\.)/i
  );
  if (updateTaskMatch) {
    const params: Record<string, any> = { 
      taskTitle: updateTaskMatch[1].trim(),
      change: updateTaskMatch[2]?.trim() || ""
    };
    if (/\burge[nt]\b/i.test(q)) params.priority = "urgent";
    else if (/\bhigh(?:\s+priority)?\b/i.test(q)) params.priority = "high";
    else if (/\blow(?:\s+priority)?\b/i.test(q)) params.priority = "low";
    else if (/\bmedium\b/i.test(q)) params.priority = "medium";
    return {
      matched: true,
      type: "update_task",
      params,
      confidence: 0.7,
    };
  }

  // --- DELETE NOTE ---
  const deleteNoteMatch = q.match(
    /(?:delete|remove)\s+(?:the\s+)?(?:note)\s+(?:called\s+|named\s+|titled\s+)?["']?([\w\s-]+)["']?\s*(?:$|\.)/i
  );
  if (deleteNoteMatch) {
    return {
      matched: true,
      type: "delete_note",
      params: { noteTitle: deleteNoteMatch[1].trim() },
      confidence: 0.8,
    };
  }

  return {
    matched: false,
    type: null,
    params: {},
    confidence: 0,
  };
}

// ============================================================
// Action Executors
// ============================================================

function findHabitByName(name: string): Habit | undefined {
  const data = storage.getData();
  const q = name.toLowerCase().trim();
  return data.habits.find(
    (h) =>
      h.name.toLowerCase().includes(q) ||
      q.includes(h.name.toLowerCase())
  );
}

function findTaskByTitle(title: string): Task | undefined {
  const data = storage.getData();
  const q = title.toLowerCase().trim();
  return data.tasks.find(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      q.includes(t.title.toLowerCase())
  );
}

export function executeCreateHabit(params: Record<string, any>): ActionResult<Habit> {
  const name = params.name || "New Habit";
  const existing = findHabitByName(name);
  if (existing) {
    return {
      success: false,
      message: `You already have a habit called "${existing.name}"! It's currently on a ${calculateStreak(storage.getHabitLogDates(existing.id)).current}-day streak. Want to track it instead?`,
    };
  }
  const habit = storage.createHabit({
    name,
    description: params.description || `Track "${name}" daily`,
    categoryId: params.categoryId || "health",
    frequency: params.frequency || "daily",
    timeOfDay: params.timeOfDay || "anytime",
    targetCount: 1,
    color: params.color || "#a1a1aa",
    icon: params.icon || "circle",
  });
  return {
    success: true,
    message: `✅ I've created a new habit: **${habit.name}** (${habit.frequency}). Start tracking today to build your streak!`,
    data: habit,
  };
}

export function executeLogHabit(params: Record<string, any>): ActionResult {
  const habitName = params.habitName || "";
  const date = params.date || getToday();
  const habit = findHabitByName(habitName);

  if (!habit) {
    // Suggest creating it
    return {
      success: false,
      message: `I couldn't find a habit called "${habitName}". Would you like me to create one for you? Just say "create habit ${habitName}".`,
    };
  }

  if (storage.isHabitLogged(habit.id, date)) {
    const streak = calculateStreak(storage.getHabitLogDates(habit.id));
    return {
      success: true,
      message: `✅ **${habit.name}** is already logged today! Current streak: ${streak.current} days (best: ${streak.longest}). Keep it up! 💪`,
    };
  }

  storage.logHabit(habit.id, date);
  const streak = calculateStreak(storage.getHabitLogDates(habit.id));
  return {
    success: true,
    message: `✅ Logged **${habit.name}** for today! ${
      streak.current > 0
        ? `Your streak is now **${streak.current} days** 🔥`
        : "That's day 1 of your streak! 🔥"
    }`,
  };
}

export function executeUnlogHabit(params: Record<string, any>): ActionResult {
  const habitName = params.habitName || "";
  const date = params.date || getToday();
  const habit = findHabitByName(habitName);

  if (!habit) {
    return {
      success: false,
      message: `I couldn't find a habit called "${habitName}".`,
    };
  }

  if (!storage.isHabitLogged(habit.id, date)) {
    return {
      success: false,
      message: `**${habit.name}** wasn't logged for today, so there's nothing to undo.`,
    };
  }

  storage.unlogHabit(habit.id, date);
  const streak = calculateStreak(storage.getHabitLogDates(habit.id));
  return {
    success: true,
    message: `↩️ Undid **${habit.name}** for today. ${
      streak.current > 0
        ? `Current streak: ${streak.current} days.`
        : "Your streak has been reset to 0. Don't worry, you can start again!"
    }`,
  };
}

export function executeDeleteHabit(params: Record<string, any>): ActionResult {
  const habitName = params.habitName || "";
  const habit = findHabitByName(habitName);

  if (!habit) {
    return {
      success: false,
      message: `I couldn't find a habit called "${habitName}". It may have been deleted already.`,
    };
  }

  storage.deleteHabit(habit.id);
  return {
    success: true,
    message: `🗑️ Permanently deleted **${habit.name}** and all its logs.`,
  };
}

export function executeCreateTask(params: Record<string, any>): ActionResult<Task> {
  const title = params.title || "New Task";
  const task = storage.createTask({
    title,
    description: params.description || "",
    status: "todo",
    priority: params.priority || "medium",
    dueDate: params.dueDate || null,
    dueTime: params.dueTime || null,
    completedAt: null,
    tags: params.tags || [],
    listId: params.listId || "inbox",
    recurring: "none",
    recurringEndDate: null,
    estimatedMinutes: null,
  });

  const priorityEmoji: Record<string, string> = {
    urgent: "🔴",
    high: "🟠",
    medium: "🔵",
    low: "⚪",
  };

  const dueStr = params.dueDate ? ` (due ${params.dueDate})` : "";
  return {
    success: true,
    message: `✅ New task created: ${priorityEmoji[params.priority] || "🔵"} **${task.title}**${dueStr}. Added to your inbox.`,
    data: task,
  };
}

export function executeCompleteTask(params: Record<string, any>): ActionResult {
  const taskTitle = params.taskTitle || "";
  const task = findTaskByTitle(taskTitle);

  if (!task) {
    return {
      success: false,
      message: `I couldn't find a task called "${taskTitle}". Try a different search term.`,
    };
  }

  if (task.status === "done") {
    // Toggle it back to todo
    storage.toggleTask(task.id);
    return {
      success: true,
      message: `↩️ Moved **${task.title}** back to your todo list.`,
    };
  }

  storage.toggleTask(task.id);
  return {
    success: true,
    message: `✅ **${task.title}** is done! Great progress! 🎉`,
  };
}

export function executeDeleteTask(params: Record<string, any>): ActionResult {
  const taskTitle = params.taskTitle || "";
  const task = findTaskByTitle(taskTitle);

  if (!task) {
    return {
      success: false,
      message: `I couldn't find a task called "${taskTitle}".`,
    };
  }

  storage.deleteTask(task.id);
  return {
    success: true,
    message: `🗑️ Deleted **${task.title}** from your tasks.`,
  };
}

export function executeCreateJournal(params: Record<string, any>): ActionResult<JournalEntry> {
  const date = params.date || getToday();

  // Check if entry already exists for today
  const existing = storage.getJournalEntry(date);
  if (existing) {
    // Append to existing entry
    const updatedContent = existing.content + "\n\n---\n" + params.content;
    storage.updateJournalEntry(existing.id, {
      content: updatedContent,
      title: existing.title,
    });
    return {
      success: true,
      message: `📝 Added to your existing journal entry for today. You now have a rich record of thoughts! Reflection is powerful.`,
      data: existing,
    };
  }

  const entry = storage.createJournalEntry({
    date,
    title: params.title || `${getToday()} Journal Entry`,
    content: params.content || "Reflecting on today...",
    mood: params.mood || "neutral",
    gratitude: params.gratitude || [],
    reflectionPrompts: [],
  });

  return {
    success: true,
    message: `📝 Journal entry created for today! You're feeling **${entry.mood}**. Writing things down makes everything clearer. ✨`,
    data: entry,
  };
}

export function executeCreateNote(params: Record<string, any>): ActionResult<Note> {
  const note = storage.createNote({
    title: params.title || "Untitled Note",
    content: params.content || "",
    contentHtml: params.content || "",
    folderId: params.folderId || "general",
    tags: params.tags || [],
    pinned: false,
    archived: false,
    favorite: false,
  });

  return {
    success: true,
    message: `📓 Created a new note: **${note.title}**. You can find it in your Notes section.`,
    data: note,
  };
}

export function executeUpdateHabit(params: Record<string, any>): ActionResult {
  const habitName = params.habitName || "";
  const habit = findHabitByName(habitName);

  if (!habit) {
    return {
      success: false,
      message: `I couldn't find a habit called "${habitName}".`,
    };
  }

  const change = (params.change || "").toLowerCase();
  const updates: Partial<Habit> = {};

  // Detect what the user wants to change
  if (/daily|every day/i.test(change)) updates.frequency = "daily";
  else if (/weekly|every week/i.test(change)) updates.frequency = "weekly";
  
  if (/morning/i.test(change)) updates.timeOfDay = "morning";
  else if (/afternoon/i.test(change)) updates.timeOfDay = "afternoon";
  else if (/evening/i.test(change)) updates.timeOfDay = "evening";

  storage.updateHabit(habit.id, updates);
  const changedParts = Object.keys(updates).length > 0 
    ? ` (${Object.keys(updates).join(", ")} updated)` 
    : "";
  return {
    success: true,
    message: `✏️ Updated **${habit.name}**${changedParts}. Anything else you'd like to change?`,
    data: { ...habit, ...updates },
  };
}

export function executeUpdateTask(params: Record<string, any>): ActionResult {
  const taskTitle = params.taskTitle || "";
  const task = findTaskByTitle(taskTitle);

  if (!task) {
    return {
      success: false,
      message: `I couldn't find a task called "${taskTitle}".`,
    };
  }

  const updates: Partial<Task> = {};
  let changeDesc = "";

  if (params.priority) {
    updates.priority = params.priority;
    changeDesc = ` priority changed to ${params.priority}`;
  }

  // Check if the change text implies completion
  if ((params.change || "").toLowerCase().includes("done") || 
      (params.change || "").toLowerCase().includes("complete")) {
    updates.status = "done";
    updates.completedAt = new Date().toISOString();
    changeDesc = " marked as done";
  }

  if (Object.keys(updates).length === 0) {
    return {
      success: true,
      message: `I see you want to change **${task.title}**. Could you be more specific about what to update? (priority, due date, status)`,
    };
  }

  storage.updateTask(task.id, updates);
  return {
    success: true,
    message: `✏️ Updated **${task.title}**${changeDesc}.`,
    data: { ...task, ...updates },
  };
}

export function executeDeleteNote(params: Record<string, any>): ActionResult {
  const noteTitle = params.noteTitle || "";
  const data = storage.getData();
  const q = noteTitle.toLowerCase();
  const note = data.notes.find(
    (n) =>
      n.title.toLowerCase().includes(q) ||
      q.includes(n.title.toLowerCase())
  );

  if (!note) {
    return {
      success: false,
      message: `I couldn't find a note called "${noteTitle}".`,
    };
  }

  storage.deleteNote(note.id);
  return {
    success: true,
    message: `🗑️ Deleted note: **${note.title}**.`,
  };
}

export function executeSearch(params: Record<string, any>): ActionResult {
  const query = params.query || "";
  const data = storage.getData();
  const q = query.toLowerCase();

  const results: string[] = [];

  const matchingNotes = data.notes.filter(
    (n) =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q)
  );
  if (matchingNotes.length > 0) {
    results.push(
      `📓 **Notes:** ${matchingNotes.length} match${matchingNotes.length > 1 ? "es" : ""}`
    );
    matchingNotes.slice(0, 3).forEach((n) => {
      results.push(`   • ${n.title} — ${n.content.slice(0, 80)}...`);
    });
  }

  const matchingTasks = data.tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
  );
  if (matchingTasks.length > 0) {
    results.push(
      `🎯 **Tasks:** ${matchingTasks.length} match${matchingTasks.length > 1 ? "es" : ""}`
    );
    matchingTasks.slice(0, 3).forEach((t) => {
      results.push(`   • ${t.title} (${t.status})`);
    });
  }

  const matchingJournal = data.journalEntries.filter(
    (e) =>
      e.content.toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q)
  );
  if (matchingJournal.length > 0) {
    results.push(
      `📝 **Journal:** ${matchingJournal.length} match${matchingJournal.length > 1 ? "es" : ""}`
    );
  }

  const matchingHabits = data.habits.filter((h) =>
    h.name.toLowerCase().includes(q)
  );
  if (matchingHabits.length > 0) {
    results.push(
      `💪 **Habits:** ${matchingHabits.length} match${matchingHabits.length > 1 ? "es" : ""}`
    );
  }

  if (results.length === 0) {
    return {
      success: true,
      message: `🔍 I searched across notes, tasks, journal entries, and habits for "${query}" — no matches found. Try different keywords?`,
    };
  }

  return {
    success: true,
    message: `🔍 **Search results for "${query}":**\n\n${results.join("\n")}`,
  };
}

// ============================================================
// Main Action Executor — routes detected actions to executors
// ============================================================

export function executeAction(action: AIAction): ActionResult {
  switch (action.type) {
    case "create_habit":
      return executeCreateHabit(action.params);
    case "log_habit":
      return executeLogHabit(action.params);
    case "unlog_habit":
      return executeUnlogHabit(action.params);
    case "delete_habit":
      return executeDeleteHabit(action.params);
    case "create_task":
      return executeCreateTask(action.params);
    case "complete_task":
      return executeCompleteTask(action.params);
    case "delete_task":
      return executeDeleteTask(action.params);
    case "create_journal":
      return executeCreateJournal(action.params);
    case "create_note":
      return executeCreateNote(action.params);
    case "update_habit":
      return executeUpdateHabit(action.params);
    case "update_task":
      return executeUpdateTask(action.params);
    case "delete_note":
      return executeDeleteNote(action.params);
    case "search_data":
      return executeSearch(action.params);
    default:
      return {
        success: false,
        message: "I'm not sure what action to take. Could you rephrase that?",
      };
  }
}


