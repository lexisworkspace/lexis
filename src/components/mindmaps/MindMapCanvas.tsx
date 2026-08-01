"use client";
import { MindMap } from "@/types";
import { MindMapFlow } from "./MindMapFlow";
import { ReactFlowProvider } from "reactflow";

interface MindMapCanvasProps { mapId: string | null; onMapUpdate: (map: MindMap) => void; }
export function MindMapCanvas({ mapId, onMapUpdate }: MindMapCanvasProps) {
  return <ReactFlowProvider><MindMapFlow mapId={mapId} onMapUpdate={onMapUpdate} /></ReactFlowProvider>;
}
