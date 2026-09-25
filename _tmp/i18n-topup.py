# Top-up pass for stubborn i18n keys that still echo English verbatim.
# Differences vs i18n-fill2.py:
#   - tiny batches (12) so the model sees fewer strings at once
#   - anti-echo system prompt: explicitly forbid returning the English source
#   - results that still equal the EN source are rejected and retried once
#   - invariant words (Orleia/Noor/Spark and friends) may match; those are
#     stripped before the echo comparison
# Idempotent and filler-compatible: writes the same file format.
import io, json, re, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

PATH = "src/lib/i18n.ts"
B = 12
WORKERS = 6

# Reuse the battle-tested scanner/parser/env helpers from the main filler.
import importlib.util as _iu
_spec = _iu.spec_from_file_location("fill2", "_tmp/i18n-fill2.py")
_f2 = _iu.module_from_spec(_spec)
try:
    _spec.loader.exec_module(_f2)
except SystemExit:
    pass

ENV = _f2.load_env()
API_KEY = ENV["NVIDIA_API_KEY"]
BASE = "https://integrate.api.nvidia.com/v1/chat/completions"
MODEL = _f2.MODEL

dict_region = _f2.dict_region
extract_block = _f2.extract_block
parse_pairs = _f2.parse_pairs
parse_pairs_with_spans = _f2.parse_pairs_with_spans
unescape_for_file = _f2.unescape_for_file
needs_work = _f2.needs_work
INVARIANT = getattr(_f2, "INVARIANT", set())
LANGS = _f2.LANGS


def strip_invariants(s):
    for w in INVARIANT:
        s = s.replace(w, "").replace(w.lower(), "").replace(w.upper(), "")
    return s.strip()

# Values that are legitimately identical in every locale: acronyms,
# keyboard shortcuts, standards names, the app's own marks, lone symbols.
UNTRANSLATABLE = re.compile(
    r"^(?:(?:[A-Z0-9.]{1,8}|[A-Za-z]{1,3})(?:[\s/+&.-]+(?:[A-Z0-9.]{1,8}|[A-Za-z]{1,3}))*"
    r"|(?:Ctrl|Cmd|Alt|Shift|Del|Tab|Esc|Enter|Space)(?:[+ ](?:Ctrl|Cmd|Alt|Shift|Del|Tab|Esc|Enter|Space|[A-Z]))*"
    r"|[A-Z]{2,}\d*"
    r"|[\d\s%:./+()×–-]+"
    r"|[✓✔✕×→←↑↓⚡️☕]*"
    r")$"
)
APP_WORDS = re.compile(r"^(Orleia|Noor|Spark)( Office)?[\s!.,…?]*$")

NON_LATIN = {"ar", "ja", "zh", "ko", "ru", "hi", "th"}


def is_lazy_echo(lang, en_v, v):
    """True when the translation is a lazy echo rather than a cognate.
    'Total' -> 'Total' is correct Spanish; 'Total cost' -> 'Total cost'
    is not correct anything. Non-Latin targets must never echo Latin text.
    Values that are legitimately locale-invariant (ranges, standards,
    brand names) are never lazy."""
    if not translatable_en(en_v):
        return False
    e = strip_invariants(en_v.strip())
    t = strip_invariants(v.strip())
    if t.lower() != e.lower() or not e:
        return False
    if lang in NON_LATIN:
        return True
    return " " in e


def translatable_en(v):
    """False when the EN source is legitimately locale-invariant."""
    t = v.strip()
    if UNTRANSLATABLE.match(t) or APP_WORDS.match(t):
        return False
    # Mostly non-letters (icons, "12/24", "Ctrl+P" handled above)
    letters = re.sub(r"[^A-Za-zÀ-ÿ\u0600-\u06FF\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]", "", t)
    if len(letters) <= 2:
        return False
    return True

# A native-script example per language so the model can't answer in English.
NATIVE_SAMPLE = {
    "es": "hábitos", "fr": "habitudes", "de": "Gewohnheiten", "pt": "hábitos",
    "ar": "العادات", "pl": "nawyki", "it": "abitudini", "nl": "gewoontes",
    "tr": "alışkanlıklar", "ja": "習慣", "zh": "习惯", "ko": "습관",
    "ru": "привычки", "hi": "आदतें", "vi": "thói quen", "id": "kebiasaan",
    "th": "นิสัย", "sv": "vanor",
}
LANG_NAMES = {
    "es": "Spanish", "fr": "French", "de": "German", "pt": "Portuguese",
    "ar": "Arabic", "pl": "Polish", "it": "Italian", "nl": "Dutch",
    "tr": "Turkish", "ja": "Japanese", "zh": "Simplified Chinese",
    "ko": "Korean", "ru": "Russian", "hi": "Hindi", "vi": "Vietnamese",
    "id": "Indonesian", "th": "Thai", "sv": "Swedish",
}


def translate_batch_anti_echo(texts, lang):
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content":
                "You are a professional localizer for a productivity app called Orleia. "
                "Translate each English UI string into " + LANG_NAMES.get(lang, lang) + ". "
                "IMPORTANT: never reply with the English text itself - always write real " + LANG_NAMES.get(lang, lang) + ". "
                "Keep it SHORT and natural (UI strings). Preserve placeholders like %s, {name}, <b></b>, emoji, and trailing punctuation. "
                "Do NOT translate the app names 'Orleia', 'Noor', 'Spark'. "
                "Return STRICT JSON mapping input keys to translations. No commentary, no markdown, no thinking."},
            {"role": "user", "content": json.dumps(
                {"target_language": LANG_NAMES.get(lang, lang),
                 "example": {"habits.title": NATIVE_SAMPLE.get(lang, "")},
                 "strings": texts,
                 "warning": "These strings were previously mistranslated as plain English. Translate properly into " + LANG_NAMES.get(lang, lang) + " this time."},
                ensure_ascii=False)},
        ],
        "temperature": 0.5,
        "max_tokens": 8000,
        "chat_template_kwargs": {"enable_thinking": False},
    }
    req = urllib.request.Request(BASE, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + API_KEY})
    for attempt in range(5):
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
            if isinstance(j, dict):
                return j
            print("  [%s] attempt %d: not a dict" % (lang, attempt + 1), flush=True)
        except urllib.error.HTTPError as e:
            if e.code in (401, 403):
                raise SystemExit("FATAL: auth failed (HTTP %d)" % e.code)
            print("  [%s] retry %d: HTTP %d" % (lang, attempt + 1, e.code), flush=True); time.sleep(3)
        except Exception as e:
            print("  [%s] retry %d: %s" % (lang, attempt + 1, str(e)[:120]), flush=True); time.sleep(3)
    return {}


def topup_language(s, lang):
    _, dopen, dclose = dict_region(s)
    dict_src = s[dopen + 1:dclose]
    span = extract_block(dict_src, lang)
    if not span:
        print("%s: BLOCK MISSING" % lang, flush=True)
        return s, 0
    pairs = parse_pairs_with_spans(dict_src[span[0]:span[1]])
    en_span = extract_block(dict_src, "en")
    en = parse_pairs(dict_src[en_span[0]:en_span[1]])

    # The stubborn set: EN value present but echoed verbatim — minus the
    # values that are legitimately identical in every locale.
    todo = [k for k, v in en.items()
            if k in pairs and pairs[k][0].strip() == v.strip()]
    # a11y.* keys reference accessibility standards (WCAG, Section 508,
    # EN 301 549) — never translated in UIs.
    todo = [k for k in todo if not k.startswith("a11y.")]
    todo = [k for k in todo if needs_work(en[k]) and translatable_en(en[k])]
    print("%s: %d stubborn" % (lang, len(todo)), flush=True)
    if not todo:
        return s, 0

    keys = sorted(todo)
    chunks = [keys[i:i + B] for i in range(0, len(keys), B)]
    results = {}
    done = [0]

    def work(chunk):
        got = translate_batch_anti_echo([[k, en[k]] for k in chunk], lang)
        retry_items = []
        for k in chunk:
            v = got.get(k)
            if isinstance(v, str) and v.strip():
                if not is_lazy_echo(lang, en[k], v):
                    results[k] = v
                    done[0] += 1
                else:
                    retry_items.append(k)
        if retry_items:
            got2 = translate_batch_anti_echo([[k, en[k]] for k in retry_items], lang)
            for k in retry_items:
                v = got2.get(k)
                if isinstance(v, str) and v.strip() and not is_lazy_echo(lang, en[k], v):
                    results[k] = v
                    done[0] += 1
        print("  [%s] %d/%d" % (lang, done[0], len(keys)), flush=True)
        return done[0]

    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        list(ex.map(work, chunks))

    print("%s: converted %d/%d" % (lang, len(results), len(keys)), flush=True)
    if not results:
        return s, 0

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
    dict_src = dict_src[:span[0]] + new_block + dict_src[span[1]:]
    return s[:dopen + 1] + dict_src + s[dclose:], len(results)


def main():
    only = None
    for a in sys.argv:
        if a.startswith("--only="):
            only = a.split("=", 1)[1].split(",")
    langs = [l for l in LANGS if not only or l in only]
    s = io.open(PATH, encoding="utf-8").read()
    total = 0
    for lang in langs:
        s, n = topup_language(s, lang)
        total += n
        if n:
            io.open(PATH, "w", encoding="utf-8", newline="\n").write(s)
            print("%s: SAVED (%d strings)" % (lang, n), flush=True)
    print("DONE. total converted: %d" % total, flush=True)


if __name__ == "__main__":
    main()
