"use client";
import React, { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Download, Upload, ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, LayoutGrid, GitBranch, Sparkles, Circle, FileText, Box, Type } from "lucide-react";
import { cn } from "@/lib/utils";
interface MindMapToolbarProps {
  onAddNode: (type: "simple" | "rich" | "group" | "definition") => void;
  onDeleteSelected: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAutoLayout: (algorithm: "tree" | "radial" | "force") => void;
  onExport: (format: "png" | "json") => void;
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

export function MindMapToolbar({ onAddNode, onDeleteSelected, onZoomIn, onZoomOut, onFitView, onAutoLayout, onExport, onImport, onUndo, onRedo, hasSelected, selectedNodeId, canUndo, canRedo, currentMapName, onRenameMap }: MindMapToolbarProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(currentMapName);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editingName && nameRef.current) { nameRef.current.focus(); nameRef.current.select(); } }, [editingName]);
  useEffect(() => { setNameValue(currentMapName); }, [currentMapName]);

  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between gap-3 pointer-events-none">
      <div className="flex flex-col gap-1.5 pointer-events-auto">
        <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2 shadow-lg">
          {editingName ? (
            <input ref={nameRef} value={nameValue} onChange={(e) => setNameValue(e.target.value)} onBlur={() => { setEditingName(false); if (nameValue.trim() && nameValue !== currentMapName) onRenameMap(nameValue.trim()); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setEditingName(false); if (nameValue.trim()) onRenameMap(nameValue.trim()); } if (e.key === "Escape") { setEditingName(false); setNameValue(currentMapName); } }} className="bg-transparent outline-none text-sm font-bold text-white/90 placeholder:text-white/20 w-48" placeholder="Map name..." autoFocus />
          ) : (
            <p className="text-sm font-bold text-white/90 cursor-text truncate max-w-[200px]" onClick={() => setEditingName(true)}>{currentMapName || "Untitled Map"}</p>
          )}
        </div>
        <button onClick={() => onAddNode("simple")} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-lg hover:bg-white/10 transition-all text-sm font-medium text-white/80"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add Node</span></button>
        <button onClick={() => onAutoLayout("tree")} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-lg hover:bg-white/10 transition-all text-sm font-medium text-white/80"><LayoutGrid className="h-4 w-4" /><span className="hidden sm:inline">Layout</span></button>
        {hasSelected && selectedNodeId !== "root" && (<button onClick={onDeleteSelected} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/20 backdrop-blur-xl border border-red-500/20 text-red-400 shadow-lg hover:bg-red-500/30 transition-all text-sm font-medium"><Trash2 className="h-4 w-4" /><span className="hidden sm:inline">Delete</span></button>)}
      </div>
      <div className="flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex gap-1">
          <button onClick={onUndo} disabled={!canUndo} className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-lg transition-all", canUndo ? "hover:bg-white/10 text-white/80" : "text-white/20 cursor-not-allowed")} title="Undo (Ctrl+Z)"><Undo2 className="h-4 w-4" /></button>
          <button onClick={onRedo} disabled={!canRedo} className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-lg transition-all", canRedo ? "hover:bg-white/10 text-white/80" : "text-white/20 cursor-not-allowed")} title="Redo (Ctrl+Shift+Z)"><Redo2 className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-1">
          <button onClick={onZoomIn} className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-lg hover:bg-white/10 transition-all text-white/80"><ZoomIn className="h-4 w-4" /></button>
          <button onClick={onZoomOut} className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-lg hover:bg-white/10 transition-all text-white/80"><ZoomOut className="h-4 w-4" /></button>
          <button onClick={onFitView} className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-lg hover:bg-white/10 transition-all text-white/80"><Maximize2 className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-1">
          <button onClick={onImport} className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-lg hover:bg-white/10 transition-all text-white/80" title="Import JSON"><Upload className="h-4 w-4" /></button>
          <button onClick={() => onExport("json")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 shadow-lg hover:bg-white/10 transition-all text-white/80" title="Export JSON"><Download className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}
