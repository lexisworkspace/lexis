# -*- coding: utf-8 -*-
import io, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def patch(path, subs):
    with io.open(path, "rb") as f:
        data = f.read()
    nl = "\r\n" if b"\r\n" in data else "\n"
    c = data.replace(b"\r\n", b"\n").decode("utf-8")
    for old, new in subs:
        assert old in c, "NOT FOUND in %s: %s" % (path, old[:60])
        c = c.replace(old, new, 1)
    with io.open(path, "wb") as f:
        f.write(c.replace("\n", nl).encode("utf-8"))
    print("patched", path)

patch("src/lib/notes/page-breaks.ts", [
    ('import { Plugin, PluginKey } from "@tiptap/pm/state";',
     'import { Plugin, PluginKey } from "@tiptap/pm/state";\nimport { Extension } from "@tiptap/core";'),
    ("""/**
 * Plugin that keeps a DecorationSet in sync with the current page layout.""",
     """/**
 * TipTap extension wrapper - register in the editor's extensions array.
 */
export const PageBreaks = Extension.create({
  name: "pageBreaks",
  addProseMirrorPlugins() {
    return [createPageBreaksPlugin()];
  },
});

/**
 * Plugin that keeps a DecorationSet in sync with the current page layout."""),
])

patch("src/lib/notes/find-replace.ts", [
    ("  addCommands() {\n    return {",
     "  addCommands() {\n    const commands = {"),
    ("""        };
    };
  },

  addProseMirrorPlugins() {""",
     """        };
    };
    // Custom command names are not part of RawCommands.
    return commands as any;
  },

  addProseMirrorPlugins() {"""),
])

patch("src/app/notes/page.tsx", [
    ("  createPageBreaksPlugin,\n  PAGE_GAP,",
     "  PageBreaks,\n  PAGE_GAP,"),
    ("      FindReplace,\n      createPageBreaksPlugin(),",
     "      FindReplace,\n      PageBreaks,"),
])
print("DONE")
