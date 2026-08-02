"use client";
import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Download, Upload, ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, LayoutGrid, GitBranch, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MindMapToolbarProps {
  onAddNode: (type: 'simple' | 'rich' | 'group' | 'definition') => void;
  onDeleteSelected: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAutoLayout: (algorithm: 'tree' | 'radial' | 'force') => void;
  onExport: (format: 'png' | 'json') => void;
  onImport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  hasSelected: boolean;
  selectedNodeId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  currentMapName: string;
  onRenameMap: (name: string) => void;
}

function Dropdown({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg p-1 shadow-lg z-50 w-48" onClick={() => setOpen(false)}>{children}</div>}
    </div>
  );
}

export function MindMapToolbar({ onAddNode, onDeleteSelected, onZoomIn, onZoomOut, onFitView, onAutoLayout, onExport, onImport, onUndo, onRedo, hasSelected, selectedNodeId, canUndo, canRedo, currentMapName, onRenameMap }: MindMapToolbarProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(currentMapName);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingName && nameRef.current) { nameRef.current.focus(); nameRef.current.select(); } }, [editingName]);
  useEffect(() => { setNameValue(currentMapName); }, [currentMapName]);

  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between gap-3 pointer-events-none">
      <div className="flex flex-col gap-1.5 pointer-events-auto">
        {/* Map name */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2">
          {editingName ? (
            <input ref={nameRef} value={nameValue} onChange={(e) => setNameValue(e.target.value)}
              onBlur={() => { setEditingName(false); if (nameValue.trim() && nameValue !== currentMapName) onRenameMap(nameValue.trim()); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setEditingName(false); if (nameValue.trim()) onRenameMap(nameValue.trim()); } if (e.key === 'Escape') { setEditingName(false); setNameValue(currentMapName); } }}
              className="bg-transparent outline-none text-sm font-medium text-zinc-200 placeholder:text-zinc-600 w-48" placeholder="Map name..." autoFocus />
          ) : (
            <p className="text-sm font-medium text-zinc-300 cursor-text truncate max-w-[200px]" onClick={() => setEditingName(true)}>{currentMapName || 'Untitled Map'}</p>
          )}
        </div>
        {/* Add node */}
        <Dropdown trigger={<button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-500 transition-colors text-sm font-medium text-zinc-300"><Plus className="h-4 w-4" /><span>Add</span></button>}>
          {([
            { type: 'simple' as const, label: 'Simple', desc: 'Basic node' },
            { type: 'rich' as const, label: 'Rich Content', desc: 'With blocks' },
            { type: 'group' as const, label: 'Group', desc: 'Visual container' },
            { type: 'definition' as const, label: 'Definition', desc: 'Term + content' },
          ]).map((item) => (
            <button key={item.type} onClick={() => onAddNode(item.type)} className="w-full flex flex-col px-3 py-2 rounded-md text-left hover:bg-zinc-800 transition-colors">
              <span className="text-xs font-medium text-zinc-300">{item.label}</span>
              <span className="text-[10px] text-zinc-600">{item.desc}</span>
            </button>
          ))}
        </Dropdown>
        {/* Layout */}
        <Dropdown trigger={<button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-500 transition-colors text-sm font-medium text-zinc-300"><LayoutGrid className="h-4 w-4" /><span>Layout</span></button>}>
          {([
            { algo: 'tree' as const, icon: GitBranch, label: 'Tree' },
            { algo: 'radial' as const, icon: LayoutGrid, label: 'Radial' },
            { algo: 'force' as const, icon: Sparkles, label: 'Force' },
          ]).map((item) => (
            <button key={item.algo} onClick={() => onAutoLayout(item.algo)} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left hover:bg-zinc-800 transition-colors">
              <item.icon className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-300">{item.label}</span>
            </button>
          ))}
        </Dropdown>
        {/* Delete */}
        {hasSelected && selectedNodeId !== 'root' && (
          <button onClick={onDeleteSelected} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700 hover:border-red-500/50 hover:bg-red-500/10 transition-colors text-sm text-zinc-400 hover:text-red-400"><Trash2 className="h-4 w-4" /><span>Delete</span></button>
        )}
      </div>
      <div className="flex flex-col gap-1.5 pointer-events-auto">
        {/* Undo/Redo */}
        <div className="flex gap-1">
          <button onClick={onUndo} disabled={!canUndo} className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 transition-colors", canUndo ? "hover:border-zinc-500 text-zinc-400 hover:text-zinc-200" : "text-zinc-700 cursor-not-allowed")} title="Undo"><Undo2 className="h-3.5 w-3.5" /></button>
          <button onClick={onRedo} disabled={!canRedo} className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 transition-colors", canRedo ? "hover:border-zinc-500 text-zinc-400 hover:text-zinc-200" : "text-zinc-700 cursor-not-allowed")} title="Redo"><Redo2 className="h-3.5 w-3.5" /></button>
        </div>
        {/* Zoom */}
        <div className="flex gap-1">
          <button onClick={onZoomIn} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 transition-colors"><ZoomIn className="h-3.5 w-3.5" /></button>
          <button onClick={onZoomOut} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 transition-colors"><ZoomOut className="h-3.5 w-3.5" /></button>
          <button onClick={onFitView} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 transition-colors"><Maximize2 className="h-3.5 w-3.5" /></button>
        </div>
        {/* Import/Export */}
        <div className="flex gap-1">
          <button onClick={onImport} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 transition-colors" title="Import"><Upload className="h-3.5 w-3.5" /></button>
          <button onClick={() => onExport('json')} className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 transition-colors" title="Export"><Download className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
