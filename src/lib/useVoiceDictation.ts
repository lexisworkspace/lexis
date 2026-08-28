"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceError = "permission" | "generic" | null;

interface UseVoiceDictationOptions {
  lang?: string;
  onFinal?: (text: string) => void;
}

function isSupported(): boolean {
  if (typeof window === "undefined") return false;
  const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasAudioCtx = !!(window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  return hasMedia && hasAudioCtx;
}

/**
 * Voice dictation for Noor. Records 16 kHz mono PCM in the browser (WebAudio),
 * encodes it as a WAV, and sends it to /api/transcribe, which runs
 * whisper-large-v3 via NVIDIA NIM gRPC. Free and accurate - no browser STT.
 */
export function useVoiceDictation(options: UseVoiceDictationOptions = {}) {
  const { lang = "en-US", onFinal } = options;
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<VoiceError>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);
  const sampleRateRef = useRef(16000);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    setSupported(isSupported());
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    clearTimer();
    try {
      procRef.current?.disconnect();
      sourceRef.current?.disconnect();
    } catch {
      /* noop */
    }
    try {
      ctxRef.current?.close();
    } catch {
      /* noop */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    procRef.current = null;
    sourceRef.current = null;
    ctxRef.current = null;
    streamRef.current = null;
  }, [clearTimer]);

  // Downsample a Float32 chunk to 16 kHz mono and append to the PCM buffer.
  const collectChunk = useCallback((input: Float32Array) => {
    const inRate = sampleRateRef.current;
    const outRate = 16000;
    if (inRate === outRate) {
      chunksRef.current.push(new Float32Array(input));
      return;
    }
    const ratio = inRate / outRate;
    const outLen = Math.floor(input.length / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const pos = i * ratio;
      const i0 = Math.floor(pos);
      const i1 = Math.min(i0 + 1, input.length - 1);
      const frac = pos - i0;
      out[i] = input[i0] * (1 - frac) + input[i1] * frac;
    }
    chunksRef.current.push(out);
  }, []);

  const stop = useCallback(() => {
    if (!listening) return;
    setListening(false);
    clearTimer();

    // Gather all chunks into one PCM buffer.
    const chunks = chunksRef.current;
    let total = 0;
    for (const c of chunks) total += c.length;
    const pcm = new Float32Array(total);
    let offset = 0;
    for (const c of chunks) {
      pcm.set(c, offset);
      offset += c.length;
    }
    chunksRef.current = [];

    teardown();

    if (pcm.length < 1600) return; // under 0.1s - ignore

    setProcessing(true);

    // Encode 16-bit PCM WAV.
    const numSamples = pcm.length;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    const writeStr = (off: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint32(28, 16000 * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, numSamples * 2, true);
    for (let i = 0; i < numSamples; i++) {
      const s = Math.max(-1, Math.min(1, pcm[i]));
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    const wavBytes = new Uint8Array(buffer);
    const binary = Array.from(wavBytes, (b) => String.fromCharCode(b)).join("");
    const base64 = btoa(binary);

    (async () => {
      try {
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: base64, language: lang, sampleRate: 16000 }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError("generic");
        } else if (data.text && data.text.trim()) {
          onFinalRef.current?.(data.text.trim());
        }
      } catch {
        setError("generic");
      } finally {
        setProcessing(false);
      }
    })();
  }, [listening, clearTimer, teardown, lang]);

  const start = useCallback(async () => {
    if (listening || processing) return;
    setError(null);
    setDuration(0);
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
    } catch {
      setError("permission");
      return;
    }

    let ctx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let proc: ScriptProcessorNode | null = null;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      sampleRateRef.current = ctx.sampleRate;
      source = ctx.createMediaStreamSource(stream);
      proc = ctx.createScriptProcessor(4096, 1, 1);
      proc.onaudioprocess = (e) => {
        collectChunk(new Float32Array(e.inputBuffer.getChannelData(0)));
      };

      source.connect(proc);
      // Route through a zero-gain node so recording never plays out of the
      // speakers (prevents echo/feedback) while still firing onaudioprocess.
      const zeroGain = ctx.createGain();
      zeroGain.gain.value = 0;
      proc.connect(zeroGain);
      zeroGain.connect(ctx.destination);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      try {
        ctx?.close();
      } catch {
        /* noop */
      }
      setError("generic");
      return;
    }

    streamRef.current = stream;
    ctxRef.current = ctx;
    sourceRef.current = source;
    procRef.current = proc;

    setListening(true);
    timerRef.current = window.setInterval(() => setDuration((d) => d + 1), 1000);
  }, [listening, processing, collectChunk]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      teardown();
    };
  }, [teardown]);

  // Auto-clear errors after a few seconds.
  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => setError(null), 4000);
    return () => window.clearTimeout(id);
  }, [error]);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return { supported, listening, processing, duration, error, start, stop, formatDuration };
}
