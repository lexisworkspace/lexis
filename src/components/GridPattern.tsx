"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

const GRID_SIZE = 3;
const DOT_SPACING = 64;
const DOT_RADIUS = 8;
const ACTIVE_RADIUS = 12;
const CLEAR_RADIUS = 20;

interface GridPatternProps {
  onPattern: (pattern: string) => void;
  error?: string;
  label?: string;
}

function getDotCenter(index: number) {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  return { x: col * DOT_SPACING + DOT_SPACING, y: row * DOT_SPACING + DOT_SPACING };
}

function distanceToDot(px: number, py: number, dotIndex: number) {
  const center = getDotCenter(dotIndex);
  return Math.sqrt((px - center.x) ** 2 + (py - center.y) ** 2);
}

function getDotFromPoint(px: number, py: number): number | null {
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    if (distanceToDot(px, py, i) < CLEAR_RADIUS) return i;
  }
  return null;
}

function pointsToPattern(dots: number[]): string {
  return dots.join("-");
}

export function GridPattern({ onPattern, error, label }: GridPatternProps) {
  const [selectedDots, setSelectedDots] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getSVGPoint = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * (DOT_SPACING * (GRID_SIZE + 1)),
      y: ((clientY - rect.top) / rect.height) * (DOT_SPACING * (GRID_SIZE + 1)),
    };
  }, []);

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      const pt = getSVGPoint(clientX, clientY);
      const dot = getDotFromPoint(pt.x, pt.y);
      if (dot !== null) {
        setIsDrawing(true);
        setSelectedDots([dot]);
        setCurrentPos(pt);
      }
    },
    [getSVGPoint]
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDrawing) return;
      const pt = getSVGPoint(clientX, clientY);
      setCurrentPos(pt);
      const dot = getDotFromPoint(pt.x, pt.y);
      if (dot !== null && !selectedDots.includes(dot)) {
        setSelectedDots((prev) => [...prev, dot]);
      }
    },
    [isDrawing, getSVGPoint, selectedDots]
  );

  const handleEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setCurrentPos(null);
    if (selectedDots.length >= 4) {
      onPattern(pointsToPattern(selectedDots));
    }
    // Clear after a brief delay so user sees the pattern
    setTimeout(() => setSelectedDots([]), 300);
  }, [isDrawing, selectedDots, onPattern]);

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const onMouseUp = () => handleEnd();

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    handleStart(t.clientX, t.clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    handleMove(t.clientX, t.clientY);
  };
  const onTouchEnd = () => handleEnd();

  useEffect(() => {
    const onUp = () => handleEnd();
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [handleEnd]);

  const totalSize = DOT_SPACING * (GRID_SIZE + 1);
  const lastSelected = selectedDots.length > 0 ? selectedDots[selectedDots.length - 1] : null;
  const lastCenter = lastSelected !== null ? getDotCenter(lastSelected) : null;

  return (
    <div className="flex flex-col items-center gap-4">
      {label && (
        <p className="text-xs text-muted-foreground">{label}</p>
      )}
      <div ref={containerRef} className="select-none touch-none">
        <svg
          ref={svgRef}
          width={totalSize}
          height={totalSize}
          viewBox={`0 0 ${totalSize} ${totalSize}`}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="cursor-pointer"
        >
          {/* Connection lines */}
          {selectedDots.length > 1 && (
            <polyline
              points={selectedDots
                .map((d) => {
                  const c = getDotCenter(d);
                  return `${c.x},${c.y}`;
                })
                .join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary/60"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {/* Line to current finger position */}
          {isDrawing && lastCenter && currentPos && (
            <line
              x1={lastCenter.x}
              y1={lastCenter.y}
              x2={currentPos.x}
              y2={currentPos.y}
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary/30"
              strokeLinecap="round"
            />
          )}
          {/* Dots */}
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
            const center = getDotCenter(i);
            const isSelected = selectedDots.includes(i);
            return (
              <circle
                key={i}
                cx={center.x}
                cy={center.y}
                r={isSelected ? ACTIVE_RADIUS : DOT_RADIUS}
                className={
                  isSelected
                    ? "fill-primary text-primary"
                    : "fill-muted-foreground/20 text-muted-foreground/20"
                }
                stroke="currentColor"
                strokeWidth={isSelected ? 0 : 1.5}
              />
            );
          })}
        </svg>
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-destructive"
        >
          {error}
        </motion.p>
      )}
      {selectedDots.length > 0 && selectedDots.length < 4 && (
        <p className="text-xs text-muted-foreground/50">
          Connect at least 4 dots
        </p>
      )}
    </div>
  );
}
