"use client";

// ============================================================
// Orleia Pets — habits integration.
// The chosen pet (profile.pet, picked in the tutorial or Settings)
// lives on the Habits page and feeds off your habit logs:
//   • Every habit logged today = one meal.
//   • Fed today (≥1 habit logged) → happy.
//   • Nothing logged today → hungry (never shaming: it perks up
//     the moment you log anything).
//   • It grows with total meals: Baby → Buddy → Champion → Legend.
// Pure local-first cosmetic — no cloud, no image files; it renders
// from the same generative SVG as the avatar.
// ============================================================

import type { OrleiaPet } from "@/lib/pets";

export type PetMood = "happy" | "hungry";

export type PetStage = {
  label: "baby" | "buddy" | "champion" | "legend";
  next: number | null;
};

const STAGE_THRESHOLDS: Array<{ at: number; label: PetStage["label"] }> = [
  { at: 0, label: "baby" },
  { at: 30, label: "buddy" },
  { at: 100, label: "champion" },
  { at: 250, label: "legend" },
];

/** Meals eaten = total habit logs ever (one habit logged = one meal). */
export function petMealsEaten(logCount: number): number {
  return Math.max(0, logCount);
}

export function petStage(meals: number): PetStage {
  let current = STAGE_THRESHOLDS[0];
  for (const s of STAGE_THRESHOLDS) if (meals >= s.at) current = s;
  const nextAt = STAGE_THRESHOLDS.find((s) => s.at > meals);
  return { label: current.label, next: nextAt ? nextAt.at : null };
}

/** Mood is strictly about today: fed today → happy, else hungry. */
export function petMood(mealsToday: number): PetMood {
  return mealsToday > 0 ? "happy" : "hungry";
}

/**
 * Size class per stage — the pet visibly grows as it is fed over time.
 * Kept as Tailwind sizes so it stays crisp and consistent with the app.
 */
export const PET_STAGE_SIZE: Record<PetStage["label"], string> = {
  baby: "h-12 w-12",
  buddy: "h-14 w-14",
  champion: "h-16 w-16",
  legend: "h-20 w-20",
};

export type { OrleiaPet };
