"use client";

import { useState, useEffect, useMemo } from "react";
import { storage } from "@/lib/storage";
import { ensureWired, getGraph } from "@/lib/graph/engine";
import { buildSituationModel } from "@/lib/graph/situation";
import type { AppData } from "@/types";
import type { SituationModel } from "@/lib/graph/situation";

/**
 * Shared dashboard data hook. Every widget used to independently subscribe
 * to storage and rebuild the situation model on every render. This hook:
 *   - Provides a SINGLE storage subscriber shared across all widgets
 *   - Memoizes buildSituationModel so it only recalculates when data changes
 *   - Calls ensureWired() once
 */
let cachedData: AppData | null = null;
let cacheVersion = 0;

export function useDashboardData(): { data: AppData; situation: SituationModel } {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    ensureWired();
    const unsub = storage.subscribe(() => {
      cachedData = null; // invalidate memo cache
      setVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  const data = useMemo(() => {
    if (!cachedData || version !== cacheVersion) {
      cachedData = { ...storage.getData() };
      cacheVersion = version;
    }
    return cachedData;
  }, [version]);

  const situation = useMemo(() => buildSituationModel(data, getGraph()), [data]);

  return { data, situation };
}
