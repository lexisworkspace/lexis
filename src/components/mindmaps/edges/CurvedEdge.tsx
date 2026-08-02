"use client";
import { memo } from 'react';
import { getBezierPath, type EdgeProps, BaseEdge } from 'reactflow';

export interface CurvedEdgeData {
  color?: string;
  strokeWidth?: number;
  animated?: boolean;
  label?: string;
  [key: string]: unknown;
}

function CurvedEdgeComponent({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data, style = {}, markerEnd, selected,
}: EdgeProps<CurvedEdgeData>) {
  const edgeColor = selected ? '#a1a1aa' : (data?.color || '#52525b');
  const strokeWidth = data?.strokeWidth || 2;

  const [edgePath] = getBezierPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition, curvature: 0.3,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
        stroke: edgeColor,
        strokeWidth: strokeWidth,
        strokeLinecap: 'round',
      }}
    />
  );
}

export const CurvedEdge = memo(CurvedEdgeComponent);
