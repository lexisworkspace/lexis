// ============================================================
// Word-style rulers ("margin correctors") for the documents editor.
// Horizontal ruler: draggable left/right margins + first-line /
// left indent markers that act on the current paragraph.
// Vertical ruler: draggable top/bottom page margins.
// ============================================================

"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorState } from "@tiptap/react";

export interface DocMargins {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const DEFAULT_MARGINS: DocMargins = { left: 64, right: 64, top: 96, bottom: 96 };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function useWidth(ref: React.RefObject<HTMLDivElement>, fallback: number) {
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function useHeight(ref: React.RefObject<HTMLDivElement>, fallback: number) {
  const [h, setH] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.clientHeight));
    ro.observe(el);
    setH(el.clientHeight);
    return () => ro.disconnect();
  }, [ref]);
  return h;
}

// ------------------------------------------------------------
// Horizontal ruler
// ------------------------------------------------------------
export function HorizontalRuler({
  editor,
  margins,
  onMargins,
}: {
  editor: any;
  margins: DocMargins;
  onMargins: (m: DocMargins) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const W = useWidth(ref, 816);

  const ind = useEditorState({
    editor,
    selector: ({ editor }) => {
      const a = editor?.state.selection.$from?.parent?.attrs;
      return `${a?.indent || 0}|${a?.textIndent || 0}`;
    },
  });
  const [blockIndent, textIndent] = ind.split("|").map(Number);
  const firstLine = blockIndent + textIndent;

  const pct = (px: number) => (px / W) * 100;
  const minX = margins.left;
  const maxX = W - margins.right;

  const startDrag = (kind: string, startX: number, startVal: number) => {
    const onMove = (e: PointerEvent) => {
      const v = startVal + (e.clientX - startX);
      if (kind === "left-margin") {
        onMargins({ ...margins, left: clamp(v, 24, W - margins.right - 120) });
      } else if (kind === "right-margin") {
        onMargins({ ...margins, right: clamp(W - v, 24, W - margins.left - 120) });
      } else if (kind === "left-indent") {
        (editor.commands as any).setBlockIndent(clamp(v, minX, maxX));
      } else if (kind === "first-line") {
        (editor.commands as any).setTextIndent(clamp(v, minX, maxX) - blockIndent);
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div ref={ref} className="lexis-ruler relative h-7 w-full shrink-0 select-none overflow-hidden touch-none">
      {/* tick marks */}
      <div className="absolute inset-y-0 left-0 right-0 flex">
        {Array.from({ length: Math.max(1, Math.floor(W / 16)) }).map((_, i) => (
          <div key={i} className="h-full flex-1 border-l border-black/5 dark:border-white/5" />
        ))}
      </div>
      {/* margin zones */}
      <div className="absolute inset-y-0 bg-muted/40" style={{ left: 0, width: `${pct(margins.left)}%` }} />
      <div className="absolute inset-y-0 bg-muted/40" style={{ left: `${pct(W - margins.right)}%`, right: 0 }} />
      {/* indent guides */}
      <div className="absolute top-0 bottom-0 w-px bg-primary-500/50" style={{ left: `${pct(blockIndent)}%` }} />
      {textIndent !== 0 && (
        <div className="absolute top-0 h-2 w-px bg-amber-500/60" style={{ left: `${pct(firstLine)}%` }} />
      )}

      {/* markers */}
      <RulerMarker
        left={pct(firstLine)}
        shape="top"
        title="First line indent"
        onDown={(e) => startDrag("first-line", e.clientX, firstLine)}
      />
      <RulerMarker
        left={pct(blockIndent)}
        shape="bottom"
        title="Left indent"
        onDown={(e) => startDrag("left-indent", e.clientX, blockIndent)}
      />
      <RulerMarker
        left={pct(margins.left)}
        shape="bar"
        title="Left margin"
        onDown={(e) => startDrag("left-margin", e.clientX, margins.left)}
      />
      <RulerMarker
        left={pct(W - margins.right)}
        shape="bar"
        title="Right margin"
        onDown={(e) => startDrag("right-margin", e.clientX, W - margins.right)}
      />
    </div>
  );
}

function RulerMarker({
  left,
  shape,
  title,
  onDown,
}: {
  left: number;
  shape: "top" | "bottom" | "bar";
  title: string;
  onDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      className="lexis-ruler-marker touch-none"
      style={{ left: `calc(${left}% - 5px)` }}
      title={title}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDown(e);
      }}
    >
      {shape === "top" ? (
        <div className="lexis-marker-top" />
      ) : shape === "bottom" ? (
        <div className="lexis-marker-bottom" />
      ) : (
        <div className="lexis-marker-bar" />
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Vertical ruler (top / bottom margins)
// ------------------------------------------------------------
export function VerticalRuler({
  margins,
  onMargins,
  pageHeight,
}: {
  margins: DocMargins;
  onMargins: (m: DocMargins) => void;
  pageHeight: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const H = useHeight(ref, 700);

  const startDrag = (kind: "top" | "bottom", startY: number, startVal: number) => {
    const onMove = (e: PointerEvent) => {
      const v = clamp(startVal + (e.clientY - startY), 36, Math.max(60, H - 160));
      if (kind === "top") onMargins({ ...margins, top: Math.round(v) });
      else onMargins({ ...margins, bottom: Math.round(v) });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      ref={ref}
      className="lexis-vruler relative w-6 shrink-0 select-none sticky top-0 touch-none"
      style={{ height: "calc(100dvh - 156px)" }}
    >
      <div className="absolute left-0 right-0 top-0 bg-muted/40" style={{ height: Math.min(margins.top, H) }} />
      <div className="absolute left-0 right-0 bottom-0 bg-muted/40" style={{ height: Math.min(margins.bottom, H) }} />
      <div
        className="lexis-vmarker touch-none"
        style={{ top: Math.min(margins.top, H) - 4 }}
        title="Top margin"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startDrag("top", e.clientY, margins.top);
        }}
      />
      <div
        className="lexis-vmarker"
        style={{ bottom: Math.min(margins.bottom, H) - 4 }}
        title="Bottom margin"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startDrag("bottom", e.clientY, margins.bottom);
        }}
      />
    </div>
  );
}
