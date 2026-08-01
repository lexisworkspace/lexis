"use client";
import { useCallback, useState, useRef, useEffect } from "react";
import ReactFlow, { addEdge, useNodesState, useEdgesState, Controls, Background, BackgroundVariant, MiniMap, ReactFlowProvider, useReactFlow, type Connection, type Node, type Edge, type NodeTypes, type EdgeTypes } from "reactflow";
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
import { PropertiesPanel } from "./panels/PropertiesPanel";

const nodeTypes: NodeTypes = { simple: SimpleNode, rich: RichContentNode, group: GroupContainerNode, definition: DefinitionCardNode };
const edgeTypes: EdgeTypes = { curved: CurvedEdge };
const NODE_EMOJIS: Record<string, string> = { simple: "📝", rich: "📚", group: "📦", definition: "📖" };

interface MindMapFlowProps { mapId: string | null; onMapUpdate: (map: MindMap) => void; }

function MindMapFlow({ mapId, onMapUpdate }: MindMapFlowProps) {
  const reactFlow = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [currentMapName, setCurrentMapName] = useState("Untitled Map");
  const histRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([[], []]);
  const [histIdx, setHistIdx] = useState(0);
  const canUndo = histIdx > 0;
  const canRedo = histIdx < histRef.current.length - 1;

  const pushH = useCallback((ns: Node[], es: Edge[]) => {
    const slice = histRef.current.slice(0, histIdx + 1);
    histRef.current = [...slice, { nodes: ns, edges: es }];
    setHistIdx(histIdx + 1);
  }, [histIdx]);

  useEffect(() => {
    if (!mapId) {
      setNodes([{ id: "root", type: "simple", position: { x: 400, y: 300 }, data: { label: "Central Idea", color: "#06b6d4", emoji: "🧠", isRoot: true, nodeType: "simple" } }]);
      setEdges([]);
      return;
    }
    const maps = storage.getMaps();
    const map = maps.find((m) => m.id === mapId);
    if (map) { setNodes(map.nodes as Node[]); setEdges(map.edges as Edge[]); setCurrentMapName(map.name); }
  }, [mapId, setNodes, setEdges]);

  useEffect(() => {
    if (mapId) {
      const maps = storage.getMaps();
      const idx = maps.findIndex((m) => m.id === mapId);
      if (idx >= 0) {
        maps[idx] = { ...maps[idx], nodes: nodes as any, edges: edges as any };
        storage.setMaps(maps);
        onMapUpdate(maps[idx]);
      }
    }
  }, [nodes, edges, mapId, onMapUpdate]);

  useEffect(() => {
    const handlers: { e: string; h: (ev: Event) => void }[] = [
      { e: "node-label-change", h: (ev: Event) => { const { id, label } = (ev as CustomEvent).detail; setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label } } : n)); } },
      { e: "node-add-block", h: (ev: Event) => { const { id, block } = (ev as CustomEvent).detail; setNodes(nds => nds.map(n => { if (n.id !== id) return n; const d = n.data as any; return { ...n, data: { ...d, richContent: [...(d.richContent || []), block] } }; })); } },
      { e: "node-update-block", h: (ev: Event) => { const { id, blockId, updates } = (ev as CustomEvent).detail; setNodes(nds => nds.map(n => { if (n.id !== id) return n; const d = n.data as any; return { ...n, data: { ...d, richContent: (d.richContent || []).map((b: any) => b.id === blockId ? { ...b, ...updates } : b) } }; })); } },
      { e: "node-delete-block", h: (ev: Event) => { const { id, blockId } = (ev as CustomEvent).detail; setNodes(nds => nds.map(n => { if (n.id !== id) return n; const d = n.data as any; return { ...n, data: { ...d, richContent: (d.richContent || []).filter((b: any) => b.id !== blockId) } }; })); } },
      { e: "node-update-field", h: (ev: Event) => { const { id, field, value } = (ev as CustomEvent).detail; setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n)); } },
    ];
    handlers.forEach(({ e, h }) => document.addEventListener(e, h));
    return () => handlers.forEach(({ e, h }) => document.removeEventListener(e, h));
  }, [setNodes]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (document.activeElement && (document.activeElement as HTMLElement).tagName !== "BODY") return;
        const selected = reactFlow.getNodes().find((n) => n.selected);
        if (selected) {
          setNodes((nds) => nds.filter((n) => n.id !== selected.id));
          setEdges((eds) => eds.filter((e) => e.source !== selected.id && e.target !== selected.id));
          setSelectedNode(null);
          setShowProperties(false);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        const selected = reactFlow.getNodes().find((n) => n.selected);
        if (selected) navigator.clipboard.writeText(JSON.stringify(selected, null, 2));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        navigator.clipboard.readText().then((text) => {
          try {
            const copied: Node = JSON.parse(text);
            const newNode = { ...copied, id: generateId(), position: { x: copied.position.x + 50, y: copied.position.y + 50 } };
            setNodes((nds) => [...nds, newNode]);
          } catch {}
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [reactFlow, setNodes, setEdges, histIdx]);

  const handleUndo = useCallback(() => {
    if (histIdx <= 0) return;
    const prev = histRef.current[histIdx - 1];
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setHistIdx(histIdx - 1);
  }, [histIdx, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (histIdx >= histRef.current.length - 1) return;
    const next = histRef.current[histIdx + 1];
    setNodes(next.nodes);
    setEdges(next.edges);
    setHistIdx(histIdx + 1);
  }, [histIdx, setNodes, setEdges]);

  const onConnect = useCallback((connection: Connection) => {
    const newEdge = { ...connection, id: `e-${connection.source}-${connection.target}`, type: "curved", animated: false, data: { color: "#ffffff20", strokeWidth: 2 } };
    setEdges((eds) => addEdge(newEdge, eds));
    pushH(nodes, [...edges, newEdge]);
  }, [setEdges, nodes, edges, pushH]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => { setSelectedNode(node); setShowProperties(true); }, []);
  const onPaneClick = useCallback(() => { setSelectedNode(null); setShowProperties(false); }, []);

  const addNode = useCallback((type: "simple" | "rich" | "group" | "definition") => {
    const newNode: Node = {
      id: generateId(), type,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
        color: "#a1a1aa", emoji: NODE_EMOJIS[type], nodeType: type,
        ...(type === "rich" ? { richContent: [] } : {}),
        ...(type === "definition" ? { heading: "Definition", content: "Enter definition..." } : {}),
        ...(type === "group" ? { children: [] } : {}),
      },
    };
    setNodes((nds) => [...nds, newNode]);
    pushH([...nodes, newNode], edges);
  }, [setNodes, nodes, edges, pushH]);

  const deleteSelected = useCallback(() => {
    const selected = nodes.find((n) => n.selecte
