"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { storage } from "@/lib/storage";
import { MindMap } from "@/types";
import { Plus, Trash2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const MindMapCanvas = dynamic(
  () => import("@/components/mindmaps/MindMapCanvas").then((mod) => ({ default: mod.MindMapCanvas })),
  { ssr: false, loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
        <p className="text-sm text-muted-foreground">Loading Lexis Brain...</p>
      </div>
    </div>
  )}
);

export default function MindMapsPage() {
  const [maps, setMaps] = useState<MindMap[]>(() => storage.getMindMaps());
  const [activeMapId, setActiveMapId] = useState<string | null>(() => maps[0]?.id ?? null);
  const refreshMaps = useCallback(() => { setMaps(storage.getMindMaps()); }, []);
  const handleMapUpdate = useCallback((map: MindMap) => { refreshMaps(); }, [refreshMaps]);
  const createMap = useCallback(() => { const map = storage.createMindMap("Untitled Map"); refreshMaps(); setActiveMapId(map.id); }, [refreshMaps]);
  const deleteMap = useCallback((id: string) => { storage.deleteMindMap(id); refreshMaps(); if (activeMapId === id) { const remaining = storage.getMindMaps(); setActiveMapId(remaining[0]?.id ?? null); } }, [activeMapId, refreshMaps]);

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lexis Brain</h1>
          <p className="text-sm text-muted-foreground mt-1">Double-click to rename, drag to connect, Ctrl+Z/Y for undo/redo.</p>
        </div>
        <button onClick={createMap} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"><Plus className="h-4 w-4" /> New Map</button>
      </div>
      {maps.length > 1 && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {maps.map((map) => (
            <button key={map.id} onClick={() => setActiveMapId(map.id)} className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors", activeMapId === map.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
              <FileText className="h-3.5 w-3.5" /> {map.name}
              <button onClick={(e) => { e.stopPropagation(); deleteMap(map.id); }} className="ml-1 rounded p-0.5 hover:bg-background/20"><Trash2 className="h-3 w-3" /></button>
            </button>
          ))}
        </div>
      )}
      <div className="h-[calc(100%-5rem)] rounded-xl border border-border overflow-hidden">
        <MindMapCanvas mapId={activeMapId} onMapUpdate={handleMapUpdate} />
      </div>
    </div>
  );
}
