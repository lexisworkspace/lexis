"use client";
import { memo, useState, useRef, useEffect, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

export interface GroupContainerNodeData {
  label: string;
  color: string;
  nodeType: "group";
  children: string[];
  borderColor?: string;
  [key: string]: unknown;
}

function GroupContainerNodeComponent({ data, selected, id }: NodeProps<GroupContainerNodeData>) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);

  const handleDoubleClick = (e: React.MouseEvent) => { e.stopPropagation(); setEditing(true); setEditValue(data.label); };
  const handleSave = () => {
    setEditing(false);
    if (editValue.trim() && editValue !== data.label) {
      const el = document.querySelector(`[data-id="${id}"]`);
      if (el) el.dispatchEvent(new CustomEvent("node-label-change", { detail: { id, label: editValue.trim() }, bubbles: true }));
    }
  };
  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") { setEditing(false); setEditValue(data.label); }
  };

  const borderColor = data.borderColor || data.color;

  return (
    <div className={cn("group relative rounded-2xl transition-all duration-300 border-2 border-dashed", selected ? "shadow-2xl" : "shadow-sm hover:shadow-md")}
      style={{ borderColor: `${borderColor}40`, background: `${borderColor}08`, minWidth: "280px", minHeight: "160px", boxShadow: selected ? `0 8px 32px ${borderColor}20` : `0 2px 8px rgba(0,0,0,0.1)` }}>
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-white/20 !border-2 !border-white/30 !-top-1.5 hover:!bg-white/40 transition-colors" />
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-dashed" style={{ borderColor: `${borderColor}30` }} onDoubleClick={handleDoubleClick}>
        <GripVertical className="h-3 w-3 text-white/20 shrink-0 cursor-grab" />
        {editing ? (
          <input ref={inputRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-b border-white/30 outline-none text-sm font-bold text-white/90 placeholder:text-white/20" placeholder="Group name..." autoFocus />
        ) : (
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: `${borderColor}cc` }}>{data.label}</h3>
        )}
      </div>
      <div className="relative p-4 min-h-[120px]">
        {(!data.children || data.children.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center"><p className="text-[10px] text-white/15 text-center">Drop nodes here or add children</p></div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-white/20 !border-2 !border-white/30 !-bottom-1.5 hover:!bg-white/40 transition-colors" />
    </div>
  );
}

export const GroupContainerNode = memo(GroupContainerNodeComponent);
