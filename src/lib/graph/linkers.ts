// ============================================================
// Lexis Brain - local linkers
// All edge computation here is pure, local, and offline.
// Bounded so the graph rebuilds in milliseconds even on large
// workspaces (caps on mention + similarity work).
// ============================================================

import type { EntityRef, Edge, EdgeType } from "./types";

const STOPWORDS = new Set(
  "a an and are as at be but by for from has have i if in is it its of on or that the this to was were will with you your we our my me so not do does did can could would should about into over under just very really much more most some any all no yes day days today tomorrow".split(
    " "
  )
);

/** Normalize text for matching: lowercase, strip punctuation/non-letters. */
export function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Significant tokens of an entity's title (used for mention matching). */
export function titleTokens(entity: EntityRef): string[] {
  return [...new Set(tokenize(entity.title).filter((w) => w.length > 2))];
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

const weightFor: Record<EdgeType, number> = {
  explicit: 1.0,
  semantic: 0.9,
  mention: 0.75,
  similar: 0.7,
  temporal: 0.55,
  tag: 0.5,
  structural: 0.4,
};

const originFor: Record<EdgeType, Edge["origin"]> = {
  explicit: "explicit",
  semantic: "semantic",
  mention: "inferred",
  similar: "inferred",
  temporal: "inferred",
  tag: "inferred",
  structural: "inferred",
};

function makeEdge(source: string, target: string, type: EdgeType, reason: string, boost = 0): Edge {
  const weight = Math.min(1, weightFor[type] + boost);
  return { source, target, type, weight, origin: originFor[type], reason };
}

/** Work caps: keep the graph rebuild fast on large workspaces. */
const MAX_MENTION_PER_ENTITY = 12;
const TOKEN_FREQ_CAP = 0.3; // drop title tokens present in >30% of entities
const MAX_SIM_PER_ENTITY = 40; // similarity comparisons per entity

/**
 * Build all local edges for a set of entities.
 * Structured inputs extracted from AppData by index.ts.
 */
export interface LinkerInputs {
  entities: EntityRef[];
  /** entityKey -> tag keys it carries */
  tagsByEntity: Map<string, string[]>;
  /** tag key -> entities carrying it */
  entitiesByTag: Map<string, string[]>;
  /** entityKey -> bucket key (folder/list/category) */
  bucketByEntity: Map<string, string>;
  /** bucket key -> entities in it */
  entitiesByBucket: Map<string, string[]>;
  /** entityKey -> token set (for similarity) */
  tokensByEntity: Map<string, Set<string>>;
  /** entityKey -> full text (for mention scanning) */
  textByEntity: Map<string, string>;
  /** entityKey -> date key (YYYY-MM-DD) for temporal linking */
  dateByEntity: Map<string, string>;
  explicitLinks: [string, string][];
}

export function linkEntities(inputs: LinkerInputs): Edge[] {
  const { entities } = inputs;
  const byKey = new Map(entities.map((e) => [e.key, e]));
  const edges: Edge[] = [];
  const add = (e: Edge) => {
    if (!byKey.has(e.source) || !byKey.has(e.target) || e.source === e.target) return;
    edges.push(e);
  };

  // ---- explicit ----
  for (const [s, t] of inputs.explicitLinks) add(makeEdge(s, t, "explicit", "you linked these"));

  // ---- tag: content entities sharing ≥1 tag ----
  for (const [tagKey, members] of inputs.entitiesByTag) {
    const m = members.filter((k) => byKey.has(k));
    if (m.length < 2) continue;
    const tagName = byKey.get(tagKey)?.title || "shared tag";
    for (let i = 0; i < m.length; i++) {
      for (let j = i + 1; j < m.length; j++) {
        const shared = inputs.tagsByEntity.get(m[i])!.filter((t) =>
          inputs.tagsByEntity.get(m[j])!.includes(t)
        );
        const boost = Math.min(0.2, shared.length * 0.07);
        add(makeEdge(m[i], m[j], "tag", `both tagged "${tagName}"`, boost));
      }
    }
  }

  // ---- structural: same bucket ----
  for (const members of inputs.entitiesByBucket.values()) {
    const m = members.filter((k) => byKey.has(k));
    if (m.length < 2) continue;
    const bucketKey = inputs.bucketByEntity.get(m[0]);
    const bucketTitle = bucketKey ? byKey.get(bucketKey)?.title || "same collection" : "same collection";
    for (let i = 0; i < m.length; i++) {
      for (let j = i + 1; j < m.length; j++) {
        add(makeEdge(m[i], m[j], "structural", `both in "${bucketTitle}"`));
      }
    }
  }

  // ---- mention: significant title tokens of one entity appearing in another's text ----
  // IDF pruning: tokens that appear in too many titles are not distinctive.
  const mentionIndex = new Map<string, string[]>();
  for (const e of entities) {
    for (const tok of titleTokens(e)) {
      const list = mentionIndex.get(tok) || [];
      list.push(e.key);
      mentionIndex.set(tok, list);
    }
  }
  const tokenFreq = new Map<string, number>();
  for (const [tok, keys] of mentionIndex) tokenFreq.set(tok, keys.length);
  const freqCap = Math.max(4, Math.ceil(entities.length * TOKEN_FREQ_CAP));

  const tokenSetByKey = new Map(
    entities.map((e) => [e.key, new Set(titleTokens(e))] as [string, Set<string>])
  );
  for (const e of entities) {
    const toks = tokenSetByKey.get(e.key)!;
    const seen = new Set<string>();
    for (const tok of toks) {
      if ((tokenFreq.get(tok) || 0) > freqCap) continue;
      for (const other of mentionIndex.get(tok) || []) {
        if (other === e.key || seen.has(other)) continue;
        seen.add(other);
        const hay = (inputs.textByEntity.get(other) || "").toLowerCase();
        if (!hay.includes(tok)) continue;
        const otherTitle = byKey.get(other)?.title || "an item";
        add(makeEdge(e.key, other, "mention", `"${otherTitle}" is mentioned in this`));
        if (seen.size >= MAX_MENTION_PER_ENTITY) break;
      }
      if (seen.size >= MAX_MENTION_PER_ENTITY) break;
    }
  }

  // ---- similar: content Jaccard, bounded per entity ----
  const contentKinds = new Set(["note", "task", "journal", "habit"]);
  const contentKeys = entities.filter((e) => contentKinds.has(e.kind)).map((e) => e.key);
  for (let i = 0; i < contentKeys.length; i++) {
    const a = contentKeys[i];
    const ka = byKey.get(a)!.kind;
    let compared = 0;
    for (let j = i + 1; j < contentKeys.length && compared < MAX_SIM_PER_ENTITY; j++) {
      const b = contentKeys[j];
      const kb = byKey.get(b)!.kind;
      if (ka === kb && ka !== "note") continue; // same-kind similarity only for notes
      compared++;
      const sim = jaccard(inputs.tokensByEntity.get(a)!, inputs.tokensByEntity.get(b)!);
      if (sim < 0.28) continue;
      add(makeEdge(a, b, "similar", `similar content (${Math.round(sim * 100)}% overlap)`, sim * 0.25));
    }
  }

  // ---- temporal: same date, cross-kind only ----
  const byDate = new Map<string, string[]>();
  for (const e of entities) {
    const d = inputs.dateByEntity.get(e.key);
    if (!d) continue;
    const list = byDate.get(d) || [];
    list.push(e.key);
    byDate.set(d, list);
  }
  for (const members of byDate.values()) {
    if (members.length < 2) continue;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const ea = byKey.get(members[i]);
        const eb = byKey.get(members[j]);
        if (!ea || !eb || ea.kind === eb.kind) continue;
        add(makeEdge(members[i], members[j], "temporal", "both on the same day"));
      }
    }
  }

  return edges;
}
