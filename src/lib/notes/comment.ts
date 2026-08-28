// ============================================================
// Comments - Word-style inline annotations.
// A mark that wraps selected text; the comment text is embedded
// in the HTML as data-comment (self-contained, survives reloads)
// and the native title attribute shows a hover tooltip.
// ============================================================

import { Mark, mergeAttributes } from "@tiptap/core";

export const CommentMark = Mark.create({
  name: "comment",

  inclusive: false,

  addAttributes() {
    return {
      comment: {
        default: null,
        parseHTML: (el: any) => el.getAttribute("data-comment") || "",
        renderHTML: (attrs: any) =>
          attrs.comment
            ? { "data-comment": attrs.comment, title: attrs.comment }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "mark[data-comment]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["mark", mergeAttributes(HTMLAttributes, { class: "lexis-comment" }), 0];
  },

  addCommands() {
    return {
      setComment:
        (text: string) =>
        ({ commands }: any) =>
          commands.setMark("comment", { comment: text }),
      unsetComment:
        () =>
        ({ commands }: any) =>
          commands.unsetMark("comment"),
    } as any;
  },
});
