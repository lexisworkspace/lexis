"use client";
import { memo } from "react";
import { getBezierPath, type EdgeProps, BaseEdge, EdgeLabelRenderer } from "reactflow";

export interface CurvedEdgeData {
  color?: string;
  strokeWidth?: number;
  animated?: boolean;
  label?: string;
  [key: string]: unknown;
}

function CurvedEdgeComponent({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style = {}, selected }: EdgeProps<CurvedEdgeData>) {
  const edgeColor = data?.color || style.stroke || "#ffffff30";
  const strokeWidth = data?.strokeWidth || (style.strokeWidth as number) || 2;
  const isAnimated = data?.animated || false;

  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: 0.35 });

  return (
    <>
      <path d={edgePath} fill="none" stroke={edgeColor} strokeWidth={strokeWidth + 4} strokeOpacity={selected ? 0.15 : 0.05} style={{ filter: "blur(4px)" }} />
      <BaseEdge id={id} path={edgePath} style={{ ...style, stroke: edgeColor, strokeWidth, strokeLinecap: "round" }} className={isAnimated ? "animate-pulse" : ""} />
      {isAnimated && <circle r="2" fill={edgeColor} opacity="0.6"><animateMotion dur="3s" repeatCount="indefinite" path={edgePath} /></circle>}
      {data?.label && (
        <EdgeLabelRenderer>
          <div style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: "all" }}
            className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] text-white/50 font-medium">{data.label}</div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const CurvedEdge = memo(CurvedEdgeComponent);
