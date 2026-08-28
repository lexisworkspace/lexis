// ============================================================
// Indent - Word-style paragraph indentation.
// Adds two attributes to paragraphs and headings:
//   indent     -> margin-left (px)
//   textIndent -> text-indent of the first line (px)
// ============================================================

import { Extension } from "@tiptap/core";

export const INDENT_STEP = 32;

export const IndentExtension = Extension.create({
  name: "indent",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el: any) => parseInt(el.style.marginLeft || "0", 10) || 0,
            renderHTML: (attrs: any) =>
              attrs.indent ? { style: `margin-left:${attrs.indent}px` } : {},
          },
          textIndent: {
            default: 0,
            parseHTML: (el: any) => parseInt(el.style.textIndent || "0", 10) || 0,
            renderHTML: (attrs: any) =>
              attrs.textIndent ? { style: `text-indent:${attrs.textIndent}px` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBlockIndent:
        (px: number) =>
        ({ editor, tr, dispatch }: any) => {
          const { selection } = editor.state;
          const $pos = selection.$from;
          const node = $pos.parent;
          if (!node.isTextblock) return false;
          const pos = $pos.before();
          if (dispatch) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: Math.max(0, Math.round(px)) });
          }
          return true;
        },
      setTextIndent:
        (px: number) =>
        ({ editor, tr, dispatch }: any) => {
          const { selection } = editor.state;
          const $pos = selection.$from;
          const node = $pos.parent;
          if (!node.isTextblock) return false;
          const pos = $pos.before();
          if (dispatch) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, textIndent: Math.round(px) });
          }
          return true;
        },
    } as any;
  },
});
