// ============================================================
// Local AI — run Noor on models that live on the user's own PC
// via Ollama (https://ollama.com). Nothing leaves the machine:
// no NVIDIA API, no daily cap, works offline.
//
// Browser -> Ollama: Ollama's API listens on http://localhost:11434.
// It allows localhost origins by default; for the hosted app the user
// sets OLLAMA_ORIGINS=https://app.orleia.app once (ollama.com/docs
// FAQ). The picker surfaces exact setup instructions when unreachable.
//
// Mobile/tablet: browsers block secure pages from calling plain-http
// LAN addresses (mixed content + Private Network Access), so Local AI
// is desktop-only; the picker shows that state instead of failing.
// ============================================================

export interface LocalModelDef {
  id: string; // stable id, e.g. "local-gemma3"
  ollamaTag: string; // `ollama pull` tag
  name: string;
  family: string;
  /** Official maker logo (svgl.app CDN, CSP-allowed). */
  logo: string;
  /** Optional theme-specific logo (used when the main logo is
      monochrome: dark theme needs the light glyph and vice versa). */
  logoDark?: string;
  /** Approx download size (GB) for the default tag. */
  sizeGb: number;
  /** Parameter count label, e.g. "4B" or "3.8B". */
  params: string;
  /** Comfortable minimum VRAM (GPU) or RAM (CPU) in GB. */
  vramGb: number;
  description: string;
  /** True when the model streams <think> reasoning tokens. */
  thinking?: boolean;
  /** Suggested sampling knobs (Ollama options). */
  options: { temperature: number; num_predict: number };
}

export const LOCAL_MODELS: LocalModelDef[] = [
  {
    id: "local-gemma3",
    ollamaTag: "gemma3:4b",
    name: "Gemma 3",
    family: "Google",
    logo: "https://svgl.app/library/google.svg",
    sizeGb: 3.3,
    params: "4B",
    vramGb: 6,
    description: "Google's compact all-rounder. Great speed/quality balance.",
    options: { temperature: 0.7, num_predict: 2048 },
  },
  {
    id: "local-llama32",
    ollamaTag: "llama3.2:3b",
    name: "Llama 3.2",
    family: "Meta",
    logo: "https://svgl.app/library/meta.svg",
    sizeGb: 2.0,
    params: "3B",
    vramGb: 4,
    description: "Meta's lightest Llama. Fast on almost any machine.",
    options: { temperature: 0.7, num_predict: 2048 },
  },
  {
    id: "local-deepseek-r1",
    ollamaTag: "deepseek-r1:7b",
    name: "DeepSeek-R1",
    family: "DeepSeek",
    logo: "https://svgl.app/library/deepseek.svg",
    sizeGb: 4.7,
    params: "7B",
    vramGb: 8,
    description: "Reasoning model — thinks step by step before answering.",
    thinking: true,
    options: { temperature: 0.6, num_predict: 4096 },
  },
  {
    id: "local-qwen25",
    ollamaTag: "qwen2.5:7b",
    name: "Qwen 2.5",
    family: "Alibaba",
    logo: "https://svgl.app/library/qwen_light.svg",
    logoDark: "https://svgl.app/library/qwen_dark.svg",
    sizeGb: 4.7,
    params: "7B",
    vramGb: 8,
    description: "Strong at writing, math and following instructions.",
    options: { temperature: 0.7, num_predict: 2048 },
  },
  {
    id: "local-mistral",
    ollamaTag: "mistral:7b",
    name: "Mistral",
    family: "Mistral AI",
    logo: "https://svgl.app/library/mistral-ai_logo.svg",
    sizeGb: 4.1,
    params: "7B",
    vramGb: 8,
    description: "The classic open model. Efficient, dependable, unfussy.",
    options: { temperature: 0.7, num_predict: 2048 },
  },
  {
    id: "local-phi4",
    ollamaTag: "phi4-mini",
    name: "Phi-4 mini",
    family: "Microsoft",
    logo: "https://svgl.app/library/microsoft.svg",
    sizeGb: 2.5,
    params: "3.8B",
    vramGb: 4,
    description: "Microsoft's small but sharp reasoner. Punches above its size.",
    options: { temperature: 0.6, num_predict: 2048 },
  },
];

export function localModelById(id: string): LocalModelDef | undefined {
  return LOCAL_MODELS.find((m) => m.id === id);
}

export function isLocalModel(id: string): boolean {
  return id.startsWith("local-");
}

const OLLAMA_BASE = "http://localhost:11434";

export interface OllamaStatus {
  reachable: boolean;
  /** Model tags present on the machine (e.g. "gemma3:4b"). */
  installed: string[];
}

/** Probe the local Ollama install: reachable + which models are pulled. */
export async function probeOllama(): Promise<OllamaStatus> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return { reachable: false, installed: [] };
    const json = (await res.json()) as { models?: { name: string }[] };
    return {
      reachable: true,
      installed: (json.models || []).map((m) => m.name),
    };
  } catch {
    return { reachable: false, installed: [] };
  }
}

function hasModel(status: OllamaStatus, tag: string): boolean {
  // Installed names can carry a full digest suffix in some versions.
  const base = tag.split(":")[0];
  return status.installed.some((n) => n === tag || n.split(":")[0] === base);
}

export function isModelInstalled(status: OllamaStatus, def: LocalModelDef): boolean {
  return hasModel(status, def.ollamaTag);
}

/**
 * Stream a chat completion from local Ollama. Calls onDelta for each text
 * chunk and onThinking for reasoning tokens (DeepSeek-R1). Resolves with the
 * full visible reply, or null if the request failed.
 */
export async function streamOllama(
  def: LocalModelDef,
  system: string,
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  onDelta: (t: string) => void,
  onThinking?: (t: string) => void,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: def.ollamaTag,
        messages: [{ role: "system", content: system }, ...messages],
        stream: true,
        options: def.options,
      }),
      signal,
    });
    if (!res.ok || !res.body) return null;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let full = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        try {
          const json = JSON.parse(t) as {
            message?: { content?: string; thinking?: string };
            done?: boolean;
            error?: string;
          };
          if (json.error) return null;
          // Newer Ollama exposes reasoning as message.thinking.
          if (typeof json.message?.thinking === "string" && json.message.thinking) {
            onThinking?.(json.message.thinking);
          }
          if (typeof json.message?.content === "string" && json.message.content) {
            full += json.message.content;
            onDelta(json.message.content);
          }
          if (json.done) return full.trim() || null;
        } catch {
          /* skip malformed line */
        }
      }
    }
    return full.trim() || null;
  } catch {
    return null;
  }
}

/** One-line setup hint shown when Ollama isn't reachable. */
export function ollamaSetupHint(): string {
  return `Install Ollama (ollama.com), then run: OLLAMA_ORIGINS=https://app.orleia.app ollama serve`;
}
