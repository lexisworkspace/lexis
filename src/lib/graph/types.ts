// ============================================================
// Orleia Brain - knowledge graph types
// The Brain is a derived, local graph over all AppData entities.
// Pure types only; no runtime dependencies.
// ============================================================

export type EntityKind =
  | "note"
  | "task"
  | "habit"
  | "journal"
  | "tag"
  | "folder"
  | "list"
  | "habitCategory";

/** A node in the graph. `key` = `${kind}:${id}` (stable, unique). */
export interface EntityRef {
  key: string;
  kind: EntityKind;
  id: string;
  title: string;
  updatedAt: string;
}

/** How an edge was created. */
export type EdgeType =
  | "explicit" // user created it
  | "tag" // shared tag / category
  | "mention" // one entity's title appears in another's content
  | "similar" // content similarity
  | "temporal" // same-day / nearby activity
  | "structural" // same folder / list / category
  | "semantic"; // AI-extracted shared concept (unlimited API)

export type EdgeOrigin = "explicit" | "inferred" | "semantic";

export interface Edge {
  source: string;
  target: string;
  type: EdgeType;
  weight: number; // 0..1
  origin: EdgeOrigin;
  reason: string; // human-readable "why" - feeds Noor + UI receipts
}

export interface GraphIndex {
  entities: Map<string, EntityRef>;
  edgesBySource: Map<string, Edge[]>;
  edgesByTarget: Map<string, Edge[]>;
  /** All edges, deduped by source|target|type. */
  allEdges: Edge[];
}

export const entityKey = (kind: EntityKind, id: string): string => `${kind}:${id}`;
