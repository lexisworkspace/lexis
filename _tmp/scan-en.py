# List every EN value that does not look like English (corruption scan).
import io, json
import importlib.util as iu

spec = iu.spec_from_file_location("fill2", "_tmp/i18n-fill2.py")
f2 = iu.module_from_spec(spec); spec.loader.exec_module(f2)

s = io.open(f2.PATH, encoding="utf-8").read()
_, a, b = f2.dict_region(s)
d = s[a + 1:b]
span = f2.extract_block(d, "en")
pairs = f2.parse_pairs(d[span[0]:span[1]])

def looks_english(t):
    if any(ord(c) > 0x2FFF for c in t):
        return False
    letters = sum(1 for c in t if c.isalpha() and ord(c) < 0x250)
    total = sum(1 for c in t if c.isalpha())
    if total == 0:
        return True
    return letters / total > 0.9

bad = [(k, v) for k, v in pairs.items() if v.strip() and not looks_english(v)]
print("non-English EN values:", len(bad))
for k, v in bad:
    print(" ", k, "=", v[:90])
