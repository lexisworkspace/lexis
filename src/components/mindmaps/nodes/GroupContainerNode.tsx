"use client";
import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';

export interface GroupContainerNodeData {
  label: string;
  color: string;
  nodeType: 'group';
  children: string[];
  borderColor?: string;
  [key: string]: unknown;
}

function GroupContainerNodeComponent({ data, selected, id }: NodeProps<GroupContainerNodeData>) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);

  const save = () => {
    setEditing(false);
    if (editValue.trim() && editValue !== data.label) {
      const el = document.querySelector('[data-id="' + id + '"]');
      if (el) el.dispatchEvent(new CustomEvent('node-label-change', { detail: { id, label: editValue.trim() }, bubbles: true }));
    }
  };

  return (
    <div className={cn('relative rounded-xl border border-dashed transition-all duration-150', selected ? 'border-zinc-400' : 'border-zinc-600')} style={{ background: 'transparent', minWidth: 260, minHeight: 140 }}>
      <div className="px-3 py-2 border-b border-dashed border-zinc-700" onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); setEditValue(data.label); }}>
        {editing ? (
          <input ref={inputRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={save}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setEditValue(data.label); } }}
            className="bg-transparent border-b border-zinc-600 outline-none text-xs font-semibold text-zinc-300 uppercase tracking-wider w-full" />
        ) : (
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider cursor-text">{data.label}</span>
        )}
      </div>
      <div className="relative p-3 min-h-[100px]">
        {(!data.children || data.children.length === 0) && <p className="text-[10px] text-zinc-600 text-center">Drop nodes here</p>}
      </div>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-zinc-600 !border-2 !border-zinc-700 !-top-1" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-zinc-600 !border-2 !border-zinc-700 !-bottom-1" />
    </div>
  );
}
export const GroupContainerNode = memo(GroupContainerNodeComponent);
