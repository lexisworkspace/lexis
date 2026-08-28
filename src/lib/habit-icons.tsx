// ============================================================
// Lexis - habit icon palette (lucide, matching app design)
// Replaces the old emoji picker. Habit.icon stores the icon
// name; this module maps names -> components and migrates
// legacy emoji values to their lucide equivalent.
// ============================================================

import {
  Dumbbell,
  Brain,
  BookOpen,
  Flower2,
  Footprints,
  Target,
  Palette,
  Music,
  Sprout,
  Droplets,
  Flame,
  Star,
  Heart,
  Moon,
  Sun,
  Coffee,
  Salad,
  UtensilsCrossed,
  PenLine,
  StickyNote,
  PiggyBank,
  Laptop,
  Bike,
  Waves,
  Sunrise,
  RefreshCw,
  Clock,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface HabitIconDef {
  name: string;
  label: string;
  Icon: LucideIcon;
}

// Curated palette - habits people actually track, in Lexis style
export const HABIT_ICONS: HabitIconDef[] = [
  { name: "dumbbell", label: "Workout", Icon: Dumbbell },
  { name: "brain", label: "Mind", Icon: Brain },
  { name: "book", label: "Reading", Icon: BookOpen },
  { name: "meditate", label: "Meditate", Icon: Flower2 },
  { name: "walk", label: "Walking", Icon: Footprints },
  { name: "target", label: "Goal", Icon: Target },
  { name: "paint", label: "Creative", Icon: Palette },
  { name: "music", label: "Music", Icon: Music },
  { name: "grow", label: "Growth", Icon: Sprout },
  { name: "water", label: "Hydrate", Icon: Droplets },
  { name: "flame", label: "Streak", Icon: Flame },
  { name: "star", label: "Star", Icon: Star },
  { name: "heart", label: "Self-care", Icon: Heart },
  { name: "sleep", label: "Sleep", Icon: Moon },
  { name: "sun", label: "Sunshine", Icon: Sun },
  { name: "coffee", label: "Coffee", Icon: Coffee },
  { name: "salad", label: "Healthy eat", Icon: Salad },
  { name: "cook", label: "Cooking", Icon: UtensilsCrossed },
  { name: "write", label: "Writing", Icon: PenLine },
  { name: "journal", label: "Journal", Icon: StickyNote },
  { name: "save", label: "Savings", Icon: PiggyBank },
  { name: "focus", label: "Focus", Icon: Laptop },
  { name: "cycle", label: "Cycling", Icon: Bike },
  { name: "swim", label: "Swimming", Icon: Waves },
];

const ICON_BY_NAME: Record<string, LucideIcon> = Object.fromEntries(
  HABIT_ICONS.map((d) => [d.name, d.Icon])
);

// Legacy emojis saved by older versions -> lucide equivalents
const LEGACY_EMOJI: Record<string, string> = {
  "💪": "dumbbell",
  "🧠": "brain",
  "📚": "book",
  "🧘": "meditate",
  "🏃": "walk",
  "🎯": "target",
  "🎨": "paint",
  "🎵": "music",
  "🌱": "grow",
  "💧": "water",
  "🔥": "flame",
  "⭐": "star",
  "❤️": "heart",
  "🌈": "star",
  "🦋": "grow",
  "🌙": "sleep",
  "☀️": "sun",
  "🌅": "sun",
  "🔄": "focus",
  "circle": "target",
};

/** Resolve any stored icon value to a lucide component (falls back to Star). */
export function habitIconFor(value: string | undefined | null): LucideIcon {
  if (!value) return Star;
  if (ICON_BY_NAME[value]) return ICON_BY_NAME[value];
  const migrated = LEGACY_EMOJI[value.trim()];
  if (migrated && ICON_BY_NAME[migrated]) return ICON_BY_NAME[migrated];
  return Star;
}

/** Resolve a stored icon value to its canonical palette name (for editing). */
export function habitIconName(value: string | undefined | null): string {
  if (!value) return "star";
  if (ICON_BY_NAME[value]) return value;
  const migrated = LEGACY_EMOJI[value.trim()];
  return migrated && ICON_BY_NAME[migrated] ? migrated : "star";
}

// ---- Time of day icons ----------------------------------------

export const TIME_OF_DAY_ICONS: { value: string; Icon: LucideIcon }[] = [
  { value: "morning", Icon: Sunrise },
  { value: "afternoon", Icon: Sun },
  { value: "evening", Icon: Moon },
  { value: "anytime", Icon: RefreshCw },
];

export const TIME_ICON_BY_VALUE: Record<string, LucideIcon> = Object.fromEntries(
  TIME_OF_DAY_ICONS.map((d) => [d.value, d.Icon])
);

export { Clock, Sparkles };
