"use client";

import { useEffect } from "react";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { VoicePoweredOrb } from "@/components/ui/voice-powered-orb";
import { stripMarkdown } from "@/lib/voices";

interface VoiceModeOverlayProps {
  open: boolean;
  listening: boolean;
  processing: boolean;
  thinking: boolean;
  speaking: boolean;
  userText: string;
  noorText: string;
  error: "permission" | "generic" | null;
  missed?: boolean;
  onTap: () => void;
  onClose: () => void;
}

/**
 * Immersive voice conversation - one big clean orb you tap to talk.
 * While you speak it breathes; while Noor replies it glows and the reply is
 * shown as text below so you always have visual feedback.
 */
export function VoiceModeOverlay({
  open,
  listening,
  processing,
  thinking,
  speaking,
  userText,
  noorText,
  error,
  missed = false,
  onTap,
  onClose,
}: VoiceModeOverlayProps) {
  const { t } = useI18n();

  // Esc closes the interface.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Auto-start listening when voice mode opens
  useEffect(() => {
    if (open && !listening && !processing && !thinking && !speaking) {
      // Small delay so the overlay animates in first
      const id = setTimeout(() => onTap(), 300);
      return () => clearTimeout(id);
    }
  }, [open]);

  if (!open) return null;

  const status = listening
    ? t("assistant.listening")
    : processing
    ? t("assistant.transcribingLong")
    : thinking
    ? t("assistant.responding")
    : speaking
    ? t("assistant.speaking")
    : t("assistant.listening");

  return (
    <div className="voice-overlay">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        title={t("assistant.endVoice")}
        aria-label={t("assistant.endVoice")}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-secondary/40 text-muted-foreground transition-all duration-200 hover:border-white/20 hover:text-foreground active:scale-90"
      >
        <XIcon className="h-5 w-5" />
      </button>

      {/* Status label */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-[10px] font-mono tracking-[0.3em] text-white/30 uppercase">
          {t("assistant.voiceMode")}
        </span>
        <p className="text-sm text-white/60">{status}</p>
      </div>

      {/* The WebGL voice orb */}
      <div
        className="big-orb cursor-pointer"
        role="presentation"
      >
        <VoicePoweredOrb
          enableVoiceControl={listening || speaking}
          hue={listening ? 0 : speaking ? 220 : 0}
          voiceSensitivity={1.8}
          maxRotationSpeed={1.5}
          maxHoverIntensity={0.8}
          className="rounded-full"
        />
      </div>

      {/* Conversation feedback */}
      <div className="vo-transcript">
        {userText && (
          <p key={userText} className="vo-fade-in text-[15px] font-medium text-foreground/90 leading-relaxed">
            {userText}
          </p>
        )}
        {noorText && (
          <p key={noorText} className="vo-fade-in mt-2.5 text-[15px] text-foreground/70 leading-relaxed">
            <span className="font-semibold text-white/70">Noor</span>
            <span className="mx-1.5 text-muted-foreground/40">·</span>
            {stripMarkdown(noorText).slice(0, 280)}
          </p>
        )}
        {error && (
          <p className="mt-3 text-xs text-red-400/90">
            {error === "permission" ? t("assistant.permissionDenied") : t("assistant.voiceError")}
          </p>
        )}
        {missed && !listening && !processing && !thinking && !speaking && (
          <p className="vo-fade-in mt-3 text-xs text-white/40">
            {t("assistant.didntCatch")}
          </p>
        )}
      </div>
    </div>
  );
}
