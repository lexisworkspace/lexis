"use client";

import { Laugh, Smile, Meh, Frown, Angry, type LucideIcon } from "lucide-react";
import type { Mood } from "@/types";
import { cn } from "@/lib/utils";

/** Icon faces used everywhere a mood is shown - replaces the old emoji set. */
export const MOOD_FACES: Record<Mood, LucideIcon> = {
  amazing: Laugh,
  good: Smile,
  neutral: Meh,
  bad: Frown,
  terrible: Angry,
};

export function MoodFace({
  mood,
  className,
  strokeWidth = 1.75,
}: {
  mood: Mood;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = MOOD_FACES[mood] ?? Smile;
  return <Icon className={cn("shrink-0", className)} strokeWidth={strokeWidth} />;
}
