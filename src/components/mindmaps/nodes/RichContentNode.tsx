"use client";
import { memo, useState, useRef, useEffect, useCallback, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";
import { GripVertical, Plus, Trash2 } from "lucide-react";
export interface RichContentNodeData { label: string; color: string; emoji?: string; nodeType: "rich"; richContent: RichContentBlock[]; [key: string]: unknown; }
export interface RichContentBlock { id: string; type: "heading" | "paragraph" | "list" | "definition" | "divider"; text?: string; items?: string[]; }
function genBlockId(): string { return "b-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9); }
function RichBlockEditor({ block, onChange, onDelete }: { block: RichContentBlock; onChange: (u: Partial<RichContentBlock>) => void; onDelete: () => void }) {
  if (block.type === "list") {
    return (
      <div className="group/block relative">
        <div className="flex items-start gap-1.5">
          <GripVertical className="h-3 w-3 text-white/20 mt-1 shrink-0 opacity-0 group-hover/block:opacity-100 cursor-grab" />
          <div className="flex-1 space-y-0.5">
            {(block.items || []).map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-white/70">
                <span className="text-white/30">\u2022</span>
                <input value={item} onChange={(e) => { const n = [...(block.items || [])]; n[i] = e.target.value; onChange({ items: n }); }} className="flex-1 bg-transparent outline-none text-white/70 placeholder:text-white/20" placeholder="List item..." />
                <button onClick={() => { const n = (block.items || []).filter((_, idx) => idx !== i); onChange({ items: n }); }} className="opacity-0 group-hover/block:opacity-100 text-white/30 hover:text-red-400"><Trash2 className="h-2.5 w-2.5" /></button>
              </div>
            ))}
            <button onClick={() => onChange({ items: [...(block.items || []), ""] })} className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 mt-1"><Plus className="h-2.5 w-2.5" /> Add</button>
          </div>
        </div>
      </div>
    );
  }
  if (block.type === "definition") {
    return (
      <div className="group/block relative bg-white/5 rounded-lg p-2.5 border border-white/5">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[9px] font-mono text-white/30 uppercase">Definition</span>
          <button onClick={onDelete} className="ml-auto opacity-0 group-hover/block:opacity-100 text-white/30 hover:text-red-400"><Trash2 className="h-2.5 w-2.5" /></button>
        </div>
        <input value={block.text || ""} onChange={(e) => onChange({ text: e.target.value })} className="w-full bg-transparent outline-none text-[11px] text-white/60 placeholder:text-white/20" placeholder="Enter definition..." />
      </div>
    );
  }
  if (block.type === "divider") {
    return (
      <div className="group/block flex items-center gap-2 py-1">
        <div className="flex-1 h-px bg-white/10" />
        <button onClick={onDelete} className="opacity-0 group-hover/block:opacity-100 text-white/30 hover:text-red-400"><Trash2 className="h-2.5 w-2.5" /></button>
      </div>
    );
  }
  return (
    <div className="group/block relative">
      <div className="flex items-start gap-1.5">
        <GripVertical className="h-3 w-3 text-white/20 mt-0.5 shrink-0 opacity-0 group-hover/block:opacity-100 cursor-grab" />
        <div className="flex-1 flex items-center gap-1.5">
          {block.type === "heading" ? (
            <input value={block.text || ""} onChange={(e) => onChange({ text: e.target.value })} className="flex-1 bg-transparent outline-none text-xs font-bold text-white/90 placeholder:text-white/20" placeholder="Heading..." />
          ) : (
            <input value={block.text || ""} onChange={(e) => onChange({ text: e.target.value })} className="flex-1 bg-transparent outline-none text-[11px] text-white/60 placeholder:text-white/20" placeholder="Text..." />
          )}
          <button onClick={onDelete} className="opacity-0 group-hover/block:opacity-100 text-white/30 hover:text-red-400 shrink-0"><Trash2 className="h-2.5 w-2.5" /></button>
        </div>
      </div>
    </div>
  );
}
function RichContentNodeComponent({ data, selected, id }: NodeProps<RichContentNodeData>) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(data.label);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (editingTitle && titleRef.current) { titleRef.current.focus(); titleRef.current.select(); } }, [editingTitle]);
  useEffect(() => { const h = (e: MouseEvent) => { if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setShowAddMenu(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const handleTitleSave = () => { setEditingTitle(false); if (titleValue.trim() && titleValue !== data.label) { const el = document.querySelector(`[data-id="${id}"]`); if (el) el.dispatchEvent(new CustomEvent("node-label-change", { detail: { id, label: titleValue.trim() }, bubbles: true })); } };
  const handleTitleKeyDown = (e: ReactKeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); handleTitleSave(); } if (e.key === "Escape") { setEditingTitle(false); setTitleValue(data.label); } };
  const addBlock = useCallback((type: RichContentBlock["type"]) => { const el = document.querySelector(`[data-id="${id}"]`); if (el) el.dispatchEvent(new CustomEvent("node-add-block", { detail: { id, block: { id: genBlockId(), type, text: "", items: type === "list" ? [""] : undefined } }, bubbles: true })); setShowAddMenu(false); }, [id]);
  const updateBlock = useCallback((blockId: string, updates: Partial<RichContentBlock>) => { const el = document.querySelector(`[data-id="${id}"]`); if (el) el.dispatchEvent(new CustomEvent("node-update-block", { detail: { id, blockId, updates }, bubbles: true })); }, [id]);
  const deleteBlock = useCallback((blockId: string) => { const el = document.querySelector(`[data-id="${id}"]`); if (el) el.dispatchEvent(new CustomEvent("node-delete-block", { detail: { id, blockId }, bubbles: true })); }, [id]);
  const blocks = data.richContent || [];
  return (
    <div className={cn("group relative rounded-2xl transition-all duration-300 cursor-pointer border backdrop-blur-xl", selected ? "border-white/25 shadow-2xl scale-[1.02]" : "border-white/10 shadow-lg hover:shadow-xl")} style={{ background: `linear-gradient(135deg, ${data.color}15, ${data.color}08)`, minWidth: "220px", maxWidth: "320px" }} onDoubleClick={(e) => { e.stopPropagation(); setEditingTitle(true); setTitleValue(data.label); }}>
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-white/20 !border-2 !border-white/30 !-top-1.5" />
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          {data.emoji && <span className="text-sm">{data.emoji}</span>}
          {editingTitle ? (
            <input ref={titleRef} value={titleValue} onChange={(e) => setTitleValue(e.target.value)} onBlur={handleTitleSave} onKeyDown={handleTitleKeyDown} className="flex-1 bg-transparent border-b border-white/30 outline-none text-sm font-bold text-white/90 placeholder:text-white/20" placeholder="Title..." autoFocus />
          ) : (
            <h3 className="text-sm font-bold text-white/90 truncate">{data.label}</h3>
          )}
        </div>
      </div>
      <div className="px-4 py-2.5 space-y-2">
        {blocks.map((block) => (<RichBlockEditor key={block.id} block={block} onChange={(u) => updateBlock(block.id, u)} onDelete={() => deleteBlock(block.id)} />))}
        {blocks.length === 0 && <p className="text-[10px] text-white/20 text-center py-2">Double-click title to edit</p>}
      </div>
      <div className="px-4 pb-3 relative" ref={addMenuRef}>
        <button onClick={() => setShowAddMenu(!showAddMenu)} className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] text-white/20 hover:text-white/40 hover:bg-white/5"><Plus className="h-3 w-3" /> Add block</button>
        {showAddMenu && (
          <div className="absolute bottom-full left-4 right-4 mb-1 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-2xl z-50">
            {([{ type: "heading" as const, label: "Heading" }, { type: "paragraph" as const, label: "Paragraph" }, { type: "list" as const, label: "Bullet List" }, { type: "definition" as const, label: "Definition" }, { type: "divider" as const, label: "Divider" }]).map((item) => (
              <button key={item.type} onClick={() => addBlock(item.type)} className="w-full px-3 py-1.5 text-left text-[11px] text-white/60 hover:text-white/90 hover:bg-white/10 rounded-lg">{item.label}</button>
            ))}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-white/20 !border-2 !border-white/30 !-bottom-1.5" />
    </div>
  );
}
export const RichContentNode = memo(RichContentNodeComponent);
