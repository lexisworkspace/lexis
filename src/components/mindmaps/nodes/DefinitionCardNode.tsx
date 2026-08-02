"use client";
import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';

export interface DefinitionCardNodeData {
  label: string;
  color: string;
  nodeType: 'definition';
  heading: string;
  content: string;
  [key: string]: unknown;
}

function DefinitionCardNodeComponent({ data, selected, id }: NodeProps<DefinitionCardNodeData>) {
  const [editField, setEditField] = useState<null | 'heading' | 'content'>(null);
  const [headingVal, setHeadingVal] = useState(data.heading || data.label);
  const [contentVal, setContentVal] = useState(data.content || '');
  const headingRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editField === 'heading' && headingRef.current) headingRef.current.focus();
    if (editField === 'content' && contentRef.current) contentRef.current.focus();
  }, [editField]);

  const saveField = (field: 'heading' | 'content') => {
    setEditField(null);
    const el = document.querySelector('[data-id="' + id + '"]');
    if (!el) return;
    if (field === 'heading' && headingVal.trim()) {
      el.dispatchEvent(new CustomEvent('node-label-change', { detail: { id, label: headingVal.trim() }, bubbles: true }));
      el.dispatchEvent(new CustomEvent('node-update-field', { detail: { id, field: 'heading', value: headingVal.trim() }, bubbles: true }));
    }
    if (field === 'content') el.dispatchEvent(new CustomEvent('node-update-field', { detail: { id, field: 'content', value: contentVal }, bubbles: true }));
  };

  return (
    <div className={cn('relative rounded-lg border transition-all duration-150 cursor-pointer', selected ? 'border-zinc-400 bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500')} style={{ minWidth: 240, maxWidth: 320 }}
      onDoubleClick={(e) => { e.stopPropagation(); setEditField('heading'); setHeadingVal(data.heading || data.label); }}>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-zinc-500 !border-2 !border-zinc-700 !-top-1" />
      <div className="px-3 pt-2"><span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Definition</span></div>
      <div className="px-3 pb-1">
        {editField === 'heading' ? (
          <input ref={headingRef} value={headingVal} onChange={(e) => setHeadingVal(e.target.value)} onBlur={() => saveField('heading')}
            onKeyDown={(e) => { if (e.key === 'Enter') saveField('heading'); if (e.key === 'Escape') { setEditField(null); setHeadingVal(data.heading || data.label); } }}
            className="w-full bg-transparent border-b border-zinc-600 outline-none text-sm font-semibold text-zinc-100" />
        ) : (<h3 className="text-sm font-semibold text-zinc-200">{data.heading || data.label}</h3>)}
      </div>
      <div className="mx-3 h-px bg-zinc-800" />
      <div className="px-3 py-2">
        {editField === 'content' ? (
          <textarea ref={contentRef} value={contentVal} onChange={(e) => setContentVal(e.target.value)} onBlur={() => saveField('content')}
            onKeyDown={(e) => { if (e.key === 'Escape') { setEditField(null); setContentVal(data.content || ''); } }}
            className="w-full bg-transparent outline-none text-xs text-zinc-400 leading-relaxed resize-none min-h-[40px]" rows={3} />
        ) : (
          <p className="text-xs text-zinc-500 leading-relaxed cursor-text min-h-[32px]"
            onClick={(e) => { e.stopPropagation(); setEditField('content'); setContentVal(data.content || ''); }}>
            {data.content || 'Click to add content...'}
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-zinc-500 !border-2 !border-zinc-700 !-bottom-1" />
    </div>
  );
}
export const DefinitionCardNode = memo(DefinitionCardNodeComponent);
