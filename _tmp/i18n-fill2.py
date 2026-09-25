# -*- coding: utf-8 -*-
"""
AI translation filler v2 — PARALLEL.
Same job as i18n-fill.py but batches run concurrently (8 workers), so the
whole fill takes ~8 minutes instead of ~90. Language files are updated
per-language (a language's own batches merge before its block is written,
so no write conflicts).
Usage: PYTHONIOENCODING=utf-8 python _tmp/i18n-fill2.py [--check] [--only=es,fr]
"""
import io, re, json, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

PATH = "src/lib/i18n.ts"
LANGS = ["es", "fr", "de", "pt", "ar", "pl", "it", "nl", "tr", "ja", "zh", "ko", "ru", "hi", "vi", "id", "th", "sv"]
B = 60           # keys per request
WORKERS = 8      # parallel requests

INVARIANT = {"ok", "pdf", "url", "id", "ids", "pm", "am", "wifi", "api",
             "ai", "csv", "json", "png", "svg", "pwa", "gpu", "cpu", "vs", "md"}

def load_env():
    env = {}
    for line in io.open("_tmp/.env.prod", encoding="utf-8"):
        m = re.match(r"^([A-Z_0-9]+)=(.*)$", line.strip())
        if m: env[m[1]] = m[2]
    return env

ENV = load_env()
API_KEY = ENV["NVIDIA_API_KEY"]
BASE = "https://integrate.api.nvidia.com/v1/chat/completions"
MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b"

def dict_region(s):
    # String-aware brace scan: skip string literals so placeholder-looking
    # or decorative braces inside translation values can't derail it.
    start = s.index("const dict: Record<string, Record<string, string>> = {")
    open_i = s.index("{", start)
    depth, i = 0, open_i
    in_str = False
    esc = False
    while i < len(s):
        c = s[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return start, open_i, i
        i += 1
    raise RuntimeError("dict end not found")

def extract_block(src, name):
    m = re.search(r"(?:^|\n)\s*%s:\s*\{" % re.escape(name), src, re.M)
    if not m: return None
    # String-aware brace scan: braces inside translation values (even
    # unbalanced ones) must not derail the block boundary.
    d = 0
    start = src.index("{", m.start())
    in_str = False
    esc = False
    j = start
    while j < len(src):
        c = src[j]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == "{":
                d += 1
            elif c == "}":
                d -= 1
                if d == 0: return start + 1, j
        j += 1
    return None

PAIR_RE = re.compile(r'"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"')

def parse_pairs(block):
    out = {}
    for m in PAIR_RE.finditer(block):
        k = json.loads('"' + m.group(1) + '"')
        v = json.loads('"' + m.group(2) + '"')
        out[k] = v
    return out

def parse_pairs_with_spans(block):
    out = {}
    for m in PAIR_RE.finditer(block):
        k = json.loads('"' + m.group(1) + '"')
        v = json.loads('"' + m.group(2) + '"')
        out[k] = (v, m.start(2), m.end(2))
    return out

def unescape_for_file(v):
    return json.dumps(v, ensure_ascii=False)[1:-1]

def translate_batch(texts, lang):
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content":
                "You are a professional localizer for a productivity app called Orleia. "
                "Translate each English UI string into the target language. "
                "Keep it SHORT and natural (UI strings). Preserve placeholders like %s, {name}, <b></b>, emoji, and trailing punctuation. "
                "Do NOT translate the app name 'Orleia', 'Noor', or 'Spark'. "
                "Return STRICT JSON: an object mapping the input keys to translations. No commentary, no markdown. "
                "Do NOT write any thinking or reasoning. Output ONLY the JSON object."},
            {"role": "user", "content": json.dumps({"target_language": lang, "strings": texts}, ensure_ascii=False)},
        ],
        "temperature": 0.2,
        "max_tokens": 16000,
        "chat_template_kwargs": {"enable_thinking": False},
    }
    req = urllib.request.Request(BASE, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + API_KEY})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=240) as r:
                data = json.loads(r.read().decode("utf-8"))
            txt = data["choices"][0]["message"]["content"]
            txt = re.sub(r"^```(?:json)?|```$", "", txt.strip(), flags=re.M).strip()
            txt = re.sub(r"<think>.*?</think>", "", txt, flags=re.S).strip()
            if not txt.startswith("{"):
                best = None
                for m in re.finditer(r"\{", txt):
                    d = 0
                    for j in range(m.start(), len(txt)):
                        if txt[j] == "{": d += 1
                        elif txt[j] == "}":
                            d -= 1
                            if d == 0:
                                cand = txt[m.start():j + 1]
                                if best is None or len(cand) > len(best): best = cand
                                break
                if best: txt = best
            j = json.loads(txt)
            if isinstance(j, dict): return j
        except urllib.error.HTTPError as e:
            if e.code in (401, 403):
                raise SystemExit("FATAL: auth failed (HTTP %d). Fix NVIDIA_API_KEY." % e.code)
            print("  [%s] retry %d: HTTP %d" % (lang, attempt + 1, e.code), flush=True); time.sleep(3)
        except Exception as e:
            print("  [%s] retry %d: %s" % (lang, attempt + 1, str(e)[:120]), flush=True); time.sleep(3)
    return {}

def needs_work(v):
    t = v.strip()
    if not t or len(t) <= 3: return False
    if not re.search(r"[A-Za-z\u00C0-\u024F]", t): return False
    if t.lower() in INVARIANT: return False
    if re.fullmatch(r"[\d\s%:./+-]+", t): return False
    return True

def fill_language(s, lang, check_only):
    """Returns (new_s, translated_count) for one language."""
    _, dopen, dclose = dict_region(s)
    dict_src = s[dopen + 1:dclose]
    span = extract_block(dict_src, lang)
    if not span:
        print("%s: BLOCK MISSING" % lang, flush=True)
        return s, 0
    pairs = parse_pairs_with_spans(dict_src[span[0]:span[1]])
    en_span = extract_block(dict_src, "en")
    en = parse_pairs(dict_src[en_span[0]:en_span[1]])

    todo = [k for k, v in en.items()
            if k not in pairs or pairs[k][0].strip() == v.strip()]
    todo = [k for k in todo if needs_work(en[k])]
    print("%s: %d to translate" % (lang, len(todo)), flush=True)
    if check_only or not todo:
        return s, 0

    keys = sorted(todo)
    chunks = [keys[i:i + B] for i in range(0, len(keys), B)]
    results = {}
    done_count = [0]

    def work(chunk):
        got = translate_batch([[k, en[k]] for k in chunk], lang)
        ok = 0
        for k in chunk:
            v = got.get(k)
            if isinstance(v, str) and v.strip():
                results[k] = v
                ok += 1
        done_count[0] += ok
        print("  [%s] %d/%d" % (lang, done_count[0], len(keys)), flush=True)
        return ok

    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        list(ex.map(work, chunks))

    print("%s: got %d/%d" % (lang, len(results), len(keys)), flush=True)
    if not results:
        return s, 0

    # apply replacements inside this language's block (spans are block-local)
    block = dict_src[span[0]:span[1]]
    spans = parse_pairs_with_spans(block)
    edits = []
    for k, v in results.items():
        if k in spans:
            _, a, b = spans[k]
            edits.append((a, b, unescape_for_file(v)))
    edits.sort(key=lambda e: e[0], reverse=True)
    new_block = block
    for a, b, v in edits:
        new_block = new_block[:a] + v + new_block[b:]
    # missing keys: insert at the end of the block
    missing = [k for k in results if k not in spans]
    if missing:
        tail = ""
        for k in missing:
            tail += '  "%s": "%s",\n' % (k.replace('"', '\\"'), unescape_for_file(results[k]))
        insert_at = new_block.rfind("\n") + 1
        new_block = new_block[:insert_at] + tail + new_block[insert_at:]
    dict_src = dict_src[:span[0]] + new_block + dict_src[span[1]:]
    return s[:dopen + 1] + dict_src + s[dclose:], len(results)

def main():
    check_only = "--check" in sys.argv
    only = None
    for a in sys.argv:
        if a.startswith("--only="):
            only = a.split("=", 1)[1].split(",")
    langs = [l for l in LANGS if not only or l in only]
    s = io.open(PATH, encoding="utf-8").read()
    total = 0
    for lang in langs:
        s, n = fill_language(s, lang, check_only)
        total += n
        if n and not check_only:
            io.open(PATH, "w", encoding="utf-8", newline="\n").write(s)
            print("%s: SAVED (%d strings)" % (lang, n), flush=True)
    print("DONE. total translated: %d" % total, flush=True)
    if not check_only:
        io.open(PATH, "w", encoding="utf-8", newline="\n").write(s)
        print("WROTE", PATH, flush=True)

if __name__ == "__main__":
    main()
