"use client";
import { useState, useEffect, useCallback } from "react";
import { X, Palette, Trash2, Copy, Type, FileText, Box, Circle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Node } from "reactflow";

export interface NodeData {
  label: string;
  color: string;
  emoji?: string;
  isRoot?: boolean;
  nodeType: "simple" | "rich" | "group" | "definition";
  richContent?: Array<{ id: string; type: string; text?: string; items?: string[] }>;
  heading?: string;
  content?: string;
  children?: string[];
  [key: string]: unknown;
}

const NODE_COLORS = [
  { name: "Zinc", value: "#a1a1aa" }, { name: "Cyan", value: "#06b6d4" }, { name: "Emerald", value: "#10b981" },
  { name: "Amber", value: "#f59e0b" }, { name: "Red", value: "#ef4444" }, { name: "Pink", value: "#ec4899" },
  { name: "Purple", value: "#a855f7" }, { name: "Blue", value: "#3b82f6" }, { name: "Teal", value: "#14b8a6" },
  { name: "Orange", value: "#f97316" }, { name: "Lime", value: "#84cc16" }, { name: "Rose", value: "#f43f5e" },
];

const NODE_EMOJIS = ["💡", "🎯", "📝", "🔥", "⚡", "🌟", "🎨", "📊", "🗂️", "🚀", "💪", "🧩", "🤖", "📚", "✨", "🔑", "🧠", "❤️"];
const NODE_TYPE_ICONS: Record<string, any> = { simple: Circle, rich: FileText, group: Box, definition: Type };
const NODE_TYPE_LABELS: Record<string, string> = { simple: "Simple Node", rich: "Rich Content", group: "Group Container", definition: "Definition Card" };

interface PropertiesPanelProps {
  node: Node<NodeData> | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<NodeData>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onChangeType: (id: string, type: NodeData["nodeType"]) => void;
}

export function PropertiesPanel({ node, onClose, onUpdate, onDelete, onDuplicate, onChangeType }: PropertiesPanelProps) {
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => { if (node) { setLabel(node.data.label || ""); setEmoji(node.data.emoji || ""); } }, [node?.id]);

  const handleLabelChange = useCallback((value: string) => { setLabel(value); if (node) onUpdate(node.id, { label: value }); }, [node, onUpdate]);
  const handleEmojiChange = useCallback((value: string) => { setEmoji(value); if (node) onUpdate(node.id, { emoji: value }); setShowEmojiPicker(false); }, [node, onUpdate]);
  const handleColorChange = useCallback((color: string) => { if (node) onUpdate(node.id, { color }); }, [node, onUpdate]);
  const handleTypeChange = useCallback((type: NodeData["nodeType"]) => { if (node) onChangeType(node.id, type); }, [node, onChangeType]);

  if (!node) return null;
  const NodeTypeIcon = NODE_TYPE_ICONS[node.data.nodeType] || Circle;

  return (
    <div className="absolute top-4 right-4 z-20 w-72 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2"><NodeTypeIcon className="h-4 w-4 text-white/60" /><h3 className="text-sm font-semibold text-white/90">Properties</h3></div>
        <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="text-[10px] font-mono tracking-wider text-white/30 uppercase mb-1.5 block">Label</label>
          <input value={label} onChange={(e) => handleLabelChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-white/30 transition-colors" placeholder="Enter label..." />
        </div>
        <div>
          <label className="text-[10px] font-mono tracking-wider text-white/30 uppercase mb-1.5 block">Emoji</label>
          <div className="relative">
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="w-full flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors">
              {emoji ? <span className="text-lg">{emoji}</span> : <span className="text-white/20">Choose emoji...</span>}
              <ChevronDown className="h-3 w-3 text-white/40 ml-auto" />
            </button>
            {showEmojiPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl z-50">
                <div className="grid grid-cols-9 gap-1 max-h-32 overflow-y-auto">
                  {NODE_EMOJIS.map((e) => (<button key={e} onClick={() => handleEmojiChange(e)} className={cn("w-8 h-8 flex items-center justify-center rounded-lg text-base hover:bg-white/10 transition-colors", emoji === e && "bg-white/10 ring-1 ring-white/20")}>{e}</button>))}
                </div>
                <button onClick={() => handleEmojiChange("")} className="w-full mt-2 px-3 py-1.5 text-[10px] text-white/40 hover:text-white/60 transition-colors">Remove emoji</button>
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-mono tracking-wider text-white/30 uppercase mb-1.5 block">Color</label>
          <div className="grid grid-cols-6 gap-1.5">
            {NODE_COLORS.map((c) => (
              <button key={c.value} onClick={() => handleColorChange(c.value)} className={cn("w-full aspect-square rounded-lg border-2 transition-all duration-200", node.data.color === c.value ? "border-white/60 scale-110" : "border-transparent hover:border-white/20 hover:scale-105")} style={{ backgroundColor: c.value }} title={c.name} />
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-mono tracking-wider text-white/30 uppercase mb-1.5 block">Node Type</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(NODE_TYPE_LABELS) as Array<NodeData["nodeType"]>).map((type) => {
              const Icon = NODE_TYPE_ICONS[type];
              const isActive = node.data.nodeType === type;
              return (
                <button key={type} onClick={() => handleTypeChange(type)} className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all", isActive ? "bg-white/15 text-white/90 border border-white/20" : "bg-white/5 text-white/50 border border-transparent hover:bg-white/10")}>
                  <Icon className="h-3.5 w-3.5" />{NODE_TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 pt-2 border-t border-white/5">
          <button onClick={() => node && onDuplicate(node.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-white/60 text-xs font-medium hover:bg-white/10 hover:text-white/80 transition-colors"><Copy className="h-3 w-3" /> Duplicate</button>
          {!node.data.isRoot && (<button onClick={() => node && onDelete(node.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400/60 text-xs font-medium hover:bg-red-500/20 hover:text-red-400 transition-colors"><Trash2 className="h-3 w-3" /> Delete</button>)}
        </div>
      </div>
    </div>
  );
}
