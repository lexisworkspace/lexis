# Final audit: real localization problems vs. legitimate identical words.
# A problem = key missing from a language block, or a LAZY echo
# (multi-word EN echoed in a Latin language, or any Latin echo in a
# non-Latin language). Single-word Latin cognates (Total, Neutral) are OK.
import io
import importlib.util as iu

spec = iu.spec_from_file_location("fill2", "_tmp/i18n-fill2.py")
f2 = iu.module_from_spec(spec); spec.loader.exec_module(f2)
spec2 = iu.spec_from_file_location("top", "_tmp/i18n-topup.py")
top = iu.module_from_spec(spec2)
try:
    spec2.loader.exec_module(top)
except SystemExit:
    pass

s = io.open(f2.PATH, encoding="utf-8").read()
_, a, b = f2.dict_region(s)
d = s[a + 1:b]
espan = f2.extract_block(d, "en")
en = f2.parse_pairs(d[espan[0]:espan[1]])

real_missing = 0
real_lazy = 0
for lang in f2.LANGS:
    span = f2.extract_block(d, lang)
    if not span:
        print(lang, "BLOCK MISSING")
        continue
    pairs = f2.parse_pairs(d[span[0]:span[1]])
    missing = [k for k in en if k not in pairs]
    lazy = []
    for k, v in en.items():
        if k in pairs:
            if top.is_lazy_echo(lang, v, pairs[k]):
                lazy.append(k)
    real_missing += len(missing)
    real_lazy += len(lazy)
    if missing or lazy:
        print("%s: %d missing, %d lazy" % (lang, len(missing), len(lazy)))
        for k in lazy[:6]:
            print("   lazy:", k, "=", en[k])

print("TOTAL missing:", real_missing, "| lazy:", real_lazy)
