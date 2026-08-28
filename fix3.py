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
# 1. i18n.ts - within the 20-line block after each zoomIn line,
#    remove the 3 duplicated readingTime/paragraphs/sentences
# ============================================================
path = 'src/lib/i18n.ts'
c, nl = load(path)
lines = c.split('\n')
out = []
after = 0
removed = 0
for ln in lines:
    if after > 0:
        after -= 1
        if re.match(r'^    "notes\.(readingTime|paragraphs|sentences)":', ln):
            removed += 1
            continue
    out.append(ln)
    if '"notes.zoomIn":' in ln:
        after = 20
c = '\n'.join(out)
save(path, c, nl)
print('i18n: removed', removed, 'duplicate lines')

# ============================================================
# 2. columns.ts + comment.ts - cast commands object as any
# ============================================================
for path, subs in [
    ('src/lib/notes/columns.ts', [
        ('''            commands.lift("columns"),
    };
  },
});''',
         '''            commands.lift("columns"),
    } as any;
  },
});'''),
    ]),
    ('src/lib/notes/comment.ts', [
        ('''            commands.unsetMark("comment"),
    };
  },
});''',
         '''            commands.unsetMark("comment"),
    } as any;
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
