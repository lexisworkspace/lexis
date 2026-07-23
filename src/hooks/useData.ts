"use client";

import { useState, useEffect, useCallback } from "react";
import { storage } from "@/lib/storage";
import { AppData, Habit, Note, Task, JournalEntry, AIConversation, AISuggestion, HabitLog } from "@/types";

export function useData() {
  const [data, setData] = useState<AppData>(() => storage.getData());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData(storage.getData());
    setLoading(false);
  }, []);

  const refresh = useCallback(() => {
    setData({ ...storage.getData() });
  }, []);

  // Habits
  const habits = data.habits.filter((h) => !h.archived);
  const createHabit = useCallback(
    (habit: Parameters<typeof storage.createHabit>[0]) => {
      const result = storage.createHabit(habit);
      refresh();
      return result;
    },
    [refresh]
  );
  const updateHabit = useCallback(
    (id: string, updates: Partial<Habit>) => {
      const result = storage.updateHabit(id, updates);
      refresh();
      return result;
    },
    [refresh]
  );
  const deleteHabit = useCallback((id: string) => {
    storage.deleteHabit(id);
    refresh();
  }, [refresh]);
  const logHabit = useCallback(
    (habitId: string, date?: string) => {
      const result = storage.logHabit(habitId, date);
      refresh();
      return result;
    },
    [refresh]
  );
  const unlogHabit = useCallback(
    (habitId: string, date?: string) => {
      storage.unlogHabit(habitId, date);
      refresh();
    },
    [refresh]
  );

  // Notes
  const notes = data.notes.filter((n) => !n.archived);
  const createNote = useCallback(
    (note: Parameters<typeof storage.createNote>[0]) => {
      const result = storage.createNote(note);
      refresh();
      return result;
    },
    [refresh]
  );
  const updateNote = useCallback(
    (id: string, updates: Partial<Note>) => {
      const result = storage.updateNote(id, updates);
      refresh();
      return result;
    },
    [refresh]
  );
  const deleteNote = useCallback((id: string) => {
    storage.deleteNote(id);
    refresh();
  }, [refresh]);

  // Journal
  const journalEntries = data.journalEntries;
  const journalStreak = storage.getJournalStreak();
  const createJournalEntry = useCallback(
    (entry: Parameters<typeof storage.createJournalEntry>[0]) => {
      const result = storage.createJournalEntry(entry);
      refresh();
      return result;
    },
    [refresh]
  );

  // Tasks
  const tasks = data.tasks.filter((t) => t.status !== "archived");
  const createTask = useCallback(
    (task: Parameters<typeof storage.createTask>[0]) => {
      const result = storage.createTask(task);
      refresh();
      return result;
    },
    [refresh]
  );
  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      const result = storage.updateTask(id, updates);
      refresh();
      return result;
    },
    [refresh]
  );
  const deleteTask = useCallback((id: string) => {
    storage.deleteTask(id);
    refresh();
  }, [refresh]);
  const toggleTask = useCallback(
    (id: string) => {
      const result = storage.toggleTask(id);
      refresh();
      return result;
    },
    [refresh]
  );

  // AI
  const createConversation = useCallback(() => {
    const result = storage.createConversation();
    refresh();
    return result;
  }, [refresh]);

  return {
    data,
    loading,
    refresh,
    // Habits
    habits,
    habitCategories: data.habitCategories,
    habitLogs: data.habitLogs,
    createHabit,
    updateHabit,
    deleteHabit,
    logHabit,
    unlogHabit,
    // Notes
    notes,
    noteTags: data.noteTags,
    noteFolders: data.noteFolders,
    createNote,
    updateNote,
    deleteNote,
    // Journal
    journalEntries,
    journalStreak,
    createJournalEntry,
    // Tasks
    tasks,
    taskLists: data.taskLists,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    // AI
    aiConversations: data.aiConversations,
    aiSuggestions: data.aiSuggestions,
    createConversation,
    // Onboarding
    onboardingCompleted: data.onboardingCompleted,
    completeOnboarding: () => {
      storage.completeOnboarding();
      refresh();
    },
  };
}
