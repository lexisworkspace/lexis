"use client";

export type VoiceGender = "male" | "female";

export interface VoicePersona {
  id: string;
  name: string;
  gender: VoiceGender;
  tagline: string;
  /** Subtle tempo only used for the offline device fallback (kept gentle). */
  rate: number;
  /** Preferred voice-name hints for the offline device fallback. */
  hints: string[];
  /** NVIDIA Magpie neural voice per language - the premium engine. */
  magpie: Record<string, string>;
}

/**
 * Noor's six voices. Primary engine: Microsoft Edge neural voices (the same
 * class of human-sounding voices used by modern AI assistants) generated on
 * the server. Offline fallback: the device's best natural voice. No pitch
 * distortion ever - distorted voices are what make TTS sound robotic.
 */
export const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: "kael", name: "Kael", gender: "male", tagline: "Warm and grounded", rate: 1.0,
    hints: ["david", "mark", "guy", "male", "daniel", "fred", "aaron", "google"],
    magpie: { en: "Magpie-Multilingual.EN-US.Jason", es: "Magpie-Multilingual.ES-US.Diego", fr: "Magpie-Multilingual.FR-FR.Pascal", de: "Magpie-Multilingual.DE-DE.Diego", pt: "Magpie-Multilingual.PT-BR.Diego", ar: "Magpie-Multilingual.AR-AR.Jason" },
  },
  {
    id: "orin", name: "Orin", gender: "male", tagline: "Deep and calm", rate: 0.98,
    hints: ["male", "george", "oliver", "james", "alex", "aaron", "kevin"],
    magpie: { en: "Magpie-Multilingual.EN-US.Leo", es: "Magpie-Multilingual.ES-US.Diego", fr: "Magpie-Multilingual.FR-FR.Pascal", de: "Magpie-Multilingual.DE-DE.Leo", pt: "Magpie-Multilingual.PT-BR.Diego", ar: "Magpie-Multilingual.AR-AR.Ray" },
  },
  {
    id: "rhys", name: "Rhys", gender: "male", tagline: "Bright and crisp", rate: 1.02,
    hints: ["male", "eric", "rishi", "jordan", "lee", "google", "mike"],
    magpie: { en: "Magpie-Multilingual.EN-US.Ray", es: "Magpie-Multilingual.ES-US.Diego", fr: "Magpie-Multilingual.FR-FR.Pascal", de: "Magpie-Multilingual.DE-DE.Ray", pt: "Magpie-Multilingual.PT-BR.Diego", ar: "Magpie-Multilingual.AR-AR.Ray" },
  },
  {
    id: "luna", name: "Luna", gender: "female", tagline: "Soft and gentle", rate: 0.99,
    hints: ["female", "zira", "samantha", "susan", "moira", "tessa", "zoe", "google"],
    magpie: { en: "Magpie-Multilingual.EN-US.Mia", es: "Magpie-Multilingual.ES-US.Isabela", fr: "Magpie-Multilingual.FR-FR.Louise", de: "Magpie-Multilingual.DE-DE.Mia", pt: "Magpie-Multilingual.PT-BR.Louise", ar: "Magpie-Multilingual.AR-AR.Sofia" },
  },
  {
    id: "ayla", name: "Ayla", gender: "female", tagline: "Warm and natural", rate: 1.0,
    hints: ["female", "aria", "jenny", "natasha", "emma", "zoe", "siri"],
    magpie: { en: "Magpie-Multilingual.EN-US.Aria", es: "Magpie-Multilingual.ES-US.Isabela", fr: "Magpie-Multilingual.FR-FR.Louise", de: "Magpie-Multilingual.DE-DE.Mia", pt: "Magpie-Multilingual.PT-BR.Isabela", ar: "Magpie-Multilingual.AR-AR.Sofia" },
  },
  {
    id: "iris", name: "Iris", gender: "female", tagline: "Lively and clear", rate: 1.03,
    hints: ["female", "allison", "ava", "olivia", "serena", "victoria", "karen", "amy"],
    magpie: { en: "Magpie-Multilingual.EN-US.Sofia", es: "Magpie-Multilingual.ES-US.Isabela", fr: "Magpie-Multilingual.FR-FR.Louise", de: "Magpie-Multilingual.DE-DE.Mia", pt: "Magpie-Multilingual.PT-BR.Louise", ar: "Magpie-Multilingual.AR-AR.Sofia" },
  },
];

export function getVoicePersona(id?: string | null): VoicePersona {
  return VOICE_PERSONAS.find((p) => p.id === id) || VOICE_PERSONAS[0]!;
}

const FEMALE_RE = /female|zira|samantha|zoe|aria|jenny|susan|karen|moira|tessa|fiona|veena|siri|allison|ava|emma|olivia|joanna|kendra|kimberly|lexi|salli|victoria|serena|milena|mei|siu|tina|amy|ruby|evelyn|heera|neerja|swara/i;
const MALE_RE = /male|david|mark|guy|daniel|george|oliver|james|alex|fred|arthur|rishi|jordan|eric|lee|thomas|william|ryan|tomás|paul|aaron|kevin|mike|matthew|brian|prabhat|tom|frank|reed|roger|richard/i;
const NEURAL_RE = /natural|neural|premium|enhanced|online|quality|wavenet|neural2|multilingual|real|standard|google/i;
const LEGACY_RE = /desktop|legacy|sapi|basic|mobile/i;

let cachedVoices: SpeechSynthesisVoice[] | null = null;

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  if (cachedVoices && cachedVoices.length) return cachedVoices;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) {
    cachedVoices = voices;
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
    };
  }
  return voices;
}

function langCode(lang?: string): string {
  return (lang || "en").split("-")[0].toLowerCase();
}

/**
 * Pick the best *natural* device voice for a persona + language.
 * Natural/neural voices win outright; legacy desktop voices are only used
 * when nothing better exists. No pitch shifting anywhere.
 */
export function pickVoice(persona: VoicePersona, lang?: string): SpeechSynthesisVoice | null {
  const voices = loadVoices();
  if (!voices.length) return null;
  const want = langCode(lang);
  const inLang = voices.filter((v) => langCode(v.lang) === want);
  const pool = inLang.length ? inLang : voices.filter((v) => langCode(v.lang) === "en");
  const source = pool.length ? pool : voices;

  const genderOk = (name: string) =>
    persona.gender === "male" ? MALE_RE.test(name) : FEMALE_RE.test(name);
  const genderBad = (name: string) =>
    persona.gender === "male" ? FEMALE_RE.test(name) : MALE_RE.test(name);

  const neural = source.filter((v) => NEURAL_RE.test(v.name));
  const candidates = neural.length ? neural : source;

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const v of candidates) {
    const name = v.name.toLowerCase();
    let score = 0;
    if (NEURAL_RE.test(name)) score += 40;
    if (LEGACY_RE.test(name)) score -= 30;
    if (genderOk(name)) score += 35;
    if (genderBad(name)) score -= 25;
    for (const h of persona.hints) {
      if (name.includes(h)) {
        score += 25;
        break;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
}

/**
 * Strip markdown so the voice reads clean, natural prose - never
 * "asterisk asterisk bold asterisk asterisk" or "hash heading".
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\|/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const PREVIEWS: Record<string, (name: string) => string> = {
  en: (n) => `Hey, I'm ${n}. I'll be your voice in Noor. How can I help you today?`,
  es: (n) => `Hola, soy ${n}. Seré tu voz en Noor. ¿En qué puedo ayudarte hoy?`,
  fr: (n) => `Salut, je suis ${n}. Je serai ta voix dans Noor. Comment puis-je t'aider ?`,
  de: (n) => `Hallo, ich bin ${n}. Ich bin deine Stimme in Noor. Wie kann ich dir helfen?`,
  pt: (n) => `Olá, eu sou ${n}. Serei a sua voz no Noor. Como posso ajudar?`,
  ar: (n) => `مرحبًا، أنا ${n}. سأكون صوتك في نور. كيف يمكنني مساعدتك؟`,
};

const BCP47: Record<string, string> = { en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE", pt: "pt-PT", ar: "ar-SA" };

function bcp47(lang?: string): string {
  return BCP47[langCode(lang)] || "en-US";
}

// Split into ~1700-char sentence chunks (safe for both engines - the server
// route accepts up to 2000 chars per request, so fewer, larger chunks means
// a long reply needs far fewer TTS calls and can never blow the per-minute
// budget mid-reply).
function chunkText(text: string): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?]*\s*/g) || [text];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > 1700 && cur) {
      chunks.push(cur.trim());
      cur = s;
    } else {
      cur += s;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.length ? chunks : [text];
}

// ============================================================
// Engine state
// ============================================================
let chainActive = false;
let onEndCb: (() => void) | null = null;
let currentAudio: HTMLAudioElement | null = null;
let audioUrls: string[] = [];
let deviceChain: SpeechSynthesisUtterance[] = [];
let serverOk: boolean | null = null; // null = untested, true = works
let serverOkUntil = 0;
let serverFails = 0; // consecutive server-TTS failures (drives backoff)
let speakEpoch = 0; // bumped on every stop - invalidates in-flight TTS fetches
let watchdog: ReturnType<typeof setTimeout> | null = null;
let speechUnlocked = false;
// ONE shared <audio> element for ALL neural playback. Mobile browsers only
// unlock audio elements created inside a user gesture (the orb tap); a fresh
// `new Audio()` per sentence gets its play() promise rejected once transient
// activation expires (~5s) - exactly why replies flipped to the robotic
// device voice after the first few sentences. Reusing the element that
// warmUpSpeech() unlocked keeps the premium voice for the whole reply.
let ttsAudio: HTMLAudioElement | null = null;

function getTtsAudio(): HTMLAudioElement {
  if (!ttsAudio) {
    ttsAudio = new Audio();
    ttsAudio.preload = "auto";
  }
  return ttsAudio;
}

// True on touch devices where the neural <audio> blobs can't be played
// (autoplay policy). Decided once.
let isTouchDevice = false;
if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) {
  isTouchDevice = true;
}

/** iPad/iPhone/iPod - iOS Safari silently swallows speech without workarounds. */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iP(hone|od)/i.test(ua) ||
    (/iPad/i.test(ua)) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Start a new reply turn (new question, voice preview, ...). The premium
 * neural voice is tried fresh on every segment anyway (no sticky engine
 * lock), so this only clears the failure backoff so a new reply never starts
 * in the device voice because of an old outage.
 */
export function beginVoiceTurn() {
  serverOk = null;
  serverFails = 0;
}

/**
 * Call from a user gesture (orb tap / mic press). On iOS the speech engine
 * refuses the first real speak() unless it has already been touched by a
 * gesture, and Chrome/Android load their voice list lazily - this forces
 * both to happen so the first reply can speak instantly.
 */
export function warmUpSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.getVoices();
  } catch {
    /* noop */
  }
  if (speechUnlocked) return;
  speechUnlocked = true;
  if (isIOS()) {
    try {
      // Silent utterance inside the user gesture - unlocks the iOS engine.
      const u = new SpeechSynthesisUtterance("");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch {
      /* noop */
    }
  }
  // Mobile autoplay unlock. The premium neural voice plays as <audio> blobs;
  // phones only allow media playback after a user gesture has touched the
  // audio pipeline. The reply arrives seconds later (long after the tap), so
  // without this unlock audio.play() is rejected, the neural voice silently
  // fails, and Noor falls back to the robotic device voice every single time.
  // Playing a moment of silence inside the tap unlocks playback for the
  // whole session.
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AC) {
      const ctx = new AC();
      void ctx.resume?.();
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
      window.setTimeout(() => {
        try {
          void ctx.close();
        } catch {
          /* noop */
        }
      }, 500);
    }
  } catch {
    /* noop */
  }

  // The <audio> element path has its own autoplay gate (Chrome/Android uses
  // transient activation, which expires a few seconds after the tap - right
  // around when a reply would finish streaming). Prime it with a silent play
  // too so the neural blobs are not rejected for a different reason.
  try {
    const wav = new Uint8Array(44);
    const dv = new DataView(wav.buffer);
    dv.setUint32(0, 0x52494646, false); // RIFF
    dv.setUint32(4, 36, false);
    dv.setUint32(8, 0x57415645, false); // WAVE
    dv.setUint32(12, 0x666d7420, false); // fmt 
    dv.setUint32(16, 16, false);
    dv.setUint16(20, 1, false); // PCM
    dv.setUint16(22, 1, false); // mono
    dv.setUint32(24, 8000, false);
    dv.setUint32(28, 8000, false);
    dv.setUint16(32, 1, false);
    dv.setUint16(34, 8, false);
    dv.setUint32(36, 0x64617461, false); // data
    dv.setUint32(40, 0, false);
    const url = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
    // Reuse THE shared element so the tap unlocks the very element that will
    // play every reply. It is a silent WAV, so volume 1 is inaudible but
    // genuinely unlocks sound playback (a muted play would not).
    const a = getTtsAudio();
    a.muted = false;
    a.volume = 1;
    a.src = url;
    void a.play().catch(() => {
      /* noop */
    });
    window.setTimeout(() => {
      try {
        // Only tear down if the element still points at the silent prime -
        // a real reply may have taken it over within the 800ms window.
        if (a.src.endsWith(url)) a.pause();
      } catch {
        /* noop */
      }
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* noop */
      }
    }, 800);
  } catch {
    /* noop */
  }
}

function serverAvailable(): boolean {
  if (serverOk === true) return true;
  if (serverOk === false && Date.now() < serverOkUntil) return false;
  return true;
}

/**
 * A server TTS request failed. Cooldown is short after a first blip so the
 * very next segment retries the premium voice; it only backs off further
 * after repeated consecutive failures (server genuinely down). A single
 * hiccup must never lock the whole reply into the device (robotic) voice.
 */
function markServerFail() {
  serverFails++;
  const backoff = serverFails >= 4 ? 12000 : serverFails >= 2 ? 4000 : 1000;
  serverOk = false;
  serverOkUntil = Date.now() + backoff;
}

function markServerOk() {
  serverOk = true;
  serverFails = 0;
}

// No client-side TTS budget: the NVIDIA key is free and unlimited, so we
// never self-throttle. Each segment simply requests its audio; the only
// pacing is the 429 retry in fetchTts (defense in depth, practically never
// hit). The old 13/min self-pacing was what silently tripped after ~6
// sentences and kicked long replies onto the robotic device voice.


async function fetchTts(text: string, persona: VoicePersona, lang?: string): Promise<Blob | null> {
  // Failure classes:
  // - 429 (rate limit): not a hard failure - wait and retry (the key is
  //   free+unlimited so this is nearly impossible, kept as defense).
  // - Network / 5xx / empty body: the server (or network) is genuinely down.
  //   Retried a few times, then this segment falls back to the device voice.
  //
  // The deadline is 20s: comfortably above the server's 22s gRPC deadline so
  // a big chunk always completes. An occasional pause is far better than the
  // robotic device voice - and the NEXT segment always tries the server again.
  // Outer budget must exceed the server's 22s gRPC deadline: 20s was < 22s,
  // so legit 20-22s chunks aborted and kicked Noor to the device voice.
  const deadline = Date.now() + 28000;
  let hardFails = 0;
  while (Date.now() < deadline) {
    try {
      const ctrl = new AbortController();
      // Timeout scales with text length: short sentences abort quickly, long
      // chunks (non-streaming replies/previews) get more room.
      const timer = setTimeout(
        () => ctrl.abort(),
        // Above the server's 22s gRPC deadline so a big chunk always
        // completes. The old text.length*12 aborted a 1200-char batch at
        // 14.4s, marking the server failed and kicking Noor to the robot.
        Math.min(30000, Math.max(15000, text.length * 20))
      );
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voice: persona.magpie[langCode(lang)] || persona.magpie.en,
          }),
          signal: ctrl.signal,
        });
        if (res.status === 429) {
          // Rate-limited server-side (shouldn't happen on the free unlimited
          // key). Wait briefly, retry a couple of times, then fall back to
          // the device voice - never stall the whole 20s deadline.
          if (++hardFails >= 3) return null;
          await new Promise((r) => window.setTimeout(r, 1500));
          continue;
        }
        if (!res.ok) {
          if (++hardFails >= 2) return null;
          continue;
        }
        const blob = await res.blob();
        if (blob.size > 200) return blob;
        // Empty body - same as a failed request, not a silent infinite loop.
        if (++hardFails >= 2) return null;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      if (++hardFails >= 2) return null;
    }
  }
  return null;
}

function clearWatchdog() {
  if (watchdog !== null) {
    clearTimeout(watchdog);
    watchdog = null;
  }
}

function finish() {
  chainActive = false;
  clearWatchdog();
  const cb = onEndCb;
  onEndCb = null;
  cb?.();
}

function playAudioQueue(blobs: Blob[], onFail: () => void) {
  let i = 0;
  let playedAny = false;
  const audio = getTtsAudio(); // unlocked once inside the tap gesture
  const failAll = () => {
    chainActive = false;
    audioUrls.forEach((u) => URL.revokeObjectURL(u));
    audioUrls = [];
    onFail();
  };
  const next = () => {
    if (!chainActive) return;
    if (i >= blobs.length) {
      audioUrls.forEach((u) => URL.revokeObjectURL(u));
      audioUrls = [];
      finish();
      return;
    }
    const url = URL.createObjectURL(blobs[i++]!);
    audioUrls.push(url);
    currentAudio = audio;
    audio.onended = () => {
      currentAudio = null;
      next();
    };
    audio.onerror = () => {
      currentAudio = null;
      if (!playedAny) {
        failAll();
        return;
      }
      next();
    };
    audio.src = url;
    const tryPlay = (attempt: number) => {
      void audio
        .play()
        .then(() => {
          playedAny = true;
        })
        .catch(() => {
          currentAudio = null;
          if (attempt < 2) {
            tryPlay(attempt + 1);
          } else if (!playedAny) {
            failAll();
          } else {
            next();
          }
        });
    };
    tryPlay(0);
  };
  next();
}

// Chrome/Android (and iOS) load their voice list lazily. If we speak before
// it arrives we get the platform default - the robotic voice. Wait briefly
// for the real voices so the fallback sounds like a person, not a robot.
function waitForVoices(maxMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }
    const have = () => window.speechSynthesis.getVoices().length > 0;
    if (have()) {
      resolve();
      return;
    }
    const done = () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", done);
      resolve();
    };
    window.speechSynthesis.addEventListener?.("voiceschanged", done);
    window.setTimeout(() => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", done);
      resolve();
    }, maxMs);
  });
}

function speakDevice(chunks: string[], persona: VoicePersona, lang?: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("[Lexis voice] speechSynthesis is not available in this browser - Noor cannot speak.");
    finish();
    return;
  }
  chainActive = true;
  void (async () => {
    // Chrome/Android + iOS load voices lazily - wait so the fallback picks a
    // real voice instead of the platform default (the robotic one).
    await waitForVoices(1200);
    if (!chainActive) return; // interrupted while waiting
    const voice = pickVoice(persona, lang);
    deviceChain = chunks.map((chunk) => {
      const u = new SpeechSynthesisUtterance(chunk);
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : bcp47(lang);
      u.pitch = 1; // never distort
      u.rate = persona.rate;
      u.volume = 1;
      return u;
    });
    if (!deviceChain.length) return;
    let i = 0;
    const next = () => {
      if (!chainActive) return;
      if (i >= deviceChain.length) {
        deviceChain = [];
        finish();
        return;
      }
      const u = deviceChain[i++]!;
      let started = false;
      let done = false;
      let retried = false;
      let retryTimer: number | null = null;
      const advance = () => {
        if (done) return;
        done = true;
        if (retryTimer !== null) window.clearTimeout(retryTimer);
        next();
      };
      const speakIt = (utterance: SpeechSynthesisUtterance) => {
        utterance.onstart = () => {
          started = true;
        };
        utterance.onend = advance;
        utterance.onerror = advance;
        try {
          window.speechSynthesis.speak(utterance);
          if (isIOS()) {
            // The infamous iOS kick: pause + resume forces the engine to
            // actually start an utterance it would otherwise swallow.
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        } catch {
          // Some browsers throw if speak() is called while a session is still
          // active - advance the chain instead of stalling it.
          advance();
        }
      };
      speakIt(u);
      // Safety net: if the engine silently drops the utterance (iOS first
      // speak after a cancel()), re-speak it ONCE before advancing. The
      // cancel() first clears any copy the engine queued but never started,
      // so the same sentence can never play twice (or three times) - that
      // overlap is exactly what happened when the device fallback took over
      // mid-reply on mobile.
      retryTimer = window.setTimeout(() => {
        if (started || done || retried) return;
        retried = true;
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* noop */
        }
        const retry = new SpeechSynthesisUtterance(u.text);
        if (voice) retry.voice = voice;
        retry.lang = u.lang;
        retry.pitch = 1;
        retry.rate = persona.rate;
        retry.volume = 1;
        speakIt(retry);
      }, 1200);
    };
    if (voice) {
      next();
    } else {
      const t = window.setTimeout(() => {
        window.clearTimeout(t);
        next();
      }, 150);
    }
  })();
}

/**
 * Speak with Noor's voice. Neural engine first (server-generated Edge voice),
 * falling back to the device's best natural voice if the network fails.
 */
export function speak(text: string, persona: VoicePersona, lang?: string, onEnd?: () => void) {
  onEndCb = null; // don't fire the previous utterance's end callback when replacing it
  stopSpeaking();
  onEndCb = onEnd || null;

  const clean = stripMarkdown(text);
  if (!clean) {
    finish();
    return;
  }
  const chunks = chunkText(clean);

  // Hard safety: whatever happens (silent speechSynthesis stall, dropped
  // events), end the utterance and release the UI within a sane bound.
  const estMs = Math.min(180000, Math.max(30000, clean.length * 90));
  clearWatchdog();
  watchdog = setTimeout(() => stopSpeaking(), estMs);

  // Epoch guard: if stopSpeaking() runs while the TTS fetch below is in
  // flight (interrupt / close / replace), the fetched audio must NOT start
  // playing afterwards.
  const epoch = speakEpoch;

  void (async () => {
    if (typeof window === "undefined" || epoch !== speakEpoch) return;

    // No turn-engine lock: every segment independently prefers the premium
    // neural voice. If THIS segment's server fetch fails after retries, it
    // falls back to the device voice for itself only - the next segment tries
    // the server again. One hiccup can never doom the rest of a reply to the
    // robotic voice (that lock was the "talks great, then turns into a robot"
    // bug).
    if (serverAvailable()) {
      const blobs: Blob[] = [];
      for (const chunk of chunks) {
        const b = await fetchTts(chunk, persona, lang);
        if (!b) {
          blobs.length = 0;
          break;
        }
        blobs.push(b);
      }
      if (epoch !== speakEpoch) return; // interrupted while fetching
      if (blobs.length === chunks.length) {
        markServerOk();
        chainActive = true;
        playAudioQueue(blobs, () => {
          // Server audio could not play at all (autoplay policy edge case).
          // Answer THIS batch with the device voice, but do NOT mark the
          // server down - that poison made the rest of a reply robotic.
          // The next segment tries the premium server again.
          if (epoch === speakEpoch) speakDevice(chunks, persona, lang);
        });
        return;
      }
      markServerFail();
    }
    if (epoch !== speakEpoch) return;
    speakDevice(chunks, persona, lang);
  })();
}

export function stopSpeaking() {
  speakEpoch++; // any in-flight speak() fetch must not start playing after this
  chainActive = false;
  clearWatchdog();
  deviceChain = [];
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* noop */
  }
  try {
    currentAudio?.pause();
  } catch {
    /* noop */
  }
  currentAudio = null;
  audioUrls.forEach((u) => URL.revokeObjectURL(u));
  audioUrls = [];
  const cb = onEndCb;
  onEndCb = null;
  cb?.();
}

export function speakPreview(persona: VoicePersona, lang?: string, onEnd?: () => void) {
  beginVoiceTurn(); // a preview is its own turn - never inherits a stale fallback
  const key = langCode(lang);
  const line = (PREVIEWS[key] || PREVIEWS.en)(persona.name);
  speak(line, persona, lang, onEnd);
}

/** Smooth, soft "bloop + shimmer" so tapping the orb never feels harsh. */
export function playOrbSound() {
  try {
    if (typeof window === "undefined") return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const t = ctx.currentTime;

    const pop = ctx.createOscillator();
    const g = ctx.createGain();
    pop.type = "sine";
    pop.frequency.setValueAtTime(440, t);
    pop.frequency.exponentialRampToValueAtTime(720, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    pop.connect(g);
    g.connect(ctx.destination);
    pop.start(t);
    pop.stop(t + 0.26);

    const shimmer = ctx.createOscillator();
    const g2 = ctx.createGain();
    shimmer.type = "sine";
    shimmer.frequency.setValueAtTime(1180, t + 0.06);
    shimmer.frequency.exponentialRampToValueAtTime(1580, t + 0.24);
    g2.gain.setValueAtTime(0.0001, t + 0.06);
    g2.gain.exponentialRampToValueAtTime(0.05, t + 0.13);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    shimmer.connect(g2);
    g2.connect(ctx.destination);
    shimmer.start(t + 0.06);
    shimmer.stop(t + 0.34);

    window.setTimeout(() => {
      try {
        void ctx.close();
      } catch {
        /* noop */
      }
    }, 900);
  } catch {
    /* noop */
  }
}
