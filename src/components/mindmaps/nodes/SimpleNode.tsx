"use client";

import React, { memo, useState, useRef, useEffect, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

export interface SimpleNodeData {
  label: string;
  color: string;
  emoji?: string;
  isRoot?: boolean;
  nodeType: "simple";
  [key: string]: unknown;
}

function SimpleNodeComponent({ data, selected, id }: NodeProps<SimpleNodeData>) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setEditValue(data.label);
  };

  const handleSave = () => {
    setEditing(false);
    if (editValue.trim() && editValue !== data.label) {
      const nodeEl = document.querySelector(`[data-id="${id}"]`);
      if (nodeEl) {
        nodeEl.dispatchEvent(new CustomEvent("node-label-change", { detail: { id, label: editValue.trim() }, bubbles: true }));
      }
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") { setEditing(false); setEditValue(data.label); }
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl transition-all duration-300 cursor-pointer border",
        selected ? "border-white/30 shadow-2xl scale-[1.03]" : "border-white/10 shadow-lg hover:shadow-xl hover:scale-[1.01]",
        data.isRoot ? "px-5 py-3 min-w-[140px]" : "px-4 py-2 min-w-[100px]"
      )}
      style={{
        background: data.isRoot ? `linear-gradient(135deg, ${data.color}dd, ${data.color}99)` : `linear-gradient(135deg, ${data.color}22, ${data.color}11)`,
        boxShadow: selected ? `0 8px 32px ${data.color}40, 0 0 0 1px ${data.color}30` : `0 4px 16px ${data.color}15`,
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-white/20 !border-2 !border-white/40 !-top-1.5 hover:!bg-white/40 transition-colors" />
      <div className="flex items-center gap-2">
        {data.emoji && <span className={cn("shrink-0", data.isRoot ? "text-lg" : "text-base")}>{data.emoji}</span>}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input ref={inputRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown}
              className={cn("w-full bg-transparent border-b border-white/40 outline-none font-medium", data.isRoot ? "text-white text-sm" : "text-white/90 text-xs")}
              placeholder="Enter label..." autoFocus />
          ) : (
            <p className={cn("font-semibold truncate", data.isRoot ? "text-white text-sm" : "text-white/90 text-xs")}>{data.label}</p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-white/20 !border-2 !border-white/40 !-bottom-1.5 hover:!bg-white/40 transition-colors" />
    </div>
  );
}

export const SimpleNode = memo(SimpleNodeComponent);
