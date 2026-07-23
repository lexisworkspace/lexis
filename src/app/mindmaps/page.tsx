"use client";

import { useCallback, useState, useRef, useEffect, type KeyboardEvent as ReactKeyboardEvent } from "react";
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import { Plus, Trash2, Sparkles, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

interface MindMapNodeData {
  label: string;
  description: string;
  color: string;
  emoji?: string;
  isRoot?: boolean;
  [key: string]: unknown;
}

// ============================================================
// Custom Mind Map Node
// ============================================================

function MindMapNode({
  data,
  selected,
  id,
}: {
  data: MindMapNodeData;
  selected: boolean;
  id: string;
}) {
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
      // Update node data via React Flow internals
      const nodeEl = document.querySelector(`[data-id="${id}"]`);
      if (nodeEl) {
        const event = new CustomEvent("node-label-change", {
          detail: { id, label: editValue.trim() },
          bubbles: true,
        });
        nodeEl.dispatchEvent(event);
      }
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setEditing(false);
      setEditValue(data.label);
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-2xl transition-all duration-300 cursor-pointer",
        "backdrop-blur-xl border",
        selected
          ? "border-white/30 shadow-2xl scale-[1.03]"
          : "border-white/10 shadow-lg hover:shadow-xl hover:scale-[1.01]",
        data.isRoot
          ? "px-7 py-4 min-w-[180px]"
          : "px-5 py-3 min-w-[120px]"
      )}
      style={{
        background: data.isRoot
          ? `linear-gradient(135deg, ${data.color}dd, ${data.color}99)`
          : `linear-gradient(135deg, ${data.color}22, ${data.color}11)`,
        boxShadow: selected
          ? `0 8px 32px ${data.color}40, 0 0 0 1px ${data.color}30`
          : `0 4px 16px ${data.color}15`,
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-white/20 !border-2 !border-white/40 !-top-1.5 hover:!bg-white/40 transition-colors"
      />

      <div className="flex items-center gap-2.5">
        {data.emoji && (
          <span className={cn("shrink-0", data.isRoot ? "text-2xl" : "text-lg")}>
            {data.emoji}
          </span>
        )}

        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className={cn(
                "w-full bg-transparent border-b border-white/40 outline-none font-medium",
                data.isRoot ? "text-white text-base" : "text-white/90 text-sm"
              )}
              placeholder="Enter name..."
              autoFocus
            />
          ) : (
            <p
              className={cn(
                "font-semibold truncate",
                data.isRoot ? "text-white text-base" : "text-white/90 text-sm"
              )}
            >
              {data.label}
            </p>
          )}

          {data.description && !editing && (
            <p className="text-[11px] text-white/50 mt-0.5 truncate max-w-[160px]">
              {data.description}
            </p>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-white/20 !border-2 !border-white/40 !-bottom-1.5 hover:!bg-white/40 transition-colors"
      />
    </div>
  );
}

// ============================================================
// Node Types (outside component for performance)
// ============================================================

const nodeTypes: NodeTypes = {
  mindMapNode: MindMapNode,
};

// ============================================================
// Default Data
// ============================================================

const DEFAULT_NODES: Node<MindMapNodeData>[] = [
  {
    id: "root",
    type: "mindMapNode",
    position: { x: 400, y: 40 },
    data: { label: "My Mind Map", description: "Central idea", color: "#a855f7", isRoot: true, emoji: "🧠" },
  },
  {
    id: "ideas",
    type: "mindMapNode",
    position: { x: 100, y: 200 },
    data: { label: "Ideas", description: "Creative concepts", color: "#06b6d4", emoji: "💡" },
  },
  {
    id: "goals",
    type: "mindMapNode",
    position: { x: 400, y: 220 },
    data: { label: "Goals", description: "What I want to achieve", color: "#10b981", emoji: "🎯" },
  },
  {
    id: "notes",
    type: "mindMapNode",
    position: { x: 700, y: 200 },
    data: { label: "Research", description: "Things to explore", color: "#f59e0b", emoji: "📚" },
  },
  {
    id: "idea1",
    type: "mindMapNode",
    position: { x: 0, y: 380 },
    data: { label: "App feature", description: "New functionality idea", color: "#06b6d4", emoji: "⚡" },
  },
  {
    id: "idea2",
    type: "mindMapNode",
    position: { x: 200, y: 400 },
    data: { label: "Blog post", description: "Write about productivity", color: "#06b6d4", emoji: "✍️" },
  },
  {
    id: "goal1",
    type: "mindMapNode",
    position: { x: 340, y: 400 },
    data: { label: "Weekly review", description: "Every Sunday evening", color: "#10b981", emoji: "🔄" },
  },
  {
    id: "goal2",
    type: "mindMapNode",
    position: { x: 520, y: 380 },
    data: { label: "Learn React Flow", description: "Build interactive graphs", color: "#10b981", emoji: "📘" },
  },
  {
    id: "note1",
    type: "mindMapNode",
    position: { x: 680, y: 400 },
    data: { label: "AI trends", description: "Latest developments", color: "#f59e0b", emoji: "🤖" },
  },
];

const DEFAULT_EDGES: Edge[] = [
  { id: "e-root-ideas", source: "root", target: "ideas", animated: true, style: { stroke: "#06b6d480", strokeWidth: 2.5 } },
  { id: "e-root-goals", source: "root", target: "goals", animated: true, style: { stroke: "#10b98180", strokeWidth: 2.5 } },
  { id: "e-root-notes", source: "root", target: "notes", animated: true, style: { stroke: "#f59e0b80", strokeWidth: 2.5 } },
  { id: "e-ideas-idea1", source: "ideas", target: "idea1", style: { stroke: "#06b6d450", strokeWidth: 2 } },
  { id: "e-ideas-idea2", source: "ideas", target: "idea2", style: { stroke: "#06b6d450", strokeWidth: 2 } },
  { id: "e-goals-goal1", source: "goals", target: "goal1", style: { stroke: "#10b98150", strokeWidth: 2 } },
  { id: "e-goals-goal2", source: "goals", target: "goal2", style: { stroke: "#10b98150", strokeWidth: 2 } },
  { id: "e-notes-note1", source: "notes", target: "note1", style: { stroke: "#f59e0b50", strokeWidth: 2 } },
];

const NODE_COLORS = [
  "#a855f7", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6", "#3b82f6",
];

const NODE_EMOJIS = ["💡", "🎯", "📝", "🔥", "⚡", "🌟", "🎨", "📊", "🗂️", "🚀", "💪", "🧩", "🤖", "📚", "✨", "🔑", "🛠️", "📌"];

// ============================================================
// Description Panel
// ============================================================

function DescriptionPanel({
  node,
  onClose,
  onSave,
}: {
  node: Node<MindMapNodeData> | null;
  onClose: () => void;
  onSave: (id: string, description: string) => void;
}) {
  const [desc, setDesc] = useState(node?.data.description || "");

  useEffect(() => {
    setDesc(node?.data.description || "");
  }, [node?.id]);

  if (!node) return null;

  return (
    <div className="absolute top-4 right-4 z-20 w-72 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {node.data.emoji && <span className="text-lg">{node.data.emoji}</span>}
          <h3 className="text-sm font-semibold text-white">{node.data.label}</h3>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-mono tracking-wider text-white/30 uppercase mb-1.5 block">Description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Add a description..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-white/30 transition-colors resize-none"
            rows={3}
          />
        </div>
        <button
          onClick={() => {
            onSave(node.id, desc);
            onClose();
          }}
          className="w-full px-3 py-2 rounded-xl bg-white/10 text-white/80 text-xs font-medium hover:bg-white/20 transition-colors"
        >
          Save Description
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Toolbar
// ============================================================

function MindMapToolbar({
  onAddNode,
  onAutoLayout,
  onDeleteSelected,
  selectedNodeId,
  onOpenDescription,
  hasSelected,
}: {
  onAddNode: () => void;
  onAutoLayout: () => void;
  onDeleteSelected: () => void;
  selectedNodeId: string | null;
  onOpenDescription: () => void;
  hasSelected: boolean;
}) {
  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
      <button
        onClick={onAddNode}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-lg hover:bg-white/10 transition-all duration-200 text-sm font-medium text-white/80"
        title="Add node"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Add Node</span>
      </button>

      <button
        onClick={onAutoLayout}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-lg hover:bg-white/10 transition-all duration-200 text-sm font-medium text-white/80"
        title="Auto-arrange"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">Arrange</span>
      </button>

      {hasSelected && (
        <button
          onClick={onOpenDescription}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-lg hover:bg-white/10 transition-all duration-200 text-sm font-medium text-white/80"
          title="Edit description"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Details</span>
        </button>
      )}

      {hasSelected && selectedNodeId !== "root" && (
        <button
          onClick={onDeleteSelected}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/20 backdrop-blur-xl border border-red-500/20 text-red-400 shadow-lg hover:bg-red-500/30 transition-all duration-200 text-sm font-medium"
          title="Delete selected node"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Delete</span>
        </button>
      )}
    </div>
  );
}

// ============================================================
// Main Mind Map Component
// ============================================================

function MindMapFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEFAULT_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [descriptionNode, setDescriptionNode] = useState<Node<MindMapNodeData> | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();



  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: false,
            style: { stroke: "#ffffff30", strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const addNode = useCallback(() => {
    const id = generateId();
    const color = NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)];
    const emoji = NODE_EMOJIS[Math.floor(Math.random() * NODE_EMOJIS.length)];

    const position = screenToFlowPosition({
      x: (reactFlowWrapper.current?.clientWidth || 800) / 2,
      y: (reactFlowWrapper.current?.clientHeight || 500) / 2,
    });

    const newNode: Node<MindMapNodeData> = {
      id,
      type: "mindMapNode",
      position,
      data: { label: "New Idea", description: "", color, emoji },
    };

    setNodes((nds) => [...nds, newNode]);

    const connectTo = selectedNodeId || "root";
    const newEdge: Edge = {
      id: `e-${connectTo}-${id}`,
      source: connectTo,
      target: id,
      style: { stroke: `${color}50`, strokeWidth: 2 },
    };
    setEdges((eds) => [...eds, newEdge]);
  }, [screenToFlowPosition, selectedNodeId, setNodes, setEdges]);

  const deleteSelected = useCallback(() => {
    if (!selectedNodeId || selectedNodeId === "root") return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

  const openDescription = useCallback(() => {
    if (!selectedNodeId) return;
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (node) setDescriptionNode(node as Node<MindMapNodeData>);
  }, [selectedNodeId, nodes]);

  const saveDescription = useCallback(
    (id: string, description: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, description } } : n
        )
      );
    },
    [setNodes]
  );

  const autoLayout = useCallback(() => {
    const rootNode = nodes.find((n) => n.id === "root");
    if (!rootNode) return;

    const childEdges = edges.filter((e) => e.source === "root");
    const children = childEdges.map((e) => nodes.find((n) => n.id === e.target)).filter(Boolean) as Node[];

    const centerX = 400;
    const startY = 220;
    const spacing = 220;

    const updatedNodes = nodes.map((n) => {
      if (n.id === "root") return { ...n, position: { x: centerX, y: 40 } };

      const childIndex = children.findIndex((c) => c.id === n.id);
      if (childIndex >= 0) {
        const x = centerX + (childIndex - (children.length - 1) / 2) * spacing;
        return { ...n, position: { x, y: startY } };
      }

      const parentEdge = edges.find((e) => e.target === n.id);
      if (parentEdge) {
        const parentIndex = children.findIndex((c) => c.id === parentEdge.source);
        if (parentIndex >= 0) {
          const siblings = edges.filter((e) => e.source === parentEdge.source);
          const sibIndex = siblings.findIndex((s) => s.target === n.id);
          const parentX = centerX + (parentIndex - (children.length - 1) / 2) * spacing;
          const x = parentX + (sibIndex - (siblings.length - 1) / 2) * 140;
          return { ...n, position: { x, y: startY + 170 } };
        }
      }

      return n;
    });

    setNodes(updatedNodes);
  }, [nodes, edges, setNodes]);

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full relative rounded-2xl overflow-hidden border border-white/10"
      style={{
        background: "linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)",
      }}
    >
      <MindMapToolbar
        onAddNode={addNode}
        onAutoLayout={autoLayout}
        onDeleteSelected={deleteSelected}
        selectedNodeId={selectedNodeId}
        onOpenDescription={openDescription}
        hasSelected={!!selectedNodeId}
      />

      <DescriptionPanel
        node={descriptionNode}
        onClose={() => setDescriptionNode(null)}
        onSave={saveDescription}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          style: { stroke: "#ffffff20", strokeWidth: 2 },
          type: "smoothstep",
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#ffffff08" />
        <Controls
          className="!rounded-xl !border !border-white/10 !shadow-lg !bg-black/40 !backdrop-blur-xl [&>button]:!bg-transparent [&>button]:!border-white/10 [&>button]:!text-white/60 [&>button:hover]:!bg-white/10"
          showInteractive={false}
        />
      </ReactFlow>

      {/* Help text */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <p className="text-[11px] text-white/30 bg-black/40 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/10">
          Double-click node to rename · Click "Details" to add description · Drag to connect
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Page Export
// ============================================================

export default function MindMapsPage() {
  return (
    <div className="h-[calc(100vh-6rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Mind Maps</h1>
        <p className="text-sm text-muted-foreground mt-1">Visualize your thoughts. Double-click to rename, drag to connect.</p>
      </div>
      <div className="h-[calc(100%-4rem)]">
        <ReactFlowProvider>
          <MindMapFlow />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
