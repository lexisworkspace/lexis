import type { Node, Edge } from "reactflow";

function getChildren(nodeId: string, edges: Edge[]): string[] {
  return edges.filter((e) => e.source === nodeId).map((e) => e.target);
}

function getParent(nodeId: string, edges: Edge[]): string | null {
  const edge = edges.find((e) => e.target === nodeId);
  return edge ? edge.source : null;
}

function getSubtreeWidth(nodeId: string, edges: Edge[], nodeWidth: number, spacing: number): number {
  const children = getChildren(nodeId, edges);
  if (children.length === 0) return nodeWidth;
  const childrenWidth = children.reduce((sum, child) => sum + getSubtreeWidth(child, edges, nodeWidth, spacing) + spacing, -spacing);
  return Math.max(nodeWidth, childrenWidth);
}

export function applyTreeLayout(options: { nodes: Node[]; edges: Edge[]; levelSpacing?: number }): Node[] {
  const { nodes, edges, levelSpacing = 120 } = options;
  const targetIds = new Set(edges.map((e) => e.target));
  const roots = nodes.filter((n) => !targetIds.has(n.id));
  if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0]);
  const nodeWidth = 200;
  const nodeSpacing = 60;
  const positions = new Map<string, { x: number; y: number }>();

  function layoutSubtree(nodeId: string, startX: number, level: number): number {
    const children = getChildren(nodeId, edges);
    const subtreeWidth = getSubtreeWidth(nodeId, edges, nodeWidth, nodeSpacing);
    positions.set(nodeId, { x: startX + subtreeWidth / 2 - nodeWidth / 2, y: level * levelSpacing });
    let childX = startX;
    for (const childId of children) {
      const childWidth = getSubtreeWidth(childId, edges, nodeWidth, nodeSpacing);
      layoutSubtree(childId, childX, level + 1);
      childX += childWidth + nodeSpacing;
    }
    return subtreeWidth;
  }

  let rootStartX = 0;
  for (const root of roots) {
    const width = layoutSubtree(root.id, rootStartX, 0);
    rootStartX += width + levelSpacing * 2;
  }
  for (const node of nodes) {
    if (!positions.has(node.id)) positions.set(node.id, { x: rootStartX, y: 0 });
  }
  let minX = Infinity, minY = Infinity;
  for (const pos of positions.values()) { minX = Math.min(minX, pos.x); minY = Math.min(minY, pos.y); }
  return nodes.map((node) => ({ ...node, position: { x: (positions.get(node.id)?.x || 0) - minX + 100, y: (positions.get(node.id)?.y || 0) - minY + 100 } }));
}

export function applyRadialLayout(options: { nodes: Node[]; edges: Edge[] }): Node[] {
  const { nodes, edges } = options;
  const targetIds = new Set(edges.map((e) => e.target));
  const roots = nodes.filter((n) => !targetIds.has(n.id));
  if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0]);
  const positions = new Map<string, { x: number; y: number }>();
  const centerX = 500, centerY = 400;
  if (roots.length > 0) positions.set(roots[0].id, { x: centerX, y: centerY });
  const levels: string[][] = [];
  const visited = new Set<string>();
  let currentLevel = roots.map((r) => r.id);
  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    currentLevel.forEach((id) => visited.add(id));
    const nextLevel: string[] = [];
    for (const nodeId of currentLevel) {
      const children = getChildren(nodeId, edges).filter((id) => !visited.has(id));
      nextLevel.push(...children);
    }
    currentLevel = nextLevel;
  }
  for (let level = 1; level < levels.length; level++) {
    const radius = level * 180;
    const nodesInLevel = levels[level];
    const angleStep = (2 * Math.PI) / nodesInLevel.length;
    for (let i = 0; i < nodesInLevel.length; i++) {
      const angle = angleStep * i - Math.PI / 2;
      positions.set(nodesInLevel[i], { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) });
    }
  }
  let unvisitedAngle = 0;
  for (const node of nodes) {
    if (!positions.has(node.id)) {
      positions.set(node.id, { x: centerX + (levels.length + 1) * 180 * Math.cos(unvisitedAngle), y: centerY + (levels.length + 1) * 180 * Math.sin(unvisitedAngle) });
      unvisitedAngle += 0.5;
    }
  }
  return nodes.map((node) => ({ ...node, position: positions.get(node.id) || { x: 0, y: 0 } }));
}

export function applyForceLayout(options: { nodes: Node[]; edges: Edge[] }): Node[] {
  const { nodes, edges } = options;
  if (nodes.length === 0) return nodes;
  let positions = nodes.map((node) => ({ id: node.id, x: node.position.x || Math.random() * 800, y: node.position.y || Math.random() * 600 }));
  for (let iter = 0; iter < 100; iter++) {
    const forces = new Map(positions.map((p) => [p.id, { fx: 0, fy: 0 }]));
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i], b = positions[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 5000 / (dist * dist);
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        forces.get(a.id)!.fx -= fx; forces.get(a.id)!.fy -= fy;
        forces.get(b.id)!.fx += fx; forces.get(b.id)!.fy += fy;
      }
    }
    for (const edge of edges) {
      const a = positions.find((p) => p.id === edge.source);
      const b = positions.find((p) => p.id === edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = 0.01 * (dist - 150);
      const fx = (dx / dist) * force, fy = (dy / dist) * force;
      forces.get(a.id)!.fx += fx; forces.get(a.id)!.fy += fy;
      forces.get(b.id)!.fx -= fx; forces.get(b.id)!.fy -= fy;
    }
    for (const pos of positions) {
      const f = forces.get(pos.id)!;
      f.fx += (500 - pos.x) * 0.001; f.fy += (400 - pos.y) * 0.001;
    }
    for (const pos of positions) {
      const f = forces.get(pos.id)!;
      pos.x += f.fx * 0.9; pos.y += f.fy * 0.9;
    }
  }
  let minX = Infinity, minY = Infinity;
  for (const pos of positions) { minX = Math.min(minX, pos.x); minY = Math.min(minY, pos.y); }
  const posMap = new Map(positions.map((p) => [p.id, p]));
  return nodes.map((node) => ({ ...node, position: { x: (posMap.get(node.id)?.x || 0) - minX + 100, y: (posMap.get(node.id)?.y || 0) - minY + 100 } }));
}
