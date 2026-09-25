import io, json, sys, urllib.request
import importlib.util as iu
spec = iu.spec_from_file_location("fill2", "_tmp/i18n-fill2.py"); f2 = iu.module_from_spec(spec); spec.loader.exec_module(f2)
spec2 = iu.spec_from_file_location("top", "_tmp/i18n-topup.py"); top = iu.module_from_spec(spec2)
try: spec2.loader.exec_module(top)
except SystemExit: pass

lang = sys.argv[1] if len(sys.argv) > 1 else "es"
s = io.open(f2.PATH, encoding="utf-8").read()
_, a, b = f2.dict_region(s)
d = s[a+1:b]
span = f2.extract_block(d, lang); pairs = f2.parse_pairs_with_spans(d[span[0]:span[1]])
espan = f2.extract_block(d, "en"); en = f2.parse_pairs(d[espan[0]:espan[1]])
todo = [k for k, v in en.items() if k in pairs and pairs[k][0].strip() == v.strip()]
todo = [k for k in todo if f2.needs_work(en[k]) and top.translatable_en(en[k])]
texts = [[k, en[k]] for k in todo[:12]]
print("asking for", len(texts), "keys")

payload = {
    "model": f2.MODEL,
    "messages": [
        {"role": "system", "content":
            "You are a professional localizer for a productivity app called Orleia. "
            "Translate each English UI string into " + top.LANG_NAMES.get(lang, lang) + ". "
            "IMPORTANT: never reply with the English text itself - always write real " + top.LANG_NAMES.get(lang, lang) + ". "
            "Keep it SHORT and natural (UI strings). Preserve placeholders like %s, {name}, <b></b>, emoji, and trailing punctuation. "
            "Do NOT translate the app names 'Orleia', 'Noor', 'Spark'. "
            "Return STRICT JSON mapping input keys to translations. No commentary, no markdown, no thinking."},
        {"role": "user", "content": json.dumps(
            {"target_language": top.LANG_NAMES.get(lang, lang),
             "example": {"habits.title": top.NATIVE_SAMPLE.get(lang, "")},
             "strings": texts,
             "warning": "These strings were previously mistranslated as plain English. Translate properly into " + top.LANG_NAMES.get(lang, lang) + " this time."},
            ensure_ascii=False)},
    ],
    "temperature": 0.5,
    "max_tokens": 8000,
    "chat_template_kwargs": {"enable_thinking": False},
}
req = urllib.request.Request(f2.BASE, data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json", "Authorization": "Bearer " + f2.load_env()["NVIDIA_API_KEY"]})
with urllib.request.urlopen(req, timeout=240) as r:
    data = json.loads(r.read().decode("utf-8"))
raw = data["choices"][0]["message"]["content"]
print("RAW FIRST 1200:")
print(raw[:1200])
