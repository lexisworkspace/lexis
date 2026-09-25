"use client";

// ============================================================
// PetPickStep — the "choose your companion" step in the tutorial.
// Required: Continue is disabled until a pet is chosen; on Done the
// choice (+ optional name) is saved to profile.pet / profile.petName.
// Pure local-first cosmetic — mirrors Settings → Orleia Pet.
// ============================================================

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Heart, Pencil } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { storage } from "@/lib/storage";
import { PETS, petById, petSvg } from "@/lib/pets";

export function PetPickStep({ onDone }: { onDone: (petId: string) => void }) {
  const { t } = useI18n();
  const [pet, setPet] = useState<string>(storage.getData().profile?.pet || "");
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState(storage.getData().profile?.petName || "");

  const chosen = petById(pet);
  const displayName = name.trim() || chosen?.name || "";

  const finish = () => {
    if (!chosen) return;
    storage.updateProfile({ pet: chosen.id, petName: name.trim().slice(0, 24) });
    onDone(chosen.id);
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-background px-4 pb-6 pt-10 md:px-8 md:pt-14">
      {/* Progress bar, matching TutorialGuide */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-muted">
        <div className="h-full w-full bg-primary-500" />
      </div>

      <p className="text-center text-[10px] font-sans tracking-widest text-muted-foreground/40 md:text-[11px]">
        {t("tutorial.pet.kicker")}
      </p>
      <h2 className="mt-3 text-center text-3xl font-bold tracking-tight md:text-5xl">
        {t("tutorial.pet.title")}
      </h2>
      <p className="mx-auto mt-4 max-w-md text-center text-sm leading-relaxed text-muted-foreground/80 md:text-base">
        {t("tutorial.pet.desc")}
      </p>

      {/* Pet grid */}
      <div className="mx-auto mt-8 grid w-full max-w-md grid-cols-3 gap-3">
        {PETS.map((p, i) => {
          const active = pet === p.id;
          return (
            <motion.button
              key={p.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              onClick={() => setPet(active ? "" : p.id)}
              aria-pressed={active}
              aria-label={`${p.name} pet`}
              className={cnCard(active)}
            >
              <div
                className={cnCell(active)}
                dangerouslySetInnerHTML={{ __html: petSvg(p, "h-full w-full") }}
              />
              <span className="mt-2 block text-center text-[11px] font-medium text-muted-foreground">
                {p.name}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Name field (appears once chosen) */}
      {chosen && (
        <motion.div
          initial={{ opacity:0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto mt-6 w-full max-w-md"
        >
          {naming ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setNaming(false);
                  if (e.key === "Escape") setNaming(false);
                }}
                maxLength={24}
                placeholder={t("tutorial.pet.namePh")}
                className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors focus:border-amber-500/40"
                aria-label={t("tutorial.pet.namePh")}
              />
              <button
                type="button"
                onClick={() => setNaming(false)}
                className="rounded-xl border border-border px-3 py-3 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{displayName}</span>{" "}
                {t("tutorial.pet.selectedSuffix")}
              </p>
              <button
                type="button"
                onClick={() => setNaming(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <Pencil className="h-3 w-3" />
                {t("habits.pet.rename")}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Actions — required step: Continue locked until a pet is chosen */}
      <div className="mt-auto pt-6">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setPet("");
              setName("");
            }}
            className="text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground/70"
          >
            {t("tutorial.pet.reset")}
          </button>
          <div className="flex-1" />
          <button
            type="button"
            disabled={!chosen}
            onClick={finish}
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-6 py-2.5 text-xs font-medium text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Heart className="h-3.5 w-3.5" />
            {t("tutorial.pet.done")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Local class helpers keep the JSX above readable. */
function cnCard(active: boolean): string {
  return [
    "group relative rounded-2xl border p-3 transition-all active:scale-95",
    active
      ? "border-primary-500 bg-primary-500/10"
      : "border-border bg-secondary/40 hover:border-foreground/30",
  ].join(" ");
}

function cnCell(active: boolean): string {
  return [
    "mx-auto h-14 w-14 transition-transform duration-300",
    active ? "scale-110" : "group-hover:scale-105",
  ].join(" ");
}
