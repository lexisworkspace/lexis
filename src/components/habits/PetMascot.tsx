"use client";

// ============================================================
// PetMascot — the companion card on the Habits page.
// Feeds off habit logs via lib/pet-habits.ts. Pure local cosmetic:
// if no pet is chosen (existing users), shows a quiet pointer to
// Settings instead of nothing.
// ============================================================

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Pencil, ShieldCheck, Utensils } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { storage } from "@/lib/storage";
import { petById, petSvg } from "@/lib/pets";
import { PET_STAGE_SIZE, petMealsEaten, petMood, petStage } from "@/lib/pet-habits";
import { cn, getToday } from "@/lib/utils";

export function PetMascot() {
  const { t } = useI18n();
  const [data, setData] = useState(storage.getData());
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const prevMealsToday = useRef<number | null>(null);

  useEffect(() => storage.subscribe(() => setData({ ...storage.getData() })), []);

  const today = getToday();
  const pet = petById(data.profile?.pet);
  const mealsToday = data.habitLogs.filter((l) => l.date === today).length;
  const meals = petMealsEaten(data.habitLogs.length);
  const stage = petStage(meals);
  const mood = petMood(mealsToday);
  const shields = (data as any).streakFreezeTokens ?? 0;
  const name = (data.profile?.petName || "").trim() || pet?.name || t("habits.pet.title");

  // Celebrate the moment the pet gets fed (0 logged habits → ≥1 today).
  useEffect(() => {
    const prev = prevMealsToday.current;
    prevMealsToday.current = mealsToday;
    if (prev !== null && prev === 0 && mealsToday > 0) {
      setCelebrate(true);
      const id = window.setTimeout(() => setCelebrate(false), 1800);
      return () => window.clearTimeout(id);
    }
  }, [mealsToday]);

  if (!pet) {
    return (
      <div className="card flex items-center gap-3 p-4 text-sm text-muted-foreground">
        <Heart className="h-4 w-4 shrink-0 text-muted-foreground/50" />
        <p>
          {t("habits.pet.noPet")}{" "}
          <Link href="/settings" className="font-medium text-foreground underline underline-offset-2">
            {t("settings.title")}
          </Link>
        </p>
      </div>
    );
  }

  const startRename = () => {
    setDraft(data.profile?.petName || "");
    setRenaming(true);
  };
  const saveRename = () => {
    storage.updateProfile({ petName: draft.trim().slice(0, 24) });
    setRenaming(false);
  };

  const pct = stage.next ? Math.min(100, Math.round((meals / stage.next) * 100)) : 100;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="card relative overflow-hidden p-4 sm:p-5"
      aria-label={t("habits.pet.title")}
    >
      <div className="flex items-center gap-4">
        {/* Pet body — grows with stage, floats when happy */}
        <div className="relative shrink-0">
          <div
            className="absolute inset-0 -m-2 rounded-full opacity-20 blur-md transition-colors duration-500"
            style={{ backgroundColor: mood === "happy" ? pet.c1 : "transparent" }}
          />
          <motion.div
            animate={mood === "happy" ? { y: [0, -3, 0] } : { y: 0 }}
            transition={{ duration: 2.4, repeat: mood === "happy" ? Infinity : 0, ease: "easeInOut" }}
            className={cn(PET_STAGE_SIZE[stage.label], "transition-all duration-700")}
            dangerouslySetInnerHTML={{ __html: petSvg(pet, "h-full w-full") }}
          />
          {mood === "hungry" && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
              <Utensils className="h-3 w-3" />
            </span>
          )}
          <AnimatePresence>
            {celebrate && (
              <motion.span
                initial={{ opacity: 0, y: 6, scale: 0.6 }}
                animate={{ opacity: 1, y: -18, scale: 1 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.8 }}
                className="absolute -top-2 left-1/2 -translate-x-1/2 text-red-400"
              >
                <Heart className="h-4 w-4 fill-current" />
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Name + mood */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {renaming ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={saveRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                maxLength={24}
                className="w-40 rounded-lg border border-border bg-secondary/40 px-2 py-1 text-sm outline-none focus:border-primary-500/50"
                aria-label={t("habits.pet.rename")}
              />
            ) : (
              <>
                <h3 className="truncate font-semibold leading-tight">{name}</h3>
                <button
                  type="button"
                  onClick={startRename}
                  className="rounded p-1 text-muted-foreground/50 transition-colors hover:text-foreground"
                  aria-label={t("habits.pet.rename")}
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
          <p className={cn("mt-0.5 text-xs", mood === "happy" ? "text-emerald-500" : "text-amber-500")}>
            {mood === "happy" ? t("habits.pet.happy") : t("habits.pet.hungry")}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/70">
            {t(`habits.pet.stage.${stage.label}`)} · {t(meals === 1 ? "habits.pet.meal" : "habits.pet.meals").replace("{n}", String(meals))}
          </p>
          {shields > 0 && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-sky-400">
              <ShieldCheck className="h-3 w-3" />
              {t("habits.pet.shields").replace("{n}", String(shields))}
            </p>
          )}
        </div>

        {/* Growth progress toward next stage */}
        <div className="hidden w-32 shrink-0 sm:block">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: pet.c1 }}
            />
          </div>
          <p className="mt-1 text-right text-[10px] text-muted-foreground/60">
            {stage.next ? t("habits.pet.next").replace("{n}", String(stage.next - meals)) : t("habits.pet.max")}
          </p>
        </div>
      </div>
    </motion.section>
  );
}
