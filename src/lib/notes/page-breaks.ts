// ============================================================
// A4 paper pagination for the notes editor.
//
// The editor is one continuous ProseMirror document rendered on
// transparent paper. Page "breaks" are inserted at BLOCK boundaries
// (never mid-paragraph) as widget decorations - DOM elements that
// ProseMirror manages but that are not part of the document. Each
// gap reveals the backdrop between two white A4 cards, so the user
// sees a fresh sheet of paper appear underneath as they fill one up.
// ============================================================

import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Extension } from "@tiptap/core";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/** A4 portrait ratio (height / width). */
export const PAGE_RATIO = 297 / 210;

export interface PageSize {
  label: string;
  width: number;
  ratio: number;
}

/** On-screen paper sizes. Landscape flips the ratio (wide page). */
export const PAGE_SIZES: Record<string, PageSize> = {
  a4portrait: { label: "A4", width: 816, ratio: 297 / 210 },
  a4landscape: { label: "A4", width: 816, ratio: 210 / 297 },
  letterportrait: { label: "Letter", width: 816, ratio: 279.4 / 215.9 },
  letterlandscape: { label: "Letter", width: 816, ratio: 215.9 / 279.4 },
  a5portrait: { label: "A5", width: 575, ratio: 210 / 148 },
  a5landscape: { label: "A5", width: 575, ratio: 148 / 210 },
};

/** Visual gap between two sheets of paper. */
export const PAGE_GAP = 56;
/** Top / bottom margins of the paper (container padding). */
export const MARGIN_TOP = 96;
export const MARGIN_BOTTOM = 96;
/** Target paper width on screen. */
export const PAPER_WIDTH = 816;

export const pageBreaksKey = new PluginKey("orleiaPageBreaks");

let livePages = 1;
let livePageHeight = Math.round(PAPER_WIDTH * PAGE_RATIO);
let liveSig = "";
let liveRatio = PAGE_RATIO;

/** Update the paper ratio (page size + orientation) and force a re-layout. */
export function setPageGeometry(ratio: number) {
  liveRatio = ratio;
  liveSig = "";
}

export function getLivePages(): number {
  return livePages;
}

export function getLivePageHeight(): number {
  return livePageHeight;
}

function computePageBreaks(view: any): { set: DecorationSet; pages: number; pageHeight: number } {
  const dom = view.dom as HTMLElement;
  const pageHeight = Math.max(320, Math.round(dom.getBoundingClientRect().width * liveRatio));

  // Collect the DOM node + doc position of every top-level block.
  const entries: { dom: HTMLElement; pos: number }[] = [];
  view.state.doc.forEach((node: any, offset: number) => {
    const d = view.nodeDOM(offset);
    if (d && d.nodeType === 1 && !(d as HTMLElement).classList?.contains("orleia-float-node")) {
      entries.push({ dom: d as HTMLElement, pos: offset });
    }
  });

  const decorations: Decoration[] = [];
  let base = -1;
  let page = 0;
  let pageStart = 0;

  for (const { dom, pos } of entries) {
    const y = dom.offsetTop;
    if (base < 0) base = y;
    const rel = y - base;
    // The block would cross the bottom edge of the current sheet.
    if (rel > 0 && rel - pageStart >= pageHeight) {
      page++;
      pageStart = rel;
      const gap = document.createElement("div");
      gap.className = "orleia-page-gap";
      gap.style.height = `${PAGE_GAP}px`;
      decorations.push(Decoration.widget(pos, gap, { side: -1 }));
    }
  }

  return { set: DecorationSet.create(view.state.doc, decorations), pages: page + 1, pageHeight };
}

/**
 * TipTap extension wrapper - register in the editor's extensions array.
 */
export const PageBreaks = Extension.create({
  name: "pageBreaks",
  addProseMirrorPlugins() {
    return [createPageBreaksPlugin()];
  },
});

/**
 * Plugin that keeps a DecorationSet in sync with the current page layout.
 * Recomputes on every transaction, window resize, and ResizeObserver tick.
 */
export function createPageBreaksPlugin() {
  let latest: DecorationSet = DecorationSet.empty;
  let raf = 0;

  const schedule = (view: any) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const { set, pages, pageHeight } = computePageBreaks(view);
      const sig = `${pages}:${pageHeight}:${set.find().map((d: any) => d.from).join(",")}`;
      if (sig === liveSig) return;
      liveSig = sig;
      livePages = pages;
      livePageHeight = pageHeight;
      latest = set;
      window.dispatchEvent(new CustomEvent("orleia:pages", { detail: { pages, pageHeight } }));
      const tr = view.state.tr.setMeta(pageBreaksKey, true).setMeta("addToHistory", false);
      view.dispatch(tr);
    });
  };

  return new Plugin({
    key: pageBreaksKey,
    state: {
      init: () => null,
      apply: (tr, old) => {
        if (tr.getMeta(pageBreaksKey)) return old;
        return old;
      },
    },
    props: {
      decorations(state) {
        return latest;
      },
    },
    view(view) {
      let ro: ResizeObserver | null = null;
      try {
        ro = new ResizeObserver(() => schedule(view));
        ro.observe(view.dom);
      } catch {
        /* older browsers */
      }
      const onResize = () => schedule(view);
      window.addEventListener("resize", onResize);
      window.addEventListener("orleia:geometry", onResize);
      return {
        update(view, prevState) {
          schedule(view);
        },
        destroy() {
          cancelAnimationFrame(raf);
          window.removeEventListener("resize", onResize);
          window.removeEventListener("orleia:geometry", onResize);
          if (ro) ro.disconnect();
        },
      };
    },
  });
}
