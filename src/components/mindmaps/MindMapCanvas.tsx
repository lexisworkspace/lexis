"use client";
import { useCallback, useState, useRef, useEffect } from "react";
import ReactFlow, {
  addEdge, useNodesState, useEdgesState, Controls, Background, BackgroundVariant,
  MiniMap, ReactFlowProvider, useReactFlow, type Connection, type Node, type Edge,
  type NodeTypes, type EdgeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import { generateId } from "@/lib/utils";
import { storage } from "@/lib/storage";
import { MindMap } from "@/types";
import { SimpleNode } from "./nodes/SimpleNode";
import { RichContentNode } from "./nodes/RichContentNode";
import { GroupContainerNode } from "./nodes/GroupContainerNode";
import { DefinitionCardNode } from "./nodes/DefinitionCardNode";
import { CurvedEdge } from "./edges/CurvedEdge";
import { applyTreeLayout, applyRadialLayout, applyForceLayout } from "./layout/algorithms";
import { MindMapToolbar } from "./toolbar/MindMapToolbar";
import { PropertiesPanel, type NodeData } from "./panels/PropertiesPanel";

const nodeTypes: NodeTypes = { simple: SimpleNode, rich: RichContentNode, group: GroupContainerNode, definition: DefinitionCardNode };
const edgeTypes: EdgeTypes = { curved: CurvedEdge };
const NODE_COLORS = ["#a1a1aa","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#a855f7","#3b82f6","#14b8a6"];
const NODE_EMOJIS = ["\ud83d\udca1","\ud83c\udfaf","\ud83d\udcdd","\ud83d\udd25","\u26a1","\ud83c\udf1f","\ud83c\udfa8","\ud83d\udcca","\ud83d\uddc2\ufe0f","\ud83d\ude80","\ud83d\udcaa","\ud83e\udd29"];

function defaultNodes(): Node[] {
  return [
    { id: "root", type: "simple", position: { x: 400, y: 40 }, data: { label: "Central Idea", color: "#a1a1aa", isRoot: true, nodeType: "simple", emoji: "\ud83e\udde0" } },
    { id: "b1", type: "simple", position: { x: 100, y: 200 }, data: { label: "Topic A", color: "#06b6d4", nodeType: "simple", emoji: "\ud83d\udca1" } },
    { id: "b2", type: "simple", position: { x: 400, y: 200 }, data: { label: "Topic B", color: "#10b981", nodeType: "simple", emoji: "\ud83c\udfaf" } },
    { id: "b3", type: "simple", position: { x: 700, y: 200 }, data: { label: "Topic C", color: "#f59e0b", nodeType: "simple", emoji: "\ud83d\udcdd" } },
    { id: "s1", type: "rich", position: { x: 0, y: 400 }, data: { label: "Key Concept", color: "#06b6d4", nodeType: "rich", richContent: [{ id: "blk1", type: "heading", text: "Key Concept" }, { id: "blk2", type: "paragraph", text: "Important details about this concept." }] } },
    { id: "s2", type: "definition", position: { x: 250, y: 420 }, data: { label: "Definition", color: "#06b6d4", nodeType: "definition", heading: "What is this?", content: "A fundamental concept." } },
    { id: "s3", type: "simple", position: { x: 400, y: 400 }, data: { label: "Action Item", color: "#10b981", nodeType: "simple", emoji: "\u26a1" } },
    { id: "s4", type: "simple", position: { x: 550, y: 400 }, data: { label: "Research", color: "#10b981", nodeType: "simple", emoji: "\ud83d\udcda" } },
    { id: "s5", type: "simple", position: { x: 700, y: 400 }, data: { label: "Notes", color: "#f59e0b", nodeType: "simple", emoji: "\ud83d\udcdd" } },
    { id: "s6", type: "simple", position: { x: 850, y: 400 }, data: { label: "Summary", color: "#f59e0b", nodeType: "simple", emoji: "\ud83d\udcca" } },
  ];
}

function defaultEdges(): Edge[] {
  return [
    { id: "e-r-b1", source: "root", target: "b1", type: "curved", animated: true, data: { color: "#06b6d480" }, style: { stroke: "#06b6d480" } },
    { id: "e-r-b2", source: "root", target: "b2", type: "curved", animated: true, data: { color: "#10b98180" }, style: { stroke: "#10b98180" } },
    { id: "e-r-b3", source: "root", target: "b3", type: "curved", animated: true, data: { color: "#f59e0b80" }, style: { stroke: "#f59e0b80" } },
    { id: "e-b1-s1", source: "b1", target: "s1", type: "curved", data: { color: "#06b6d450" }, style: { stroke: "#06b6d450" } },
    { id: "e-b1-s2", source: "b1", target: "s2", type: "curved", data: { color: "#06b6d450" }, style: { stroke: "#06b6d450" } },
    { id: "e-b2-s3", source: "b2", target: "s3", type: "curved", data: { color: "#10b98150" }, style: { stroke: "#10b98150" } },
    { id: "e-b2-s4", source: "b2", target: "s4", type: "curved", data: { color: "#10b98150" }, style: { stroke: "#10b98150" } },
    { id: "e-b3-s5", source: "b3", target: "s5", type: "curved", data: { color: "#f59e0b50" }, style: { stroke: "#f59e0b50" } },
    { id: "e-b3-s6", source: "b3", target: "s6", type: "curved", data: { color: "#f59e0b50" }, style: { stroke: "#f59e0b50" } },
  ];
}

function MindMapFlow() {
  const mapRef = useRef<MindMap | null>(storage.getMindMaps()[0] || null);
  const [nodes, setNodes, onNodesChange] = useNodesState((mapRef.current?.nodes as Node[]) || defaultNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState((mapRef.current?.edges as Edge[]) || defaultEdges());
  const [selId, setSelId] = useState<string | null>(null);
  const [showProps, setShowProps] = useState(false);
  const [mapName, setMapName] = useState(mapRef.current?.name || "My Mind Map");
  const [hist, setHist] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const histIdxRef = useRef(histIdx);
  const histRef = useRef(hist);
  const { screenToFlowPosition, fitView, zoomIn, zoomOut } = useReactFlow();

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { histIdxRef.current = histIdx; }, [histIdx]);
  useEffect(() => { histRef.current = hist; }, [hist]);

  const pushHist = useCallback(() => {
    const idx = histIdxRef.current;
    setHist(prev => { const h = prev.slice(0, idx + 1); h.push({ nodes: nodesRef.current, edges: edgesRef.current }); return h.slice(-50); });
    setHistIdx(prev => Math.min(prev + 1, 49));
  }, []);

  useEffect(() => { if (mapRef.current) storage.updateMindMap(mapRef.current.id, { nodes: nodes as any, edges: edges as any }); }, [nodes, edges]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const i = histIdxRef.current;
        if (i > 0) { const p = histRef.current[i - 1]; setNodes(p.nodes); setEdges(p.edges); setHistIdx(i - 1); }
      }
      if (mod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        const i = histIdxRef.current;
        if (i < histRef.current.length - 1) { const n = histRef.current[i + 1]; setNodes(n.nodes); setEdges(n.edges); setHistIdx(i + 1); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setNodes, setEdges]);

  useEffect(() => {
    const hs = [
      { e: "node-label-change", h: (ev: Event) => { const { id, label } = (ev as CustomEvent).detail; setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label } } : n)); } },
      { e: "node-add-block", h: (ev: Event) => { const { id, block } = (ev as CustomEvent).detail; setNodes(nds => nds.map(n => { if (n.id !== id) return n; const d = n.data as any; return { ...n, data: { ...d, richContent: [...(d.richContent || []), block] } }; })); } },
      { e: "node-update-block", h: (ev: Event) => { const { id, blockId, updates } = (ev as CustomEvent).detail; setNodes(nds => nds.map(n => { if (n.id !== id) return n; const d = n.data as any; return { ...n, data: { ...d, richContent: (d.richContent || []).map((b: any) => b.id === blockId ? { ...b, ...updates } : b) } }; })); } },
      { e: "node-delete-block", h: (ev: Event) => { const { id, blockId } = (ev as CustomEvent).detail; setNodes(nds => nds.map(n => { if (n.id !== id) return n; const d = n.data as any; return { ...n, data: { ...d, richContent: (d.richContent || []).filter((b: any) => b.id !== blockId) } }; })); } },
      { e: "node-update-field", h: (ev: Event) => { const { id, field, value } = (ev as CustomEvent).detail; setNodes(nds => nds.map(n
