// ============================================================
// Columns - Word-style multi-column layout for the documents
// editor. A single wrapper node rendered as a CSS multi-column
// container; paragraphs flow into the columns automatically.
// ============================================================

import { Node, mergeAttributes } from "@tiptap/core";

export const Columns = Node.create({
  name: "columns",

  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      count: {
        default: 2,
        parseHTML: (el: any) => parseInt(el.getAttribute("data-cols") || "2", 10) || 2,
        renderHTML: (attrs: any) => ({ "data-cols": attrs.count || 2 }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-cols]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "lexis-columns" }), 0];
  },

  addCommands() {
    return {
      setColumns:
        (count: number) =>
        ({ commands }: any) =>
          commands.wrapIn("columns", { count }),
      unsetColumns:
        () =>
        ({ state, dispatch }: any) => {
          const { $from } = state.selection;
          let pos: number | null = null;
          let node: any = null;
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === "columns") {
              pos = $from.before(d);
              node = $from.node(d);
              break;
            }
          }
          if (!node || pos === null) return false;
          const tr = state.tr.replaceWith(pos, pos + node.nodeSize, node.content);
          if (dispatch) dispatch(tr);
          return true;
        },
    } as any;
  },
});
