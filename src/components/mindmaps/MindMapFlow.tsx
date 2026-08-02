"use client";
import { useCallback, useState, useRef, useEffect } from 'react';
import ReactFlow, {
  addEdge, useNodesState, useEdgesState, Controls, Background,
  BackgroundVariant, MiniMap, useReactFlow,
  type Connection, type Node, type Edge, type NodeTypes, type EdgeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { generateId } from '@/lib/utils';
import { storage } from '@/lib/storage';
import { MindMap } from '@/types';
import { SimpleNode } from './nodes/SimpleNode';
import { RichContentNode } from './nodes/RichContentNode';
import { GroupContainerNode } from './nodes/GroupContainerNode';
import { DefinitionCardNode } from './nodes/DefinitionCardNode';
import { CurvedEdge } from './edges/CurvedEdge';
import { applyTreeLayout, applyRadialLayout, applyForceLayout } from './layout/algorithms';
import { MindMapToolbar } from './toolbar/MindMapToolbar';

const NT: NodeTypes = { simple: SimpleNode, rich: RichContentNode, group: GroupContainerNode, definition: DefinitionCardNode };
const ET: EdgeTypes = { curved: CurvedEdge };

interface Props { mapId: string | null; onMapUpdate: (map: MindMap) => void; }

export function MindMapFlow({ mapId, onMapUpdate }: Props) {
  const rf = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [mn, setMn] = useState('Untitled Map');
  const hRef = useRef<{ n: Node[]; e: Edge[] }[]>([] as { n: Node[]; e: Edge[] }[]);
  const [hi, setHi] = useState(0);

  const pushH = useCallback((n: Node[], e: Edge[]) => {
    hRef.current = [...hRef.current.slice(0, hi + 1), { n, e }];
    setHi(hi + 1);
  }, [hi]);

  // Load map data
  useEffect(() => {
    if (!mapId) {
      setNodes([{ id: 'root', type: 'simple', position: { x: 400, y: 300 }, data: { label: 'Central Idea', color: '#52525b', emoji: '', isRoot: true, nodeType: 'simple' } }]);
      setEdges([]);
      return;
    }
    const map = storage.getMindMap(mapId);
    if (map) { setNodes(map.nodes as unknown as Node[]); setEdges(map.edges as unknown as Edge[]); setMn(map.name); }
  }, [mapId, setNodes, setEdges]);

  // Auto-save
  useEffect(() => {
    if (mapId) {
      storage.updateMindMap(mapId, { nodes: nodes as any, edges: edges as any });
      const m = storage.getMindMap(mapId);
      if (m) onMapUpdate(m);
    }
  }, [nodes, edges, mapId, onMapUpdate]);

  // CustomEvent listeners for node updates
  useEffect(() => {
    const h1 = (ev: Event) => { const { id, label } = (ev as CustomEvent).detail; setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label } } : n)); };
    const h2 = (ev: Event) => { const { id, block } = (ev as CustomEvent).detail; setNodes(nds => nds.map(n => { if (n.id !== id) return n; const d = n.data as any; return { ...n, data: { ...d, richContent: [...(d.richContent || []), block] } }; })); };
    const h3 = (ev: Event) => { const { id, blockId, updates } = (ev as CustomEvent).detail; setNodes(nds => nds.map(n => { if (n.id !== id) return n; const d = n.data as any; return { ...n, data: { ...d, richContent: (d.richContent || []).map((b: any) => b.id === blockId ? { ...b, ...updates } : b) } }; })); };
    const h4 = (ev: Event) => { const { id, blockId } = (ev as CustomEvent).detail; setNodes(nds => nds.map(n => { if (n.id !== id) return n; const d = n.data as any; return { ...n, data: { ...d, richContent: (d.richContent || []).filter((b: any) => b.id !== blockId) } }; })); };
    const h5 = (ev: Event) => { const { id, field, value } = (ev as CustomEvent).detail; setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n)); };
    const pairs = [['node-label-change', h1], ['node-add-block', h2], ['node-update-block', h3], ['node-delete-block', h4], ['node-update-field', h5]] as const;
    pairs.forEach(([e, fn]) => document.addEventListener(e, fn));
    return () => pairs.forEach(([e, fn]) => document.removeEventListener(e, fn));
  }, [setNodes]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (hi <= 0) return;
    const p = hRef.current[hi - 1]; setNodes(p.n); setEdges(p.e); setHi(hi - 1);
  }, [hi, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (hi >= hRef.current.length - 1) return;
    const p = hRef.current[hi + 1]; setNodes(p.n); setEdges(p.e); setHi(hi + 1);
  }, [hi, setNodes, setEdges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement && (document.activeElement as HTMLElement).tagName !== 'BODY') return;
        const s = rf.getNodes().find(n => n.selected);
        if (s && s.id !== 'root') {
          setNodes(nds => nds.filter(n => n.id !== s.id));
          setEdges(eds => eds.filter(ed => ed.source !== s.id && ed.target !== s.id));
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [rf, setNodes, setEdges, undo, redo]);

  // Connect nodes
  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target) return;
    const ne: Edge = { id: 'e-' + c.source + '-' + c.target, source: c.source, target: c.target, type: 'curved', animated: false, data: { color: '#52525b', strokeWidth: 2 } };
    setEdges(eds => addEdge(ne, eds));
    pushH(nodes, [...edges, ne]);
  }, [setEdges, nodes, edges, pushH]);

  // Add node
  const addNode = useCallback((type: 'simple' | 'rich' | 'group' | 'definition') => {
    const labels: Record<string, string> = { simple: 'New Node', rich: 'New Card', group: 'New Group', definition: 'New Definition' };
    const nn: Node = {
      id: generateId(), type,
      position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 150 },
      data: {
        label: labels[type], color: '#52525b', nodeType: type,
        ...(type === 'rich' ? { emoji: '', richContent: [] } : {}),
        ...(type === 'definition' ? { heading: 'Term', content: 'Definition...' } : {}),
        ...(type === 'group' ? { children: [] } : {}),
      },
    };
    setNodes(nds => [...nds, nn]);
    pushH([...nodes, nn], edges);
  }, [setNodes, nodes, edges, pushH]);

  // Delete selected
  const deleteSelected = useCallback(() => {
    const s = nodes.find(n => n.selected && n.id !== 'root');
    if (!s) return;
    const nn = nodes.filter(n => n.id !== s.id);
    const ne = edges.filter(e => e.source !== s.id && e.target !== s.id);
    setNodes(nn); setEdges(ne); pushH(nn, ne);
  }, [nodes, edges, setNodes, setEdges, pushH]);

  // Layout
  const doLayout = useCallback((alg: 'tree' | 'radial' | 'force') => {
    let laid: Node[] = nodes;
    if (alg === 'tree') laid = applyTreeLayout({ nodes, edges, levelSpacing: 120 });
    else if (alg === 'radial') laid = applyRadialLayout({ nodes, edges });
    else laid = applyForceLayout({ nodes, edges });
    setNodes(laid); pushH(laid, edges);
  }, [nodes, edges, setNodes, pushH]);

  // Export
  const handleExport = useCallback((fmt: 'json' | 'png') => {
    if (fmt === 'json') {
      const d = { nodes, edges, name: mn };
      const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
      const u = URL.createObjectURL(b);
      const a = document.createElement('a'); a.href = u; a.download = (mn || 'map').replace(/\s+/g, '_') + '.json'; a.click();
      URL.revokeObjectURL(u);
    }
  }, [nodes, edges, mn]);

  // Import
  const handleImport = useCallback(() => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.json';
    i.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = (ev) => { try { const d = JSON.parse(ev.target?.result as string); if (d.nodes && d.edges) { setNodes(d.nodes); setEdges(d.edges); if (d.name) setMn(d.name); pushH(d.nodes, d.edges); } } catch {} };
      r.readAsText(f);
    }; i.click();
  }, [setNodes, setEdges, pushH]);

  // Rename
  const renameMap = useCallback((name: string) => {
    setMn(name);
    if (mapId) { storage.updateMindMap(mapId, { name }); const m = storage.getMindMap(mapId); if (m) onMapUpdate(m); }
  }, [mapId, onMapUpdate]);

  return (
    <div className="flex h-full w-full flex-col bg-zinc-950">
      <MindMapToolbar onAddNode={addNode} onDeleteSelected={deleteSelected} onZoomIn={() => rf.zoomIn()} onZoomOut={() => rf.zoomOut()} onFitView={() => rf.fitView({ padding: 0.2 })} onAutoLayout={doLayout} onExport={handleExport} onImport={handleImport} onUndo={undo} onRedo={redo} hasSelected={!!nodes.find(n => n.selected)} selectedNodeId={nodes.find(n => n.selected)?.id ?? null} canUndo={hi > 0} canRedo={hi < hRef.current.length - 1} currentMapName={mn} onRenameMap={renameMap} />
      <div className="flex-1">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onPaneClick={() => {}} nodeTypes={NT} edgeTypes={ET} fitView snapToGrid snapGrid={[20, 20]} defaultEdgeOptions={{ type: 'curved' }} proOptions={{ hideAttribution: true }}>
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#27272a" />
          <Controls className="!bg-zinc-900 !border-zinc-800 !shadow-sm !rounded-lg" position="bottom-left" />
          <MiniMap nodeStrokeColor="#3f3f46" nodeColor="#27272a" maskColor="rgba(0,0,0,0.8)" className="!bg-zinc-900 !border-zinc-800 !shadow-sm !rounded-lg" position="bottom-right" pannable zoomable />
        </ReactFlow>
      </div>
    </div>
  );
}
