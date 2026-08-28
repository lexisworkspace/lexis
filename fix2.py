# -*- coding: utf-8 -*-
import io, re

def load(path):
    with io.open(path, 'rb') as f:
        data = f.read()
    nl = '\r\n' if b'\r\n' in data else '\n'
    return data.replace(b'\r\n', b'\n').decode('utf-8'), nl

def save(path, c, nl):
    with io.open(path, 'wb') as f:
        f.write(c.replace('\n', nl).encode('utf-8'))

# ============================================================
# 1. i18n.ts - remove my duplicated readingTime/paragraphs/sentences
#    that were inserted right after each notes.zoomIn line
# ============================================================
path = 'src/lib/i18n.ts'
c, nl = load(path)
lines = c.split('\n')
out = []
skip_until_nonkey = 0
removed = 0
for ln in lines:
    if skip_until_nonkey > 0:
        m = re.match(r'^    "notes\.(readingTime|paragraphs|sentences)":', ln)
        if m:
            removed += 1
            continue
        skip_until_nonkey = 0
    out.append(ln)
    if '"notes.zoomIn":' in ln:
        skip_until_nonkey = 999
c = '\n'.join(out)
save(path, c, nl)
print('i18n: removed', removed, 'duplicate lines')

# ============================================================
# 2. page.tsx - move docx header/footer into the section
# ============================================================
path = 'src/app/notes/page.tsx'
c, nl = load(path)
old = '''    const doc = new Document({
      title: title || t("notes.untitled"),
      header: showHeader
        ? new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: title || t("notes.untitled"), size: 18, color: "888888" })],
              }),
            ],
          })
        : undefined,
      footer: showFooter
        ? new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" })],
              }),
            ],
          })
        : undefined,
      sections: [{ children: paragraphs }],
    });'''
new = '''    const doc = new Document({
      title: title || t("notes.untitled"),
      sections: [
        {
          header: showHeader
            ? new Header({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: title || t("notes.untitled"), size: 18, color: "888888" })],
                  }),
                ],
              })
            : undefined,
          footer: showFooter
            ? new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" })],
                  }),
                ],
              })
            : undefined,
          children: paragraphs,
        },
      ],
    });'''
assert old in c, 'docx block not found'
c = c.replace(old, new, 1)
save(path, c, nl)
print('page.tsx: docx header/footer moved to section')

# ============================================================
# 3. columns.ts + comment.ts - cast commands as any
# ============================================================
for path, subs in [
    ('src/lib/notes/columns.ts', [
        ('''      unsetColumns:
        () =>
        ({ commands }: any) =>
          commands.lift("columns"),
    },
  },
});''',
         '''      unsetColumns:
        () =>
        ({ commands }: any) =>
          commands.lift("columns"),
    } as any,
  },
});'''),
    ]),
    ('src/lib/notes/comment.ts', [
        ('''      unsetComment:
        () =>
        ({ commands }: any) =>
          commands.unsetMark("comment"),
    },
  },
});''',
         '''      unsetComment:
        () =>
        ({ commands }: any) =>
          commands.unsetMark("comment"),
    } as any,
  },
});'''),
    ]),
]:
    c, nl = load(path)
    for old, new in subs:
        assert old in c, 'NOT FOUND in ' + path
        c = c.replace(old, new, 1)
    save(path, c, nl)
    print('patched', path)

print('ALL DONE')
