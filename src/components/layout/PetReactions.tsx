"use client";

// ============================================================
// PetReactions — makes the pet feel alive across the whole app.
// A global listener (mounted in ClientLayout) that watches the
// workspace for moments worth reacting to:
//   • You complete a task  → the pet cheers you on (rate-limited).
//   • You log a good mood  → the pet shares the joy.
//   • You log a rough mood → the pet sends a quiet, warm hug.
//   • Late at night        → the pet is asleep and stays quiet.
// Pure local-first cosmetic: zero writes, zero network.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { storage } from "@/lib/storage";
import { petById, petSvg } from "@/lib/pets";
import { getMoodScore, getToday } from "@/lib/utils";

type Reaction = { key: string; emoji: string; id: number };

const CHEER_COOLDOWN_MS = 20_000;
const HIDE_AFTER_MS = 2600;

export function PetReactions() {
  const { t } = useI18n();
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [petKey, setPetKey] = useState("");
  const prev = useRef<{ done: number; mood: number | null }>({ done: -1, mood: null });
  const lastCheer = useRef(0);
  const hidTimer = useRef<number | null>(null);

  useEffect(() => {
    const snapshot = () => {
      const d = storage.getData();
      const today = getToday();
      return {
        done: d.tasks.filter((x: any) => x.status === "done").length,
        mood: (d.journalEntries.find((e: any) => e.date === today)?.mood as string) || null,
        pet: d.profile?.pet || "",
        petName: (d.profile?.petName || "").trim(),
      };
    };

    prev.current = (() => {
      const s = snapshot();
      return { done: s.done, mood: s.mood ? getMoodScore(s.mood as any) : null };
    })();
    setPetKey(snapshot().pet);

    const show = (key: string, emoji: string) => {
      setReaction({ key, emoji, id: Date.now() });
      if (hidTimer.current) window.clearTimeout(hidTimer.current);
      hidTimer.current = window.setTimeout(() => setReaction(null), HIDE_AFTER_MS);
    };

    const unsub = storage.subscribe(() => {
      const s = snapshot();
      setPetKey(s.pet);
      const pet = petById(s.pet);
      if (!pet) return;
      const name = s.petName || pet.name;
      const hour = new Date().getHours();
      const asleep = hour >= 23 || hour < 5;

      const done = s.done;
      const moodScore = s.mood ? getMoodScore(s.mood as any) : null;

      // Task completed → cheer (rate-limited so batch completions feel natural).
      if (prev.current.done >= 0 && done > prev.current.done && !asleep) {
        const now = Date.now();
        if (now - lastCheer.current > CHEER_COOLDOWN_MS) {
          lastCheer.current = now;
          show("pet.alive.cheer", "🎉");
        }
      }

      // Mood logged this session → empathic reaction (once per change).
      if (moodScore !== null && moodScore !== prev.current.mood && !asleep) {
        if (moodScore >= 67) show("pet.alive.happyMood", "😊");
        else if (moodScore <= 33) show("pet.alive.gentle", "💛");
      }

      prev.current = { done, mood: moodScore };
    });
    return () => {
      unsub();
      if (hidTimer.current) window.clearTimeout(hidTimer.current);
    };
  }, []);

  const pet = petById(petKey);
  if (!pet || !reaction) return null;
  const name = (storage.getData().profile?.petName || "").trim() || pet.name;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] print:hidden" aria-live="polite">
      <AnimatePresence>
        <motion.div
          key={reaction.id}
          initial={{ opacity: 0, y: 14, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="card flex items-center gap-2.5 py-2 pl-2.5 pr-3.5 shadow-lg"
        >
          <span
            className="h-8 w-8 shrink-0"
            dangerouslySetInnerHTML={{ __html: petSvg(pet, "h-full w-full") }}
          />
          <span className="text-xs font-medium text-foreground">
            {reaction.emoji} {t(reaction.key).replace("{name}", name)}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
