# Repair corrupted EN values in i18n.ts from the last-good git revision.
# Strategy: load the en block from git HEAD~2 (a8bba53-era, before the AI
# fills), compare with current. If a key's current value differs from the
# old EN value AND the old value looks like English while the current does
# not, restore the old value. Report every change.
import io, subprocess
import importlib.util as iu

spec = iu.spec_from_file_location("fill2", "_tmp/i18n-fill2.py")
f2 = iu.module_from_spec(spec); spec.loader.exec_module(f2)

OLD_REV = "a8bba53"

def en_block_from(rev):
    out = subprocess.run(["git", "show", "%s:src/lib/i18n.ts" % rev],
                         capture_output=True, text=True, encoding="utf-8", errors="replace")
    s = out.stdout
    _, a, b = f2.dict_region(s)
    d = s[a + 1:b]
    span = f2.extract_block(d, "en")
    return f2.parse_pairs(d[span[0]:span[1]])

old_en = en_block_from(OLD_REV)

s = io.open(f2.PATH, encoding="utf-8").read()
_, a, b = f2.dict_region(s)
d = s[a + 1:b]
span = f2.extract_block(d, "en")
pairs = f2.parse_pairs_with_spans(d[span[0]:span[1]])

def looks_english(t):
    # crude but effective: mostly ASCII letters + English stopword hints
    if any(ord(c) > 0x2FFF for c in t):
        return False
    letters = sum(1 for c in t if c.isalpha() and ord(c) < 0x250)
    total = sum(1 for c in t if c.isalpha())
    if total == 0:
        return True
    return letters / total > 0.9

fixes = []
for k, (cur, va, vb) in pairs.items():
    old = old_en.get(k)
    if old is None or old.strip() == cur.strip():
        continue
    if looks_english(old) and not looks_english(cur):
        fixes.append((k, va, vb, old))

print("EN repairs:", len(fixes))
for k, va, vb, old in fixes[:20]:
    print("  ", k, "->", old[:60])

if fixes:
    fixes.sort(key=lambda x: x[1], reverse=True)
    block = d[span[0]:span[1]]
    for k, va, vb, old in fixes:
        block = block[:va] + f2.unescape_for_file(old) + block[vb:]
    d = d[:span[0]] + block + d[span[1]:]
    s = s[:a + 1] + d + s[b:]
    io.open(f2.PATH, "w", encoding="utf-8", newline="\n").write(s)
    print("WROTE", f2.PATH)
else:
    print("nothing to repair")
