// ============================================================
// Orleia Brain - graph builder
// Pure function: AppData (+ optional AI concept cache) -> GraphIndex.
// No storage/network imports - fully testable.
// ============================================================

import type { AppData } from "@/types";
import type { Edge, EntityKind, EntityRef, GraphIndex } from "./types";
import { entityKey } from "./types";
import { linkEntities, tokenize } from "./linkers";

/** Injected by engine.ts: entityKey -> AI-extracted concept strings. */
export type AiConceptMap = Map<string, string[]>;

export function buildGraph(data: AppData, aiConcepts: AiConceptMap = new Map()): GraphIndex {
  const entities: EntityRef[] = [];
  const tagsByEntity = new Map<string, string[]>();
  const entitiesByTag = new Map<string, string[]>();
  const bucketByEntity = new Map<string, string>();
  const entitiesByBucket = new Map<string, string[]>();
  const tokensByEntity = new Map<string, Set<string>>();
  const textByEntity = new Map<string, string>();
  const dateByEntity = new Map<string, string>();
  const explicitLinks: [string, string][] = (data.links || []).map((l) => [l.source, l.target]);

  const addEntity = (kind: EntityKind, id: string, title: string, updatedAt: string) => {
    const key = entityKey(kind, id);
    entities.push({ key, kind, id, title, updatedAt });
    return key;
  };
  const addBucket = (entityKey_: string, bucketKey: string) => {
    bucketByEntity.set(entityKey_, bucketKey);
    const list = entitiesByBucket.get(bucketKey) || [];
    list.push(entityKey_);
    entitiesByBucket.set(bucketKey, list);
  };
  const addTag = (entityKey_: string, tagKey: string) => {
    const list = tagsByEntity.get(entityKey_) || [];
    list.push(tagKey);
    tagsByEntity.set(entityKey_, list);
    const members = entitiesByTag.get(tagKey) || [];
    members.push(entityKey_);
    entitiesByTag.set(tagKey, members);
  };

  // ---- tag / folder / list / category nodes ----
  for (const tag of data.noteTags || []) addEntity("tag", tag.id, tag.name, "");
  for (const folder of data.noteFolders || []) addEntity("folder", folder.id, folder.name, "");
  for (const list of data.taskLists || []) addEntity("list", list.id, list.name, "");
  for (const cat of data.habitCategories || []) addEntity("habitCategory", cat.id, cat.name, "");

  // ---- notes ----
  for (const n of data.notes || []) {
    if (n.archived) continue;
    const key = addEntity("note", n.id, n.title || "Untitled", n.updatedAt || n.createdAt || "");
    textByEntity.set(key, `${n.title}\n${n.content || ""}`);
    tokensByEntity.set(key, new Set(tokenize(`${n.title} ${n.content || ""}`)));
    dateByEntity.set(key, (n.updatedAt || n.createdAt || "").slice(0, 10));
    for (const t of n.tags || []) addTag(key, entityKey("tag", t));
    if (n.folderId) addBucket(key, entityKey("folder", n.folderId));
  }

  // ---- tasks ----
  for (const t of data.tasks || []) {
    if (t.status === "archived") continue;
    const key = addEntity("task", t.id, t.title, t.updatedAt || t.createdAt || "");
    textByEntity.set(key, `${t.title}\n${t.description || ""}`);
    tokensByEntity.set(key, new Set(tokenize(`${t.title} ${t.description || ""}`)));
    const d = t.dueDate || (t.completedAt ? t.completedAt.slice(0, 10) : "");
    if (d) dateByEntity.set(key, d);
    for (const tg of t.tags || []) addTag(key, entityKey("tag", tg));
    if (t.listId) addBucket(key, entityKey("list", t.listId));
  }

  // ---- habits ----
  for (const h of data.habits || []) {
    if (h.archived) continue;
    const key = addEntity("habit", h.id, h.name, h.createdAt || "");
    textByEntity.set(key, `${h.name} ${h.description || ""}`);
    tokensByEntity.set(key, new Set(tokenize(`${h.name} ${h.description || ""}`)));
    if (h.categoryId) {
      addTag(key, entityKey("habitCategory", h.categoryId));
      addBucket(key, entityKey("habitCategory", h.categoryId));
    }
  }

  // ---- journal ----
  for (const j of data.journalEntries || []) {
    const key = addEntity("journal", j.id, j.title || j.date, j.updatedAt || j.createdAt || "");
    const gratitude = (j.gratitude || []).join(" ");
    const reflections = (j.reflectionPrompts || [])
      .map((r) => `${r.question} ${r.answer}`)
      .join(" ");
    textByEntity.set(key, `${j.title}\n${j.content || ""}\n${gratitude} ${reflections}`);
    tokensByEntity.set(key, new Set(tokenize(`${j.title} ${j.content || ""} ${gratitude} ${reflections}`)));
    dateByEntity.set(key, j.date.slice(0, 10));
  }

  // ---- AI semantic edges (from cached concepts) ----
  const semanticEdges: Edge[] = [];
  const conceptMembers = new Map<string, string[]>();
  for (const [key, concepts] of aiConcepts) {
    if (!concepts || concepts.length === 0) continue;
    for (const c of concepts) {
      const list = conceptMembers.get(c) || [];
      list.push(key);
      conceptMembers.set(c, list);
    }
  }
  const isContentKind = (key: string): boolean => {
    const k = key.split(":")[0];
    return k === "note" || k === "task" || k === "journal" || k === "habit";
  };
  for (const [concept, members] of conceptMembers) {
    const m = members.filter(isContentKind);
    if (m.length < 2) continue;
    for (let i = 0; i < m.length; i++) {
      for (let j = i + 1; j < m.length; j++) {
        semanticEdges.push({
          source: m[i],
          target: m[j],
          type: "semantic",
          weight: 0.9,
          origin: "semantic",
          reason: `both about "${concept}" (AI)`,
        });
      }
    }
  }

  // ---- run local linkers ----
  const localEdges = linkEntities({
    entities,
    tagsByEntity,
    entitiesByTag,
    bucketByEntity,
    entitiesByBucket,
    tokensByEntity,
    textByEntity,
    dateByEntity,
    explicitLinks,
  });

  const allEdges = dedupeEdges([...localEdges, ...semanticEdges]);
  return indexEdges(entities, allEdges);
}

function dedupeEdges(edges: Edge[]): Edge[] {
  const seen = new Map<string, Edge>();
  const out: Edge[] = [];
  for (const e of edges) {
    const a = e.source < e.target ? e.source : e.target;
    const b = e.source < e.target ? e.target : e.source;
    const k = `${a}|${b}|${e.type}`;
    const existing = seen.get(k);
    if (existing) {
      if (e.weight > existing.weight) {
        existing.weight = e.weight;
        existing.reason = e.reason;
      }
      continue;
    }
    seen.set(k, e);
    out.push(e);
  }
  return out;
}

function indexEdges(entities: EntityRef[], edges: Edge[]): GraphIndex {
  const entityMap = new Map(entities.map((e) => [e.key, e]));
  const bySource = new Map<string, Edge[]>();
  const byTarget = new Map<string, Edge[]>();
  for (const e of edges) {
    if (!entityMap.has(e.source) || !entityMap.has(e.target)) continue;
    if (!bySource.has(e.source)) bySource.set(e.source, []);
    if (!byTarget.has(e.target)) byTarget.set(e.target, []);
    bySource.get(e.source)!.push(e);
    byTarget.get(e.target)!.push(e);
  }
  return { entities: entityMap, edgesBySource: bySource, edgesByTarget: byTarget, allEdges: edges };
}
