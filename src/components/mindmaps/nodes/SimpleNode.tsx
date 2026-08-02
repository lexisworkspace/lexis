"use client";
import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';

export interface SimpleNodeData {
  label: string;
  color: string;
  emoji?: string;
  isRoot?: boolean;
  nodeType: 'simple';
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
      const el = document.querySelector('[data-id="' + id + '"]');
      if (el) {
        el.dispatchEvent(new CustomEvent('node-label-change', {
          detail: { id, label: editValue.trim() },
          bubbles: true,
        }));
      }
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-lg border transition-all duration-150 cursor-pointer',
        selected
          ? 'border-zinc-400 bg-zinc-800'
          : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500',
        data.isRoot ? 'px-4 py-2.5 min-w-[120px]' : 'px-3 py-2 min-w-[80px]'
      )}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-zinc-500 !border-2 !border-zinc-700 !-top-1" />
      <div className="flex items-center gap-2">
        {data.emoji && <span className="text-sm shrink-0">{data.emoji}</span>}
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setEditValue(data.label); } }}
            className="bg-transparent border-b border-zinc-500 outline-none text-sm font-medium text-zinc-100 w-full"
          />
        ) : (
          <span className={cn('text-sm font-medium truncate', data.isRoot ? 'text-zinc-100' : 'text-zinc-300')}>
            {data.label}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-zinc-500 !border-2 !border-zinc-700 !-bottom-1" />
    </div>
  );
}

export const SimpleNode = memo(SimpleNodeComponent);
