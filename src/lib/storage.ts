"use client";

import { AppData, Note, Task, Habit, HabitLog, JournalEntry, AIConversation, AISuggestion, AIMessage } from "@/types";
import { generateId, getToday } from "./utils";

const STORAGE_KEY = "lexis-data";
const SYNC_KEY = "lexis-sync";

const DEFAULT_DATA: AppData = {
  theme: { theme: "system", primaryColor: "#6366f1", fontSize: "md", reducedMotion: false },
  habits: [],
  habitCategories: [
    { id: "health", name: "Health", color: "#22c55e", icon: "heart", createdAt: new Date().toISOString() },
    { id: "productivity", name: "Productivity", color: "#3b82f6", icon: "zap", createdAt: new Date().toISOString() },
    { id: "learning", name: "Learning", color: "#a855f7", icon: "book", createdAt: new Date().toISOString() },
    { id: "mindfulness", name: "Mindfulness", color: "#f59e0b", icon: "sparkles", createdAt: new Date().toISOString() },
    { id: "fitness", name: "Fitness", color: "#ef4444", icon: "running", createdAt: new Date().toISOString() },
  ],
  habitLogs: [],
  notes: [],
  noteTags: [
    { id: "important", name: "Important", color: "#ef4444" },
    { id: "personal", name: "Personal", color: "#22c55e" },
    { id: "work", name: "Work", color: "#3b82f6" },
    { id: "ideas", name: "Ideas", color: "#a855f7" },
  ],
  noteFolders: [
    { id: "general", name: "General", parentId: null, createdAt: new Date().toISOString() },
    { id: "projects", name: "Projects", parentId: null, createdAt: new Date().toISOString() },
  ],
  journalEntries: [],
  tasks: [],
  taskLists: [
    { id: "inbox", name: "Inbox", color: "#64748b", icon: "inbox", createdAt: new Date().toISOString() },
    { id: "today", name: "Today", color: "#3b82f6", icon: "sun", createdAt: new Date().toISOString() },
    { id: "this-week", name: "This Week", color: "#22c55e", icon: "calendar", createdAt: new Date().toISOString() },
  ],
  aiConversations: [],
  aiSuggestions: [],
  onboardingCompleted: false,
  lastSync: null,
};

class Storage {
  private data: AppData | null = null;

  getData(): AppData {
    if (this.data) return this.data;
    
    if (typeof window === "undefined") return { ...DEFAULT_DATA };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.data = { ...DEFAULT_DATA, ...JSON.parse(raw) };
        return this.data!;
      }
    } catch (e) {
      console.warn("Failed to load data from localStorage, using defaults", e);
    }

    this.data = { ...DEFAULT_DATA };
    return this.data!;
  }

  saveData(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      localStorage.setItem(SYNC_KEY, new Date().toISOString());
    } catch (e) {
      console.error("Failed to save data", e);
    }
  }

  // ============================================================
  // Theme
  // ============================================================

  updateTheme(config: Partial<AppData["theme"]>): AppData["theme"] {
    const data = this.getData();
    data.theme = { ...data.theme, ...config };
    this.saveData();
    return data.theme;
  }

  // ============================================================
  // Habits
  // ============================================================

  getHabits(): Habit[] {
    return this.getData().habits.filter((h) => !h.archived);
  }

  getHabit(id: string): Habit | undefined {
    return this.getData().habits.find((h) => h.id === id);
  }

  createHabit(habit: Omit<Habit, "id" | "createdAt" | "archived">): Habit {
    const data = this.getData();
    const newHabit: Habit = {
      ...habit,
      id: generateId(),
      createdAt: new Date().toISOString(),
      archived: false,
    };
    data.habits.push(newHabit);
    this.saveData();
    return newHabit;
  }

  updateHabit(id: string, updates: Partial<Habit>): Habit | undefined {
    const data = this.getData();
    const idx = data.habits.findIndex((h) => h.id === id);
    if (idx === -1) return undefined;
    data.habits[idx] = { ...data.habits[idx], ...updates };
    this.saveData();
    return data.habits[idx];
  }

  deleteHabit(id: string): void {
    const data = this.getData();
    data.habits = data.habits.filter((h) => h.id !== id);
    data.habitLogs = data.habitLogs.filter((l) => l.habitId !== id);
    this.saveData();
  }

  logHabit(habitId: string, date: string = getToday()): HabitLog {
    const data = this.getData();
    const existing = data.habitLogs.find(
      (l) => l.habitId === habitId && l.date === date
    );
    if (existing) {
      existing.count += 1;
      this.saveData();
      return existing;
    }
    const log: HabitLog = {
      id: generateId(),
      habitId,
      date,
      count: 1,
      createdAt: new Date().toISOString(),
    };
    data.habitLogs.push(log);
    this.saveData();
    return log;
  }

  unlogHabit(habitId: string, date: string = getToday()): void {
    const data = this.getData();
    const existing = data.habitLogs.find(
      (l) => l.habitId === habitId && l.date === date
    );
    if (existing) {
      if (existing.count > 1) {
        existing.count -= 1;
      } else {
        data.habitLogs = data.habitLogs.filter((l) => l.id !== existing.id);
      }
      this.saveData();
    }
  }

  isHabitLogged(habitId: string, date: string = getToday()): boolean {
    return this.getData().habitLogs.some(
      (l) => l.habitId === habitId && l.date === date
    );
  }

  getHabitLogs(habitId: string): HabitLog[] {
    return this.getData().habitLogs.filter((l) => l.habitId === habitId);
  }

  getHabitLogDates(habitId: string): string[] {
    return this.getHabitLogs(habitId).map((l) => l.date);
  }

  // ============================================================
  // Notes
  // ============================================================

  getNotes(): Note[] {
    return this.getData().notes.filter((n) => !n.archived);
  }

  getNote(id: string): Note | undefined {
    return this.getData().notes.find((n) => n.id === id);
  }

  createNote(note: Omit<Note, "id" | "createdAt" | "updatedAt" | "attachments">): Note {
    const data = this.getData();
    const now = new Date().toISOString();
    const newNote: Note = {
      ...note,
      id: generateId(),
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };
    data.notes.push(newNote);
    this.saveData();
    return newNote;
  }

  updateNote(id: string, updates: Partial<Note>): Note | undefined {
    const data = this.getData();
    const idx = data.notes.findIndex((n) => n.id === id);
    if (idx === -1) return undefined;
    data.notes[idx] = { ...data.notes[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveData();
    return data.notes[idx];
  }

  deleteNote(id: string): void {
    this.getData().notes = this.getData().notes.filter((n) => n.id !== id);
    this.saveData();
  }

  searchNotes(query: string, filters?: { tags?: string[]; folderId?: string }): Note[] {
    let notes = this.getNotes();
    const q = query.toLowerCase();
    if (q) {
      notes = notes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
      );
    }
    if (filters?.tags?.length) {
      notes = notes.filter((n) => filters.tags!.some((t) => n.tags.includes(t)));
    }
    if (filters?.folderId) {
      notes = notes.filter((n) => n.folderId === filters.folderId);
    }
    return notes.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  // ============================================================
  // Journal
  // ============================================================

  getJournalEntries(): JournalEntry[] {
    return this.getData().journalEntries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  getJournalEntry(date: string): JournalEntry | undefined {
    return this.getData().journalEntries.find((e) => e.date === date);
  }

  createJournalEntry(entry: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">): JournalEntry {
    const data = this.getData();
    const now = new Date().toISOString();
    const newEntry: JournalEntry = {
      ...entry,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const existing = data.journalEntries.findIndex((e) => e.date === entry.date);
    if (existing >= 0) {
      data.journalEntries[existing] = { ...data.journalEntries[existing], ...newEntry, updatedAt: now };
    } else {
      data.journalEntries.push(newEntry);
    }
    this.saveData();
    return newEntry;
  }

  updateJournalEntry(id: string, updates: Partial<JournalEntry>): JournalEntry | undefined {
    const data = this.getData();
    const idx = data.journalEntries.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    data.journalEntries[idx] = { ...data.journalEntries[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveData();
    return data.journalEntries[idx];
  }

  // ============================================================
  // Tasks
  // ============================================================

  getTasks(): Task[] {
    return this.getData().tasks.filter((t) => t.status !== "archived");
  }

  getTask(id: string): Task | undefined {
    return this.getData().tasks.find((t) => t.id === id);
  }

  createTask(task: Omit<Task, "id" | "createdAt" | "updatedAt" | "order">): Task {
    const data = this.getData();
    const now = new Date().toISOString();
    const newTask: Task = {
      ...task,
      id: generateId(),
      order: data.tasks.length,
      createdAt: now,
      updatedAt: now,
    };
    data.tasks.push(newTask);
    this.saveData();
    return newTask;
  }

  updateTask(id: string, updates: Partial<Task>): Task | undefined {
    const data = this.getData();
    const idx = data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    data.tasks[idx] = { ...data.tasks[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveData();
    return data.tasks[idx];
  }

  deleteTask(id: string): void {
    this.getData().tasks = this.getData().tasks.filter((t) => t.id !== id);
    this.saveData();
  }

  toggleTask(id: string): Task | undefined {
    const task = this.getTask(id);
    if (!task) return undefined;
    const done = task.status === "done";
    return this.updateTask(id, {
      status: done ? "todo" : "done",
      completedAt: done ? null : new Date().toISOString(),
    });
  }

  reorderTasks(taskIds: string[]): void {
    const data = this.getData();
    taskIds.forEach((id, index) => {
      const task = data.tasks.find((t) => t.id === id);
      if (task) task.order = index;
    });
    this.saveData();
  }

  // ============================================================
  // AI
  // ============================================================

  getConversations(): AIConversation[] {
    return this.getData().aiConversations;
  }

  createConversation(): AIConversation {
    const data = this.getData();
    const conv: AIConversation = {
      id: generateId(),
      title: "New Chat",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.aiConversations.push(conv);
    this.saveData();
    return conv;
  }

  addMessage(conversationId: string, message: Omit<AIMessage, "id" | "timestamp">): AIMessage | null {
    const data = this.getData();
    const conv = data.aiConversations.find((c) => c.id === conversationId);
    if (!conv) return null;
    const msg = {
      ...message,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    conv.messages.push(msg);
    conv.updatedAt = new Date().toISOString();
    this.saveData();
    return msg;
  }

  getSuggestions(): AISuggestion[] {
    return this.getData().aiSuggestions;
  }

  addSuggestion(suggestion: Omit<AISuggestion, "id" | "timestamp" | "read">): AISuggestion {
    const data = this.getData();
    const sug: AISuggestion = {
      ...suggestion,
      id: generateId(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    data.aiSuggestions.push(sug);
    this.saveData();
    return sug;
  }

  markSuggestionRead(id: string): void {
    const data = this.getData();
    const sug = data.aiSuggestions.find((s) => s.id === id);
    if (sug) {
      sug.read = true;
      this.saveData();
    }
  }

  // ============================================================
  // Onboarding
  // ============================================================

  completeOnboarding(): void {
    this.getData().onboardingCompleted = true;
    this.saveData();
  }

  isOnboardingCompleted(): boolean {
    return this.getData().onboardingCompleted;
  }

  // ============================================================
  // Data Management
  // ============================================================

  exportData(): string {
    return JSON.stringify(this.getData(), null, 2);
  }

  importData(json: string): boolean {
    try {
      const data = JSON.parse(json);
      this.data = { ...DEFAULT_DATA, ...data };
      this.saveData();
      return true;
    } catch {
      return false;
    }
  }

  clearAll(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SYNC_KEY);
    this.data = null;
  }
}

export const storage = new Storage();
