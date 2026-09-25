# Insert translations for the single short key the filler skips
# (habits.pet.title = "Pet", 3 chars < the needs_work minimum).
import io
import importlib.util as iu

spec = iu.spec_from_file_location("fill2", "_tmp/i18n-fill2.py")
f2 = iu.module_from_spec(spec); spec.loader.exec_module(f2)

KEY = "habits.pet.title"
VALS = {
    "es": "Mascota", "fr": "Compagnon", "de": "Haustier", "pt": "Bichinho",
    "ar": "حيوان أليف", "pl": "Pupil", "it": "Compagno", "nl": "Huisdier",
    "tr": "Dost", "ja": "ペット", "zh": "宠物", "ko": "반려동물",
    "ru": "Питомец", "hi": "पालतू", "vi": "Thú cưng", "id": "Hewan peliharaan",
    "th": "สัตว์เลี้ยง", "sv": "Husdjur",
}

s = io.open(f2.PATH, encoding="utf-8").read()
_, a, b = f2.dict_region(s)
d = s[a + 1:b]
inserted = 0
for lang, val in VALS.items():
    span = f2.extract_block(d, lang)
    if not span:
        continue
    block = d[span[0]:span[1]]
    if '"%s"' % KEY in block:
        continue
    tail = '  "%s": "%s",\n' % (KEY, f2.unescape_for_file(val))
    insert_at = block.rfind("\n") + 1
    block = block[:insert_at] + tail + block[insert_at:]
    d = d[:span[0]] + block + d[span[1]:]
    inserted += 1

s = s[:a + 1] + d + s[b:]
io.open(f2.PATH, "w", encoding="utf-8", newline="\n").write(s)
print("inserted", inserted, "translations for", KEY)
