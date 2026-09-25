import io, json, re, sys, urllib.request
import importlib.util as _iu
_spec = _iu.spec_from_file_location("fill2", "_tmp/i18n-fill2.py")
_f2 = _iu.module_from_spec(_spec)
_spec.loader.exec_module(_f2)

s = io.open(_f2.PATH, encoding="utf-8").read()
_, dopen, dclose = _f2.dict_region(s)
dict_src = s[dopen + 1:dclose]
span = _f2.extract_block(dict_src, "th")
pairs = _f2.parse_pairs_with_spans(dict_src[span[0]:span[1]])
en_span = _f2.extract_block(dict_src, "en")
en = _f2.parse_pairs(dict_src[en_span[0]:en_span[1]])
todo = [k for k, v in en.items() if k in pairs and pairs[k][0].strip() == v.strip()]
todo = [k for k in todo if _f2.needs_work(en[k])]
print("stubborn th keys:", todo)
for k in todo[:6]:
    print(" ", k, "=", en[k])

texts = [[k, en[k]] for k in todo]
payload = {
    "model": _f2.MODEL,
    "messages": [
        {"role": "system", "content":
            "You are a professional localizer for a productivity app called Orleia. "
            "Translate each English UI string into Thai. "
            "IMPORTANT: never reply with the English text itself - always write real Thai in Thai script. "
            "Keep it SHORT and natural (UI strings). Preserve placeholders like %s, {name}, <b></b>, emoji, and trailing punctuation. "
            "Do NOT translate the app names 'Orleia', 'Noor', 'Spark'. "
            "Return STRICT JSON mapping input keys to translations. No commentary, no markdown, no thinking."},
        {"role": "user", "content": json.dumps(
            {"target_language": "Thai", "strings": texts,
             "example": {"habits.title": "นิสัย"},
             "warning": "Reply in Thai script only."},
            ensure_ascii=False)},
    ],
    "temperature": 0.7,
    "max_tokens": 4000,
    "chat_template_kwargs": {"enable_thinking": False},
}
req = urllib.request.Request(_f2.BASE, data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json", "Authorization": "Bearer " + _f2.load_env()["NVIDIA_API_KEY"]})
with urllib.request.urlopen(req, timeout=240) as r:
    data = json.loads(r.read().decode("utf-8"))
print("RAW:", data["choices"][0]["message"]["content"][:800])
