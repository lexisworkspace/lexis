"use client";

import { useCallback, useState, useRef } from "react";
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
  type OnNodesChange,
  type OnEdgesChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { Plus, Trash2, Download, Palette, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/utils";

// ============================================================
// Custom Mind Map Node
// ============================================================

interface MindMapNodeData {
  label: string;
  color: string;
  emoji?: string;
  isRoot?: boolean;
}

function MindMapNode({ data, selected }: { data: MindMapNodeData; selected: boolean }) {
  return (
    <div
      className={cn(
        "px-4 py-2.5 rounded-2xl shadow-lg transition-all duration-200 cursor-pointer",
        "border-2 hover:shadow-xl hover:scale-[1.02]",
        selected ? "border-primary-500 shadow-primary-500/20" : "border-transparent",
        data.isRoot
          ? "bg-gradient-to-br from-primary-500 to-primary-600 text-white font-bold text-base px-6 py-3"
          : "bg-background text-foreground font-medium text-sm"
      )}
      style={data.isRoot ? {} : { borderColor: selected ? undefined : data.color + "40" }}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-2 !h-2" />
      <div className="flex items-center gap-2">
        {data.emoji && <span className="text-lg">{data.emoji}</span>}
        <span>{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-2 !h-2" />
    </div>
  );
}

// ============================================================
// Default Data
// ============================================================

const DEFAULT_NODES: Node<MindMapNodeData>[] = [
  {
    id: "root",
    type: "mindMapNode",
    position: { x: 400, y: 50 },
    data: { label: "My Mind Map", color: "#a855f7", isRoot: true, emoji: "🧠" },
  },
  {
    id: "ideas",
    type: "mindMapNode",
    position: { x: 150, y: 200 },
    data: { label: "Ideas", color: "#06b6d4", emoji: "💡" },
  },
  {
    id: "goals",
    type: "mindMapNode",
    position: { x: 450, y: 220 },
    data: { label: "Goals", color: "#10b981", emoji: "🎯" },
  },
  {
    id: "notes",
    type: "mindMapNode",
    position: { x: 720, y: 200 },
    data: { label: "Notes", color: "#f59e0b", emoji: "📝" },
  },
  {
    id: "idea1",
    type: "mindMapNode",
    position: { x: 50, y: 380 },
    data: { label: "App concept", color: "#06b6d4" },
  },
  {
    id: "idea2",
    type: "mindMapNode",
    position: { x: 250, y: 370 },
    data: { label: "Blog post", color: "#06b6d4" },
  },
  {
    id: "goal1",
    type: "mindMapNode",
    position: { x: 370, y: 400 },
    data: { label: "Weekly review", color: "#10b981" },
  },
  {
    id: "goal2",
    type: "mindMapNode",
    position: { x: 530, y: 380 },
    data: { label: "Learn React Flow", color: "#10b981" },
  },
];

const DEFAULT_EDGES: Edge[] = [
  { id: "e-root-ideas", source: "root", target: "ideas", animated: true, style: { stroke: "#06b6d4", strokeWidth: 2 } },
  { id: "e-root-goals", source: "root", target: "goals", animated: true, style: { stroke: "#10b981", strokeWidth: 2 } },
  { id: "e-root-notes", source: "root", target: "notes", animated: true, style: { stroke: "#f59e0b", strokeWidth: 2 } },
  { id: "e-ideas-idea1", source: "ideas", target: "idea1", style: { stroke: "#06b6d4", strokeWidth: 1.5 } },
  { id: "e-ideas-idea2", source: "ideas", target: "idea2", style: { stroke: "#06b6d4", strokeWidth: 1.5 } },
  { id: "e-goals-goal1", source: "goals", target: "goal1", style: { stroke: "#10b981", strokeWidth: 1.5 } },
  { id: "e-goals-goal2", source: "goals", target: "goal2", style: { stroke: "#10b981", strokeWidth: 1.5 } },
];

const NODE_COLORS = [
  "#a855f7", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6",
];

const NODE_EMOJIS = ["💡", "🎯", "📝", "🔥", "⚡", "🌟", "🎨", "📊", "🗂️", "🚀", "💪", "🧩"];

// ============================================================
// Toolbar
// ============================================================

function MindMapToolbar({
  onAddNode,
  onAutoLayout,
  onDeleteSelected,
  selectedNodeId,
}: {
  onAddNode: () => void;
  onAutoLayout: () => void;
  onDeleteSelected: () => void;
  selectedNodeId: string | null;
}) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [color, setColor] = useState("#06b6d4");
  const [emoji, setEmoji] = useState("💡");

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
      <button
        onClick={onAddNode}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-border shadow-lg hover:bg-secondary transition-all duration-200 text-sm font-medium"
        title="Add node"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Add Node</span>
      </button>

      <button
        onClick={onAutoLayout}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-border shadow-lg hover:bg-secondary transition-all duration-200 text-sm font-medium"
        title="Auto-arrange"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">Arrange</span>
      </button>

      {selectedNodeId && selectedNodeId !== "root" && (
        <button
          onClick={onDeleteSelected}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 shadow-lg hover:bg-red-500/20 transition-all duration-200 text-sm font-medium"
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
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodeTypes: NodeTypes = {
    mindMapNode: MindMapNode,
  };

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: false,
            style: { stroke: "#a1a1aa", strokeWidth: 1.5 },
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
      data: { label: "New Idea", color, emoji },
    };

    setNodes((nds) => [...nds, newNode]);

    // Auto-connect to selected node or root
    const connectTo = selectedNodeId || "root";
    const newEdge: Edge = {
      id: `e-${connectTo}-${id}`,
      source: connectTo,
      target: id,
      style: { stroke: color, strokeWidth: 1.5 },
    };
    setEdges((eds) => [...eds, newEdge]);
  }, [screenToFlowPosition, selectedNodeId, setNodes, setEdges]);

  const deleteSelected = useCallback(() => {
    if (!selectedNodeId || selectedNodeId === "root") return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges]);

  const autoLayout = useCallback(() => {
    const rootNode = nodes.find((n) => n.id === "root");
    if (!rootNode) return;

    const childEdges = edges.filter((e) => e.source === "root");
    const children = childEdges.map((e) => nodes.find((n) => n.id === e.target)).filter(Boolean) as Node[];

    const centerX = 400;
    const startY = 220;
    const spacing = 200;

    // Position direct children in an arc
    const updatedNodes = nodes.map((n) => {
      if (n.id === "root") return { ...n, position: { x: centerX, y: 50 } };

      const childIndex = children.findIndex((c) => c.id === n.id);
      if (childIndex >= 0) {
        const x = centerX + (childIndex - (children.length - 1) / 2) * spacing;
        return { ...n, position: { x, y: startY } };
      }

      // Position grandchildren
      const parentEdge = edges.find((e) => e.target === n.id);
      if (parentEdge) {
        const parentIndex = children.findIndex((c) => c.id === parentEdge.source);
        if (parentIndex >= 0) {
          const siblings = edges.filter((e) => e.source === parentEdge.source && e.target !== n.id);
          const sibIndex = siblings.findIndex((s) => s.target === n.id);
          const parentX = centerX + (parentIndex - (children.length - 1) / 2) * spacing;
          const x = parentX + ((sibIndex + 1) - (siblings.length + 1) / 2) * 120;
          return { ...n, position: { x, y: startY + 160 } };
        }
      }

      return n;
    });

    setNodes(updatedNodes);
  }, [nodes, edges, setNodes]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative rounded-2xl overflow-hidden border border-border bg-background">
      <MindMapToolbar
        onAddNode={addNode}
        onAutoLayout={autoLayout}
        onDeleteSelected={deleteSelected}
        selectedNodeId={selectedNodeId}
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
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          style: { stroke: "#a1a1aa", strokeWidth: 1.5 },
          type: "smoothstep",
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#a1a1aa20" />
        <Controls
          className="!rounded-xl !border !border-border !shadow-lg !bg-background"
          showInteractive={false}
        />
      </ReactFlow>

      {/* Help text */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <p className="text-[11px] text-muted-foreground/40 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border border-border/50">
          Double-click canvas to add • Drag between nodes to connect • Scroll to zoom
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
        <p className="text-sm text-muted-foreground mt-1">Organize your thoughts visually. Connect ideas, map concepts, and explore relationships.</p>
      </div>
      <div className="h-[calc(100%-4rem)]">
        <ReactFlowProvider>
          <MindMapFlow />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
