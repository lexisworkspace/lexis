import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  parseISO,
  differenceInDays,
  addDays,
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt: string = "MMM d, yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt);
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (isThisWeek(d)) return format(d, "EEEE");
  return formatDistanceToNow(d, { addSuffix: true });
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  return eachDayOfInterval({ start, end });
}

export function generateId(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getToday(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function getWeekRange(date: Date = new Date()): { start: string; end: string } {
  return {
    start: format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    end: format(endOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd"),
  };
}

export function getDateRange(days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(format(addDays(new Date(), -i), "yyyy-MM-dd"));
  }
  return dates;
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + "...";
}

export function calculateStreak(logDates: string[]): { current: number; longest: number } {
  if (logDates.length === 0) return { current: 0, longest: 0 };

  const sorted = [...new Set(logDates)].sort().reverse();
  let current = 0;
  let longest = 1;
  let tempStreak = 1;

  const today = getToday();
  const yesterday = format(addDays(parseISO(today), -1), "yyyy-MM-dd");

  // Check if streak is still active (logged today or yesterday)
  const lastLog = sorted[0];
  if (lastLog !== today && lastLog !== yesterday) {
    current = 0;
  } else {
    for (let i = 0; i < sorted.length; i++) {
      const currentDate = sorted[i];
      const expectedPrev = format(addDays(parseISO(currentDate), -1), "yyyy-MM-dd");
      if (i < sorted.length - 1 && sorted[i + 1] === expectedPrev) {
        tempStreak++;
      } else {
        if (i === 0) current = tempStreak;
        longest = Math.max(longest, tempStreak);
        tempStreak = 1;
      }
    }
  }

  // Calculate longest streak from all logs
  tempStreak = 1;
  const asc = [...sorted].reverse();
  for (let i = 0; i < asc.length - 1; i++) {
    const expectedNext = format(addDays(parseISO(asc[i]), 1), "yyyy-MM-dd");
    if (asc[i + 1] === expectedNext) {
      tempStreak++;
      longest = Math.max(longest, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return { current, longest };
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getMoodScore(mood: string): number {
  const scores: Record<string, number> = {
    amazing: 100,
    good: 75,
    neutral: 50,
    bad: 25,
    terrible: 0,
  };
  return scores[mood] || 50;
}
