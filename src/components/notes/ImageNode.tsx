// ============================================================
// LexisImage - images in the notes editor that you can resize by
// dragging a corner handle and move FREELY around the paper by
// dragging the image itself. Free images float in front of the
// text (like Word's "In Front of Text"); tap "In line" to pin
// them back into the flow.
// ============================================================

"use client";

import { mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowLeftRight,
  Move,
  Maximize2,
} from "lucide-react";
import {
  PAGE_GAP,
  MARGIN_TOP,
  getLivePages,
  getLivePageHeight,
} from "@/lib/notes/page-breaks";

export interface FloatState {
  x: number; // % of paper width (left edge)
  y: number; // % of page height (top edge, within its page)
  w: number; // % of paper width
  page: number; // page index the image is anchored to
}

type Align = "left" | "center" | "right" | "float-left" | "float-right" | "free";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const LexisImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el: any) => el.getAttribute("width") || el.style.width || null,
        renderHTML: (attrs: any) => (attrs.width ? { width: attrs.width } : {}),
      },
      align: {
        default: "center",
        parseHTML: (el: any) => el.getAttribute("data-align") || "center",
        renderHTML: (attrs: any) =>
          attrs.align && attrs.align !== "center" ? { "data-align": attrs.align } : {},
      },
      float: {
        default: null,
        parseHTML: (el: any) => {
          const s = el.getAttribute("data-float");
          if (!s) return null;
          try {
            const p = JSON.parse(s);
            return p && typeof p.x === "number" ? p : null;
          } catch {
            return null;
          }
        },
        renderHTML: (attrs: any) =>
          attrs.float ? { "data-float": JSON.stringify(attrs.float) } : {},
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { width, align, float, ...rest } = HTMLAttributes as Record<string, any>;
    const style: string[] = [];
    if (width) style.push(`width:${width}`);
    if (align === "float-left") style.push("float:left;margin-right:16px");
    else if (align === "float-right") style.push("float:right;margin-left:16px");
    else if (align === "left") style.push("display:block;margin-right:auto;margin-left:0");
    else if (align === "right") style.push("display:block;margin-left:auto;margin-right:0");
    else if (align === "center") style.push("display:block;margin-left:auto;margin-right:auto");
    const attrs: Record<string, any> = { ...rest };
    if (style.length) attrs.style = style.join(";");
    return ["img", mergeAttributes(attrs, { class: "lexis-img" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

const TOOLBAR_BTN =
  "flex h-7 w-7 items-center justify-center rounded-md text-zinc-200 transition-colors hover:bg-white/15 active:scale-90";

function ImageNodeView(props: any) {
  const { node, updateAttributes, deleteNode, editor, selected, getPos } = props;
  const imgRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState(false);
  const [, setTick] = useState(0);
  const drag = useRef<{
    mode: "move" | "resize";
    pointerId: number;
    startX: number;
    startY: number;
    startW: number;
    grabDX: number;
    grabDY: number;
    moved: boolean;
    wasFree: boolean;
  } | null>(null);

  const attrs = node.attrs as {
    src?: string;
    alt?: string;
    width?: string | null;
    align?: Align;
    float?: FloatState | null;
  };
  const align = attrs.align || "center";
  const float = attrs.float || null;
  const isFree = align === "free" && !!float;

  const pageHeight = getLivePageHeight();
  const editorWidth = editor?.view?.dom?.clientWidth || 800;

  // ----- layout style -------------------------------------------------
  let rootStyle: React.CSSProperties = { position: "relative" };
  if (isFree && float) {
    const fp = Math.min(float.page, Math.max(0, getLivePages() - 1));
    rootStyle = {
      position: "absolute",
      left: `${float.x}%`,
      top: `${MARGIN_TOP + fp * (pageHeight + PAGE_GAP) + (float.y / 100) * pageHeight}px`,
      width: `${float.w}%`,
      zIndex: 5,
    };
  } else if (align === "float-left") {
    rootStyle = { position: "relative", float: "left", marginRight: 16 };
  } else if (align === "float-right") {
    rootStyle = { position: "relative", float: "right", marginLeft: 16 };
  } else if (align === "left") {
    rootStyle = { position: "relative", display: "block", marginRight: "auto" };
  } else if (align === "right") {
    rootStyle = { position: "relative", display: "block", marginLeft: "auto" };
  } else {
    rootStyle = { position: "relative", display: "block", marginLeft: "auto", marginRight: "auto" };
  }

  const imgStyle: React.CSSProperties = { display: "block", maxWidth: "100%", height: "auto" };
  if (!isFree && attrs.width) imgStyle.width = attrs.width;

  // ----- pointer handling ---------------------------------------------
  const startMove = useCallback(
    (e: React.PointerEvent, mode: "move" | "resize") => {
      e.preventDefault();
      e.stopPropagation();
      const img = imgRef.current;
      const ed = editor?.view?.dom as HTMLElement | undefined;
      if (!img || !ed) return;
      const r = img.getBoundingClientRect();
      const startW = r.width;
      drag.current = {
        mode,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startW,
        grabDX: e.clientX - r.left,
        grabDY: e.clientY - r.top,
        moved: false,
        wasFree: isFree,
      };
      (e.target as Element).setPointerCapture?.(e.pointerId);
      try {
        if (editor && getPos) editor.commands.setNodeSelection(getPos());
      } catch {
        /* stale pos */
      }
    },
    [editor, getPos, isFree]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const ed = editor?.view?.dom as HTMLElement | undefined;
      if (!ed) return;
      const er = ed.getBoundingClientRect();
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved && Math.hypot(dx, dy) < 5) return;
      d.moved = true;
      setDragging(true);

      if (d.mode === "resize") {
        const maxW = er.width - 40;
        const w = clamp(d.startW + dx, 60, maxW);
        if (isFree && float) {
          updateAttributes({ float: { ...float, w: (w / er.width) * 100 } });
        } else {
          updateAttributes({ width: `${Math.round(w)}px` });
        }
        return;
      }

      // move mode
      const pageH = getLivePageHeight();
      const maxPage = Math.max(0, getLivePages() - 1);
      let x = ((e.clientX - er.left - d.grabDX) / er.width) * 100;
      let rawY = e.clientY - er.top - d.grabDY;
      let page = clamp(Math.floor(rawY / (pageH + PAGE_GAP)), 0, maxPage);
      let y = clamp((rawY - page * (pageH + PAGE_GAP)) / pageH, 0, 1) * 100;
      x = clamp(x, 2, 98);
      if (!d.wasFree) {
        // convert from flow -> free at the pointer position
        updateAttributes({
          align: "free",
          float: {
            x,
            y,
            w: (d.startW / er.width) * 100,
            page,
          },
        });
        drag.current = { ...d, wasFree: true };
      } else if (float) {
        updateAttributes({ float: { ...float, x, y, page } });
      }
    },
    [editor, float, isFree, updateAttributes]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      setDragging(false);
      if (d && e.pointerId === d.pointerId && !d.moved) {
        try {
          if (editor) editor.chain().focus().setNodeSelection(getPos()).run();
        } catch {
          /* stale */
        }
      }
    },
    [editor, getPos]
  );

  // Re-render if the page grid changes (resize, pagination).
  useEffect(() => {
    const onPages = () => setTick((n) => n + 1);
    window.addEventListener("lexis:pages", onPages);
    return () => window.removeEventListener("lexis:pages", onPages);
  }, []);

  const toInline = () => {
    if (float && editor?.view?.dom) {
      const wPx = Math.round((float.w / 100) * editor.view.dom.clientWidth);
      updateAttributes({ align: "center", float: null, width: `${wPx}px` });
    } else {
      updateAttributes({ align: "center", float: null });
    }
  };

  const setAlign = (a: Align) => updateAttributes({ align: a, float: null });

  const maxW = editorWidth - 40;

  return (
    <NodeViewWrapper
      as="div"
      className={isFree ? "lexis-float-node" : undefined}
      style={rootStyle}
      draggable={false}
    >
      <div
        className={`lexis-img-wrap ${dragging ? "lexis-img-dragging" : ""} ${selected ? "lexis-img-selected" : ""}`}
      >
        <img
          ref={imgRef}
          src={attrs.src}
          alt={attrs.alt || ""}
          style={imgStyle}
          draggable={false}
          onPointerDown={(e) => startMove(e, "move")}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="lexis-img"
        />
        {selected && (
          <>
            <div className="lexis-img-toolbar" contentEditable={false}>
              {isFree && (
                <button className={TOOLBAR_BTN} title="In line with text" onClick={(e) => { e.stopPropagation(); toInline(); }}>
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </button>
              )}
              <button className={TOOLBAR_BTN} title="Align left" onClick={(e) => { e.stopPropagation(); setAlign("left"); }}>
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button className={TOOLBAR_BTN} title="Align center" onClick={(e) => { e.stopPropagation(); setAlign("center"); }}>
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button className={TOOLBAR_BTN} title="Align right" onClick={(e) => { e.stopPropagation(); setAlign("right"); }}>
                <AlignRight className="h-3.5 w-3.5" />
              </button>
              <button className={TOOLBAR_BTN} title="Move freely" onClick={(e) => { e.stopPropagation(); setAlign("free"); }}>
                <Move className="h-3.5 w-3.5" />
              </button>
              <button className={TOOLBAR_BTN} title="Delete image" onClick={(e) => { e.stopPropagation(); deleteNode(); }}>
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </button>
            </div>
            <div
              className="lexis-resize-handle"
              contentEditable={false}
              title="Resize"
              onPointerDown={(e) => startMove(e, "resize")}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <Maximize2 className="h-2.5 w-2.5 text-white" />
            </div>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}
