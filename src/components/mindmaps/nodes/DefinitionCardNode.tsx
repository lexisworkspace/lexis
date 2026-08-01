"use client";
import { memo, useState, useRef, useEffect, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

export interface DefinitionCardNodeData {
  label: string;
  color: string;
  nodeType: "definition";
  heading: string;
  content: string;
  [key: string]: unknown;
}

function DefinitionCardNodeComponent({ data, selected, id }: NodeProps<DefinitionCardNodeData>) {
  const [editingField, setEditingField] = useState<"heading" | "content" | null>(null);
  const [headingValue, setHeadingValue] = useState(data.heading || data.label);
  const [contentValue, setContentValue] = useState(data.content || "");
  const headingRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingField === "heading" && headingRef.current) { headingRef.current.focus(); headingRef.current.select(); }
    if (editingField === "content" && contentRef.current) { contentRef.current.focus(); }
  }, [editingField]);

  const handleSave = (field: "heading" | "content") => {
    setEditingField(null);
    const el = document.querySelector(`[data-id="${id}"]`);
    if (!el) return;
    if (field === "heading" && headingValue.trim()) {
      el.dispatchEvent(new CustomEvent("node-label-change", { detail: { id, label: headingValue.trim() }, bubbles: true }));
      el.dispatchEvent(new CustomEvent("node-update-field", { detail: { id, field: "heading", value: headingValue.trim() }, bubbles: true }));
    }
    if (field === "content") {
      el.dispatchEvent(new CustomEvent("node-update-field", { detail: { id, field: "content", value: contentValue }, bubbles: true }));
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent, field: "heading" | "content") => {
    if (e.key === "Enter" && field === "heading") { e.preventDefault(); handleSave(field); }
    if (e.key === "Escape") { setEditingField(null); setHeadingValue(data.heading || data.label); setContentValue(data.content || ""); }
  };

  const renderContent = (text: string) => {
    if (!text) return <span className="text-white/30">Click to add content...</span>;
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="text-white/80 font-semibold">{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*")) return <em key={i} className="text-white/60 italic">{part.slice(1, -1)}</em>;
      if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="text-cyan-400 bg-white/5 px-1 rounded text-[11px]">{part.slice(1, -1)}</code>;
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={cn("group relative rounded-2xl transition-all duration-300 cursor-pointer border backdrop-blur-xl", selected ? "border-white/25 shadow-2xl scale-[1.02]" : "border-white/10 shadow-lg hover:shadow-xl hover:scale-[1.01]")}
      style={{ background: `linear-gradient(135deg, ${data.color}18, ${data.color}08)`, minWidth: "280px", maxWidth: "360px", boxShadow: selected ? `0 8px 32px ${data.color}30` : `0 4px 20px rgba(0,0,0,0.3)` }}
      onDoubleClick={(e) => { e.stopPropagation(); setEditingField("heading"); setHeadingValue(data.heading || data.label); }}>
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-white/20 !border-2 !border-white/30 !-top-1.5 hover:!bg-white/40 transition-colors" />
      <div className="px-4 pt-3 pb-1"><span className="text-[9px] font-mono tracking-widest text-white/25 uppercase">Definition</span></div>
      <div className="px-4 pb-2">
        {editingField === "heading" ? (
          <input ref={headingRef} value={headingValue} onChange={(e) => setHeadingValue(e.target.value)} onBlur={() => handleSave("heading")} onKeyDown={(e) => handleKeyDown(e, "heading")}
            className="w-full bg-transparent border-b border-white/20 outline-none text-sm font-bold text-white/90 placeholder:text-white/20" placeholder="Enter heading..." autoFocus />
        ) : (
          <h3 className="text-sm font-bold text-white/90 leading-snug">{renderContent(data.heading || data.label)}</h3>
        )}
      </div>
      <div className="mx-4 h-px bg-white/10" />
      <div className="px-4 py-3">
        {editingField === "content" ? (
          <textarea ref={contentRef} value={contentValue} onChange={(e) => setContentValue(e.target.value)} onBlur={() => handleSave("content")} onKeyDown={(e) => handleKeyDown(e, "content")}
            className="w-full bg-transparent outline-none text-[11px] text-white/60 placeholder:text-white/20 leading-relaxed resize-none min-h-[60px]" placeholder="Enter definition content..." rows={4} autoFocus />
        ) : (
          <p className="text-[11px] text-white/60 leading-relaxed cursor-text min-h-[40px]" onClick={(e) => { e.stopPropagation(); setEditingField("content"); setContentValue(data.content || ""); }}>
            {data.content ? renderContent(data.content) : <span className="text-white/20 italic">Click to add content...</span>}
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-white/20 !border-2 !border-white/30 !-bottom-1.5 hover:!bg-white/40 transition-colors" />
    </div>
  );
}

export const DefinitionCardNode = memo(DefinitionCardNodeComponent);
