"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Undo2, Trash2, Check, Pen, Eraser } from "lucide-react";

interface DrawingCanvasProps {
  open: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

export function DrawingCanvas({ open, onClose, onSave }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#ffffff");
  const [lineWidth, setLineWidth] = useState(2);
  const [history, setHistory] = useState<ImageData[]>([]);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill with black background
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save initial state
    setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }, [open]);

  const getPos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const startDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, [getPos]);

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.strokeStyle = tool === "eraser" ? "#0a0a0a" : color;
    ctx.lineWidth = tool === "eraser" ? lineWidth * 5 : lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isDrawing, tool, color, lineWidth, getPos]);

  const endDraw = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    setHistory((prev) => [...prev, ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height)]);
  }, [isDrawing]);

  const undo = useCallback(() => {
    if (history.length < 2) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    const newHistory = history.slice(0, -1);
    ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
    setHistory(newHistory);
  }, [history]);

  const clear = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory([ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)]);
  }, []);

  const save = useCallback(() => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onSave(dataUrl);
    onClose();
  }, [onSave, onClose]);

  const colors = ["#ffffff", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-background"
        >
          {/* Toolbar */}
          <div className="fixed top-0 left-0 right-0 z-[201] flex items-center gap-3 px-4 py-3 bg-background/90 backdrop-blur-md border-b border-border">
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">Draw</span>
            <div className="flex-1" />

            {/* Tool selector */}
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
              <button
                onClick={() => setTool("pen")}
                className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${tool === "pen" ? "bg-muted" : ""}`}
              >
                <Pen className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setTool("eraser")}
                className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${tool === "eraser" ? "bg-muted" : ""}`}
              >
                <Eraser className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Colors */}
            {tool === "pen" && (
              <div className="flex items-center gap-1">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-5 w-5 rounded-full border-2 transition-transform ${color === c ? "border-primary scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}

            {/* Line width */}
            <input
              type="range"
              min="1"
              max="10"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-16"
            />

            <button onClick={undo} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors" disabled={history.length < 2}>
              <Undo2 className="h-4 w-4" />
            </button>
            <button onClick={clear} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={save} className="flex h-8 items-center gap-1.5 rounded-lg border border-foreground/20 bg-transparent px-3 text-xs font-medium text-foreground/70 hover:border-foreground/40 hover:text-foreground transition-all">
              <Check className="h-3.5 w-3.5" /> Done
            </button>
          </div>

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            className="touch-none cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
