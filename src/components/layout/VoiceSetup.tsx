"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Play, AudioLines } from "lucide-react";
import { storage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import {
  VOICE_PERSONAS,
  VoicePersona,
  getVoicePersona,
  speakPreview,
  stopSpeaking,
} from "@/lib/voices";
import { VoiceOrb } from "@/components/assistant/VoiceOrb";

/**
 * Voice-picker step in onboarding — minimal, centered, LexisOS-native.
 * Only shows the orb + cards + action, nothing else.
 */
export function VoiceSetup({
  onDone,
  onSkip,
}: {
  onDone: () => void;
  onSkip: () => void;
}) {
  const [selected, setSelected] = useState<VoicePersona>(() =>
    getVoicePersona(storage.getData().theme.voiceId)
  );
  const [playingId, setPlayingId] = useState<string | null>(null);

  const lang = storage.getData().theme.language || "en";

  const choose = (p: VoicePersona) => {
    setSelected(p);
    setPlayingId(p.id);
    speakPreview(p, lang, () => setPlayingId((cur) => (cur === p.id ? null : cur)));
  };

  const confirm = () => {
    stopSpeaking();
    storage.updateTheme({ voiceId: selected.id });
    onDone();
  };

  useEffect(
    () => () => {
      stopSpeaking();
    },
    []
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background">
      <div className="flex flex-1 flex-col justify-center px-6">
        <div className="mx-auto w-full max-w-md">
          {/* Wordmark */}
          <div className="mb-8 flex justify-center">
            <p className="text-xs font-sans tracking-[0.5em] text-muted-foreground/40">
              LEXIS<span className="text-foreground/60">OS</span>
            </p>
          </div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-2 text-center font-serif text-3xl font-light tracking-tight text-foreground md:text-4xl"
          >
            Choose Noor&apos;s voice
          </motion.h1>
          <p className="mb-8 text-center text-sm text-muted-foreground/70">
            Tap a voice to hear it. You can change it anytime in Settings.
          </p>

          {/* Orb preview */}
          <div className="mb-8 flex justify-center">
            <div className="flex flex-col items-center gap-2.5">
              <VoiceOrb state="idle" size="md" />
              <p className="text-sm font-semibold">{selected.name}</p>
              <p className="text-xs text-muted-foreground/60">{selected.tagline}</p>
            </div>
          </div>

          {/* Voice cards */}
          <div className="mb-8 grid grid-cols-3 gap-2.5">
            {VOICE_PERSONAS.map((p) => {
              const active = selected.id === p.id;
              const playing = playingId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => choose(p)}
                  className={cn(
                    "group relative rounded-2xl border p-3 text-left transition-all duration-200 active:scale-[0.98] touch-manipulation",
                    active
                      ? "border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/20"
                      : "border-border hover:border-muted-foreground/30 hover:bg-secondary/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        p.gender === "male" ? "bg-sky-500" : "bg-pink-500"
                      )}
                    />
                    {playing ? (
                      <span className="flex items-center gap-1 text-[10px] text-primary-500">
                        <span className="voice-bar h-2 w-[2px] rounded-full bg-primary-500" />
                        <span className="voice-bar h-2 w-[2px] rounded-full bg-primary-500" style={{ animationDelay: "0.15s" }} />
                        <span className="voice-bar h-2 w-[2px] rounded-full bg-primary-500" style={{ animationDelay: "0.3s" }} />
                      </span>
                    ) : active ? (
                      <Check className="h-3.5 w-3.5 text-primary-500" />
                    ) : (
                      <Play className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
                    )}
                  </div>
                  <p className="mt-2 text-sm font-semibold">{p.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground/70">
                    {p.tagline}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                onSkip();
              }}
              className="text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors tracking-wide"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={confirm}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <AudioLines className="h-4 w-4" />
              Continue
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
