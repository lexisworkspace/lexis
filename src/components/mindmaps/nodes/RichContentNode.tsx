"use client";
import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';

export interface RichContentNodeData {
  label: string;
  color: string;
  emoji?: string;
  nodeType: 'rich';
  richContent: RichContentBlock[];
  [key: string]: unknown;
}

export interface RichContentBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'definition' | 'divider';
  text?: string;
  items?: string[];
}

function genBlockId(): string { return 'b-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9); }

function RichBlock({ block, onChange, onDelete }: { block: RichContentBlock; onChange: (u: Partial<RichContentBlock>) => void; onDelete: () => void }) {
  if (block.type === 'list') {
    return (
      <div className="group">
        {(block.items || []).map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-zinc-400 py-0.5">
            <span className="text-zinc-600">-</span>
            <input value={item} onChange={(e) => { const n = [...(block.items || [])]; n[i] = e.target.value; onChange({ items: n }); }}
              className="flex-1 bg-transparent outline-none text-zinc-400 placeholder:text-zinc-700" placeholder="List item..." />
            <button onClick={() => { const n = (block.items || []).filter((_, idx) => idx !== i); onChange({ items: n }); }}
              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-400 transition-opacity"><X className="h-3 w-3" /></button>
          </div>
        ))}
        <button onClick={() => onChange({ items: [...(block.items || []), ''] })}
          className="text-[10px] text-zinc-600 hover:text-zinc-400 mt-1 transition-colors">+ Add</button>
      </div>
    );
  }
  if (block.type === 'divider') {
    return <div className="py-1"><div className="h-px bg-zinc-800" /></div>;
  }
  return (
    <div className="group">
      <input value={block.text || ''} onChange={(e) => onChange({ text: e.target.value })}
        className={cn('w-full bg-transparent outline-none placeholder:text-zinc-700', block.type === 'heading' ? 'text-xs font-semibold text-zinc-200' : 'text-xs text-zinc-400')}
        placeholder={block.type === 'heading' ? 'Heading...' : 'Text...'} />
      <button onClick={onDelete} className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-400 transition-opacity"><X className="h-3 w-3" /></button>
    </div>
  );
}

function RichContentNodeComponent({ data, selected, id }: NodeProps<RichContentNodeData>) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(data.label);
  const [showAdd, setShowAdd] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (editingTitle && titleRef.current) titleRef.current.focus(); }, [editingTitle]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (addRef.current && !addRef.current.contains(e.target as Node)) setShowAdd(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const saveTitle = () => {
    setEditingTitle(false);
    if (titleVal.trim() && titleVal !== data.label) {
      document.querySelector('[data-id="' + id + '"]')?.dispatchEvent(new CustomEvent('node-label-change', { detail: { id, label: titleVal.trim() }, bubbles: true }));
    }
  };

  const addBlock = useCallback((type: RichContentBlock['type']) => {
    document.querySelector('[data-id="' + id + '"]')?.dispatchEvent(new CustomEvent('node-add-block', {
      detail: { id, block: { id: genBlockId(), type, text: '', items: type === 'list' ? [''] : undefined } }, bubbles: true
    }));
    setShowAdd(false);
  }, [id]);

  const blocks = data.richContent || [];

  return (
    <div className={cn('relative rounded-lg border transition-all duration-150 cursor-pointer', selected ? 'border-zinc-400 bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500')}
      style={{ minWidth: 200, maxWidth: 300 }}
      onDoubleClick={(e) => { e.stopPropagation(); setEditingTitle(true); setTitleVal(data.label); }}>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-zinc-500 !border-2 !border-zinc-700 !-top-1" />
      <div className="px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          {data.emoji && <span className="text-sm shrink-0">{data.emoji}</span>}
          {editingTitle ? (
            <input ref={titleRef} value={titleVal} onChange={(e) => setTitleVal(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleVal(data.label); } }}
              className="flex-1 bg-transparent border-b border-zinc-600 outline-none text-sm font-semibold text-zinc-100" />
          ) : (
            <span className="text-sm font-semibold text-zinc-200 truncate">{data.label}</span>
          )}
        </div>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {blocks.map((block) => (
          <div key={block.id} className="relative">
            <RichBlock block={block}
              onChange={(u) => document.querySelector('[data-id="' + id + '"]')?.dispatchEvent(new CustomEvent('node-update-block', { detail: { id, blockId: block.id, updates: u }, bubbles: true }))}
              onDelete={() => document.querySelector('[data-id="' + id + '"]')?.dispatchEvent(new CustomEvent('node-delete-block', { detail: { id, blockId: block.id }, bubbles: true }))} />
          </div>
        ))}
        {blocks.length === 0 && <p className="text-[10px] text-zinc-700 text-center py-1">Double-click to edit</p>}
      </div>
      <div className="px-3 pb-2 relative" ref={addRef}>
        <button onClick={() => setShowAdd(!showAdd)} className="w-full flex items-center justify-center gap-1 py-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
          <Plus className="h-3 w-3" /> Add
        </button>
        {showAdd && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-zinc-900 border border-zinc-700 rounded-lg p-1 shadow-lg z-50">
            {[{ type: 'heading' as const, label: 'Heading' }, { type: 'paragraph' as const, label: 'Text' }, { type: 'list' as const, label: 'List' }, { type: 'divider' as const, label: 'Divider' }].map((item) => (
              <button key={item.type} onClick={() => addBlock(item.type)} className="w-full px-2 py-1 text-left text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors">{item.label}</button>
            ))}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-zinc-500 !border-2 !border-zinc-700 !-bottom-1" />
    </div>
  );
}

export const RichContentNode = memo(RichContentNodeComponent);
