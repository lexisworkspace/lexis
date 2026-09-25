"use client";

// Browser SpeechRecognition type declarations
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

import { useState, useEffect, useCallback, useRef } from "react";

interface UseVoiceDictationOptions {
  lang?: string;
  /** Called with each finalized phrase (already committed text). */
  onFinal?: (text: string) => void;
}

const FRIENDLY_ERRORS: Record<string, string> = {
  "not-allowed": "Microphone permission denied - allow it in your browser settings.",
  "service-not-allowed": "Speech service blocked - dictation needs Chrome/Edge and an internet connection.",
  network: "Speech service unreachable - check your connection.",
  "audio-capture": "No microphone found on this device.",
};

// Browser SpeechRecognition wrapper - live dictation with interim results.
// Continuous mode: keeps listening until the user presses stop; each final
// phrase is committed via onFinal, interim words stream to onInterim so the
// user sees text appear in real time (the old single-shot silent version
// looked broken because it gave zero feedback).
export function useVoiceDictation(options: UseVoiceDictationOptions = {}) {
  const { lang = "en-US", onFinal } = options;
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [interim, setInterim] = useState("");

  const recRef = useRef<SpeechRecognition | null>(null);
  const wantActiveRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;
    setSupported(!!SpeechRecognition);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    clearTimer();
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    wantActiveRef.current = false;
    try {
      recRef.current?.abort();
    } catch {
      /* noop */
    }
    recRef.current = null;
  }, [clearTimer]);

  const stop = useCallback(() => {
    wantActiveRef.current = false;
    setListening(false);
    setInterim("");
    clearTimer();
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
      // Belt and braces: if stop() leaves the engine holding the mic (a real
      // Chrome quirk - the NEXT session then starts "listening" but receives
      // silence), abort releases the stream for the next run.
      window.setTimeout(() => {
        try {
          rec.abort();
        } catch {
          /* noop */
        }
      }, 250);
    }
  }, [clearTimer]);

  const start = useCallback(async () => {
    // Ref-based guard: rapid double-taps must not spawn two engines, and a
    // stale `listening` state must never block a legitimate restart.
    if (wantActiveRef.current) return;
    setError(null);
    setInterim("");

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Dictation needs Chrome, Edge, or Safari (not available in this browser).");
      return;
    }

    // Kill any leftover engine from a previous session before opening a new
    // one - a lingering instance silently owns the mic and the new session
    // then hears nothing (the "works once, dead after" bug).
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      recRef.current?.abort();
    } catch {
      /* noop */
    }
    recRef.current = null;

    wantActiveRef.current = true;

    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim(interimText.trim());
      const t = finalText.trim();
      if (t) {
        setInterim("");
        onFinalRef.current?.(t);
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") return; // normal pauses
      setError(FRIENDLY_ERRORS[event.error] || `Speech error: ${event.error}`);
      wantActiveRef.current = false;
      setListening(false);
      clearTimer();
      recRef.current = null;
    };

    rec.onend = () => {
      // Continuous mode: Chrome ends segments periodically - restart after a
      // short delay (an immediate start() inside onend often throws or is
      // silently swallowed by the engine).
      if (wantActiveRef.current) {
        if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = window.setTimeout(() => {
          restartTimerRef.current = null;
          if (!wantActiveRef.current) return;
          try {
            rec.start();
          } catch {
            // Engine stuck - hard rebuild once so the session survives.
            try {
              rec.abort();
            } catch {
              /* noop */
            }
            if (recRef.current === rec) recRef.current = null;
            try {
              const fresh = new SpeechRecognition();
              fresh.lang = rec.lang;
              fresh.continuous = true;
              fresh.interimResults = true;
              fresh.maxAlternatives = 1;
              fresh.onresult = rec.onresult;
              fresh.onerror = rec.onerror;
              fresh.onend = rec.onend;
              recRef.current = fresh;
              fresh.start();
            } catch {
              wantActiveRef.current = false;
              setListening(false);
            }
          }
        }, 300);
        return;
      }
      setListening(false);
      setInterim("");
      clearTimer();
      recRef.current = null;
    };

    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      setError("Failed to start dictation.");
      wantActiveRef.current = false;
    }
  }, [clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => teardown();
  }, [teardown]);

  // Auto-clear errors
  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => setError(null), 6000);
    return () => clearTimeout(id);
  }, [error]);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return { supported, listening, processing, duration, error, interim, start, stop, formatDuration };
}
