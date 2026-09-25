// ============================================================
// Orleia Brain - engine
// Owns the cached GraphIndex, the query API, and the AI layer
// (concept extraction cache + Noor briefing), all client-side.
// ============================================================

import type { AppData } from "@/types";
import type { Edge } from "./types";
import type { GraphIndex } from "./types";
import { buildGraph, AiConceptMap } from "./index";
import { storage } from "@/lib/storage";
import { buildSituationModel, situationForAI } from "./situation";

const AI_CACHE_KEY = "orleia-brain-ai-v1";
const REBUILD_DEBOUNCE = 600;
const MAX_ENRICH_PER_RUN = 6;
const MIN_TEXT_LEN = 40;

interface AiCacheEntry {
  hash: string;
  concepts: string[];
}
type AiCache = Record<string, AiCacheEntry>;

let graph: GraphIndex | null = null;
let aiConcepts: AiConceptMap = new Map();
let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
let wired = false;

function loadAiCache(): AiCache {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(AI_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AiCache) : {};
  } catch {
    return {};
  }
}
function saveAiCache(cache: AiCache) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota - ignore */
  }
}

function hashText(t: string): string {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Rebuild the graph from the current data (debounced when called internally). */
export function rebuildGraph(immediate = false): GraphIndex {
  const build = () => {
    graph = buildGraph(storage.getData(), aiConcepts);
    return graph;
  };
  if (immediate) return build();
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(build, REBUILD_DEBOUNCE);
  return getGraph();
}

export function getGraph(): GraphIndex {
  if (!graph) graph = buildGraph(storage.getData(), aiConcepts);
  return graph;
}

/** Subscribe to storage changes once (client only). */
export function ensureWired() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  storage.subscribe(() => rebuildGraph());
}

// ---- query API ----

export function relatedTo(key: string, opts: { types?: string[]; minWeight?: number; limit?: number } = {}) {
  const g = getGraph();
  const all: Edge[] = [...(g.edgesBySource.get(key) || []), ...(g.edgesByTarget.get(key) || [])];
  const out = all
    .filter((e) => {
      if (opts.types && !opts.types.includes(e.source.split(":")[0]) && !opts.types.includes(e.target.split(":")[0])) return false;
      if (opts.minWeight && e.weight < opts.minWeight) return false;
      return true;
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, opts.limit || 8);
  return out.map((e) => ({
    edge: e,
    other: e.target === key ? e.source : e.target,
  }));
}

export function backlinks(key: string) {
  return getGraph().edgesByTarget.get(key) || [];
}

export function neighbors2(key: string, limit = 12): string[] {
  const g = getGraph();
  const seen = new Set<string>([key]);
  const out: string[] = [];
  for (const e of g.edgesBySource.get(key) || []) {
    if (!seen.has(e.target)) {
      seen.add(e.target);
      out.push(e.target);
    }
  }
  for (const e of g.edgesByTarget.get(key) || []) {
    if (!seen.has(e.source)) {
      seen.add(e.source);
      out.push(e.source);
    }
  }
  const frontier = [...out];
  for (const f of frontier) {
    if (out.length >= limit) break;
    for (const e of g.edgesBySource.get(f) || []) {
      if (!seen.has(e.target)) {
        seen.add(e.target);
        out.push(e.target);
      }
    }
    for (const e of g.edgesByTarget.get(f) || []) {
      if (!seen.has(e.source)) {
        seen.add(e.source);
        out.push(e.source);
      }
    }
  }
  return out.slice(0, limit);
}

export function searchNodes(query: string, limit = 8) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const g = getGraph();
  return [...g.entities.values()]
    .filter((e) => e.title.toLowerCase().includes(q))
    .sort((a, b) => a.title.length - b.title.length)
    .slice(0, limit)
    .map((e) => e.key);
}

// ---- AI layer (unlimited NVIDIA key) ----

interface EnrichTarget {
  key: string;
  title: string;
  text: string;
}

function collectEnrichTargets(): EnrichTarget[] {
  const data = storage.getData();
  const cache = loadAiCache();
  const targets: EnrichTarget[] = [];
  const push = (key: string, title: string, text: string) => {
    if (text.length < MIN_TEXT_LEN) return;
    const hash = hashText(text);
    const hit = cache[key];
    if (hit && hit.hash === hash) return;
    targets.push({ key, title, text });
  };
  // most recent notes, journal, tasks with content
  const notes = [...data.notes]
    .filter((n) => !n.archived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);
  for (const n of notes) push(`note:${n.id}`, n.title, `${n.title}\n${n.content || ""}`);
  const journal = [...data.journalEntries]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 2);
  for (const j of journal) push(`journal:${j.id}`, j.title || j.date, `${j.title}\n${j.content || ""}`);
  const tasks = data.tasks.filter((t) => t.status !== "done" && (t.description || "").length > 0).slice(0, 1);
  for (const t of tasks) push(`task:${t.id}`, t.title, `${t.title}\n${t.description || ""}`);
  return targets.slice(0, MAX_ENRICH_PER_RUN);
}

/** Extract AI concepts for changed entities; stores them in the cache. */
export async function enrichConcepts(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const targets = collectEnrichTargets();
  if (targets.length === 0) return 0;
  try {
    const res = await fetch("/api/brain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "entities", items: targets }),
    });
    if (!res.ok) return 0;
    const json = (await res.json()) as { results?: { key: string; concepts: string[] }[] };
    const cache = loadAiCache();
    let added = 0;
    for (const r of json.results || []) {
      if (!r || !r.key || !Array.isArray(r.concepts)) continue;
      const t = targets.find((x) => x.key === r.key);
      if (!t) continue;
      cache[r.key] = { hash: hashText(t.text), concepts: r.concepts.slice(0, 8) };
      aiConcepts.set(r.key, r.concepts.slice(0, 8));
      added++;
    }
    saveAiCache(cache);
    rebuildGraph(true);
    return added;
  } catch {
    return 0;
  }
}

export interface Briefing {
  briefing: string;
  chips: { label: string; href: string }[];
}

/** Generate Noor's daily read from the situation model via Ethos. */
export async function getAiBriefing(situationText: string): Promise<Briefing | null> {
  if (typeof window === "undefined" || !situationText) return null;
  try {
    const res = await fetch("/api/brain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "briefing", situationText: situationText.slice(0, 4000) }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { briefing?: string; chips?: { label: string; href: string }[] };
    if (!json.briefing) return null;
    return {
      briefing: json.briefing,
      chips: Array.isArray(json.chips) ? json.chips.slice(0, 3) : [],
    };
  } catch {
    return null;
  }
}

/** Compact situation text for Noor's prompt - empty when there's no data yet. */
export function getSituationPayload(): string {
  try {
    return situationForAI(buildSituationModel(storage.getData(), getGraph()));
  } catch {
    return "";
  }
}

export function loadCachedConcepts(): AiConceptMap {
  const cache = loadAiCache();
  const m: AiConceptMap = new Map();
  for (const [k, v] of Object.entries(cache)) {
    if (v && Array.isArray(v.concepts) && v.concepts.length) m.set(k, v.concepts);
  }
  return m;
}
