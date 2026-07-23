// ============================================================
// Core Types
// ============================================================

export type Theme = "light" | "dark" | "system";
export type ViewMode = "list" | "grid" | "kanban" | "calendar";

export interface ThemeConfig {
  theme: Theme;
  primaryColor: string;
  fontSize: "sm" | "md" | "lg";
  reducedMotion: boolean;
}

// ============================================================
// Habit Types
// ============================================================

export type HabitFrequency = "daily" | "weekly" | "monthly" | "custom";
export type HabitTimeOfDay = "morning" | "afternoon" | "evening" | "anytime";

export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const DAYS_OF_WEEK_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export interface HabitCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  frequency: HabitFrequency;
  customDays?: number[];
  timeOfDay: HabitTimeOfDay;
  targetCount: number;
  createdAt: string;
  archived: boolean;
  color: string;
  icon: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  count: number;
  note?: string;
  createdAt: string;
}

export interface HabitStreak {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string | null;
  totalCompletions: number;
  completionRate: number;
}

// ============================================================
// Note Types
// ============================================================

export interface NoteTag {
  id: string;
  name: string;
  color: string;
}

export interface NoteFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  contentHtml: string;
  folderId: string | null;
  tags: string[];
  pinned: boolean;
  archived: boolean;
  favorite: boolean;
  attachments: Attachment[];
  aiSummary?: string;
  aiActionItems?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: "image" | "file" | "link";
  url: string;
  size?: number;
  createdAt: string;
}

// ============================================================
// Journal Types
// ============================================================

export type Mood = "amazing" | "good" | "neutral" | "bad" | "terrible";

export interface MoodConfig {
  value: Mood;
  emoji: string;
  label: string;
  color: string;
}

export const MOODS: MoodConfig[] = [
  { value: "amazing", emoji: "🌟", label: "Amazing", color: "#d4d4d8" },
  { value: "good", emoji: "😊", label: "Good", color: "#a1a1aa" },
  { value: "neutral", emoji: "😐", label: "Neutral", color: "#71717a" },
  { value: "bad", emoji: "😔", label: "Bad", color: "#52525b" },
  { value: "terrible", emoji: "😢", label: "Terrible", color: "#3f3f46" },
];

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: Mood;
  gratitude: string[];
  reflectionPrompts: ReflectionPrompt[];
  createdAt: string;
  updatedAt: string;
}

export interface ReflectionPrompt {
  question: string;
  answer: string;
}

// ============================================================
// Task Types
// ============================================================

export type TaskPriority = "urgent" | "high" | "medium" | "low";
export type TaskStatus = "todo" | "in_progress" | "done" | "archived";
export type RecurringType = "daily" | "weekly" | "monthly" | "yearly" | "none";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  dueTime: string | null;
  completedAt: string | null;
  tags: string[];
  listId: string | null;
  recurring: RecurringType;
  recurringDays?: number[];
  recurringEndDate: string | null;
  estimatedMinutes: number | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskList {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
}

// ============================================================
// Analytics Types
// ============================================================

export interface ProductivityScore {
  date: string;
  score: number;
  habitsCompleted: number;
  tasksCompleted: number;
  journalWritten: boolean;
  notesCreated: number;
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  habitCompletions: number;
  tasksCompleted: number;
  journalEntries: number;
  notesCreated: number;
  averageMood: Mood | null;
  productivityScores: ProductivityScore[];
}

// ============================================================
// AI Types
// ============================================================

export type AIModel = "arete-1.5" | "thallo-1.0" | "tsubame-0.7";


export const AI_MODELS: { id: AIModel; name: string; description: string; tagline: string; contextWindow: number; responseStyle: string }[] = [
  { id: "arete-1.5", name: "Arete 1.5", description: "Most complex and reasonable", tagline: "Deep analysis & strategic thinking", contextWindow: 20, responseStyle: "thorough" },
  { id: "thallo-1.0", name: "Thallo 1.0", description: "Best for everyday tasks", tagline: "Balanced, practical, actionable", contextWindow: 12, responseStyle: "balanced" },
  { id: "tsubame-0.7", name: "Tsubame 0.7", description: "Best for quick answers", tagline: "Fast, concise, to the point", contextWindow: 6, responseStyle: "concise" },
];



export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  model?: AIModel;
}

export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AISuggestion {
  id: string;
  type: "insight" | "tip" | "motivation" | "suggestion";
  title: string;
  content: string;
  timestamp: string;
  read: boolean;
}

// ============================================================
// App State
// ============================================================

export interface AppData {
  theme: ThemeConfig;
  habits: Habit[];
  habitCategories: HabitCategory[];
  habitLogs: HabitLog[];
  notes: Note[];
  noteTags: NoteTag[];
  noteFolders: NoteFolder[];
  journalEntries: JournalEntry[];
  tasks: Task[];
  taskLists: TaskList[];
  aiConversations: AIConversation[];
  aiSuggestions: AISuggestion[];
  selectedModel: AIModel;

  onboardingCompleted: boolean;
  lastSync: string | null;
}

export const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", color: "#a1a1aa", icon: "alert-circle" },
  high: { label: "High", color: "#a1a1aa", icon: "arrow-up" },
  medium: { label: "Medium", color: "#a1a1aa", icon: "minus" },
  low: { label: "Low", color: "#52525b", icon: "arrow-down" },
} as const;

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: "To Do", color: "#52525b" },
  in_progress: { label: "In Progress", color: "#a1a1aa" },
  done: { label: "Done", color: "#d4d4d8" },
  archived: { label: "Archived", color: "#3f3f46" },
};
