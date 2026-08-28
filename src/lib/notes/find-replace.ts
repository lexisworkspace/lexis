// ============================================================
// Find & replace for the notes editor.
// Matches are highlighted with inline decorations; next/prev
// moves the selection; replace / replace-all edit the document.
// ============================================================

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface FindState {
  query: string;
  replaceText: string;
  caseSensitive: boolean;
  matches: { from: number; to: number }[];
  index: number;
}

const key = new PluginKey("lexisFindReplace");
const EMPTY: FindState = { query: "", replaceText: "", caseSensitive: false, matches: [], index: -1 };

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findMatches(doc: any, query: string, caseSensitive: boolean): { from: number; to: number }[] {
  if (!query) return [];
  let re: RegExp;
  try {
    re = new RegExp(escapeRe(query), caseSensitive ? "g" : "gi");
  } catch {
    return [];
  }
  const out: { from: number; to: number }[] = [];
  doc.descendants((node: any, pos: number) => {
    if (!node.isText || !node.text) return;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(node.text)) !== null) {
      out.push({ from: pos + m.index, to: pos + m.index + m[0].length });
      if (m.index === re.lastIndex) re.lastIndex++; // avoid zero-length loops
    }
  });
  return out;
}

export const FindReplace = Extension.create({
  name: "findReplace",

  addCommands() {
    const commands = {
      setFindState:
        (state: FindState) =>
        ({ tr, dispatch }: any) => {
          if (dispatch) tr.setMeta(key, state);
          return true;
        },

      goToMatch:
        (index: number) =>
        ({ editor, tr, dispatch }: any) => {
          const st: FindState = key.getState(editor.state) || EMPTY;
          if (!st.matches.length) return false;
          const i = ((index % st.matches.length) + st.matches.length) % st.matches.length;
          const m = st.matches[i];
          if (dispatch) {
            tr.setSelection(TextSelection.create(tr.doc, m.from, m.to));
            tr.setMeta("scrollIntoView", true);
            tr.setMeta(key, { ...st, index: i });
          }
          return true;
        },

      replaceCurrent:
        (text: string) =>
        ({ editor, tr, dispatch }: any) => {
          const st: FindState = key.getState(editor.state) || EMPTY;
          if (!st.matches.length) return false;
          const i = st.index >= 0 && st.index < st.matches.length ? st.index : 0;
          const m = st.matches[i];
          if (dispatch) {
            tr.insertText(text, m.from, m.to);
            tr.setMeta(key, { ...st, replaceText: text, matches: [], index: -1 });
          }
          return true;
        },

      replaceAllMatches:
        (find: string, text: string, caseSensitive: boolean) =>
        ({ tr, dispatch }: any) => {
          const matches = findMatches(tr.doc, find, caseSensitive);
          if (!matches.length) return false;
          if (dispatch) {
            // Apply from the end so earlier positions stay valid.
            for (let i = matches.length - 1; i >= 0; i--) {
              tr.insertText(text, matches[i].from, matches[i].to);
            }
            tr.setMeta(key, { ...EMPTY, replaceText: text, query: find, caseSensitive });
          }
          return true;
        },
    };
    // Custom command names are not part of RawCommands.
    return commands as any;
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        state: {
          init: () => ({ ...EMPTY }),
          apply: (tr, old) => (tr.getMeta(key) ? tr.getMeta(key) : old),
        },
        props: {
          decorations(state) {
            const st: FindState = key.getState(state);
            if (!st || !st.matches.length) return DecorationSet.empty;
            return DecorationSet.create(
              state.doc,
              st.matches.map((m, i) =>
                Decoration.inline(m.from, m.to, {
                  class: i === st.index ? "lexis-find-current" : "lexis-find-match",
                })
              )
            );
          },
        },
      }),
    ];
  },
});

export function getFindState(editor: any): FindState {
  if (!editor) return { ...EMPTY };
  return key.getState(editor.state) || { ...EMPTY };
}
