"use client";
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { storage } from '@/lib/storage';
import { MindMap } from '@/types';
import { Plus, Trash2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const MindMapCanvas = dynamic(
  () => import('@/components/mindmaps/MindMapCanvas').then((mod) => ({ default: mod.MindMapCanvas })),
  { ssr: false, loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    </div>
  )}
);

export default function MindMapsPage() {
  const [maps, setMaps] = useState<MindMap[]>(() => storage.getMindMaps());
  const [activeMapId, setActiveMapId] = useState<string | null>(() => maps[0]?.id ?? null);

  const refreshMaps = useCallback(() => { setMaps(storage.getMindMaps()); }, []);

  const handleMapUpdate = useCallback((_map: MindMap) => { refreshMaps(); }, [refreshMaps]);

  const createMap = useCallback(() => {
    const map = storage.createMindMap('Untitled Map');
    refreshMaps();
    setActiveMapId(map.id);
  }, [refreshMaps]);

  const deleteMap = useCallback((id: string) => {
    storage.deleteMindMap(id);
    refreshMaps();
    if (activeMapId === id) {
      const remaining = storage.getMindMaps();
      setActiveMapId(remaining[0]?.id ?? null);
    }
  }, [activeMapId, refreshMaps]);

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">Lexis Brain</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Double-click to rename nodes. Drag between handles to connect. Ctrl+Z/Y for undo/redo.</p>
        </div>
        <button onClick={createMap} className="flex items-center gap-1.5 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors">
          <Plus className="h-3.5 w-3.5" /> New Map
        </button>
      </div>
      {maps.length > 1 && (
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {maps.map((map) => (
            <button key={map.id} onClick={() => setActiveMapId(map.id)}
              className={cn('flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                activeMapId === map.id ? 'bg-zinc-800 text-zinc-200 border border-zinc-600' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
              )}>
              <FileText className="h-3 w-3" /> {map.name}
              {maps.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); deleteMap(map.id); }} className="ml-1 rounded p-0.5 hover:bg-zinc-700 transition-colors">
                  <Trash2 className="h-2.5 w-2.5 text-zinc-600 hover:text-zinc-400" />
                </button>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 rounded-lg border border-zinc-800 overflow-hidden">
        <MindMapCanvas mapId={activeMapId} onMapUpdate={handleMapUpdate} />
      </div>
    </div>
  );
}
