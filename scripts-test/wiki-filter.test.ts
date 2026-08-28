// Verifies the Wikipedia relevance filter: "latest gemini models" must not
// surface GPT-5.2 / Imagen / Generative AI (pure "models"-word matches).
const WIKI_STOPWORDS = new Set([
  "a", "an", "the", "of", "for", "to", "in", "on", "at", "with", "and", "or",
  "also", "from", "about", "into", "like", "such", "than", "their", "them",
  "latest", "new", "best", "top", "most", "recent", "upcoming", "current",
  "model", "models", "list", "info", "information", "update", "updates",
  "research", "release", "releases", "released", "launch", "launches",
  "launched", "date", "dates", "version", "versions", "story", "stories",
  "when", "what", "which", "who", "where", "why", "how", "is", "are", "was",
  "were", "do", "does", "did", "can", "could", "will", "would", "has", "have",
  "get", "gets", "got", "tell", "show", "find", "look", "need", "wanna",
  "want", "make", "made", "use", "used", "using", "know", "think", "like",
]);

function topicTokens(q: string): string[] {
  const toks = new Set<string>();
  for (const w of q.toLowerCase().split(/[^a-z0-9]+/)) {
    if (w.length < 3) continue;
    if (/^\d+$/.test(w)) continue;
    if (WIKI_STOPWORDS.has(w)) continue;
    toks.add(w);
  }
  return [...toks];
}

const clean = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();

async function wikiSearchOne(rawQ: string, limit = 6) {
  const q =
    rawQ
      .replace(/\b\d+(?:\.\d+)+\b/g, " ")
      .replace(/\b(?:release|launch)\s+dates?\b/gi, " ")
      .replace(/\s{2,}/g, " ")
      .trim() || rawQ;
  const res = await fetch(
    "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
      encodeURIComponent(q) +
      "&srlimit=" + limit +
      "&srprop=snippet|timestamp&format=json&origin=*",
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  const data = await res.json();
  const items: { title?: string; snippet?: string; timestamp?: string }[] = data?.query?.search || [];
  const fmtDate = (iso?: string) =>
    iso && !isNaN(new Date(iso).getTime())
      ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "";
  const toResult = (it: { title?: string; snippet?: string; timestamp?: string }) => {
    const d = fmtDate(it.timestamp);
    const base = clean(it.snippet || "");
    return d ? `${base} (Wikipedia, last updated ${d})` : base;
  };
  const tokens = topicTokens(q);
  if (tokens.length === 0) return items.map((it) => toResult(it));
  const scored = items.map((it) => {
    const title = (it.title || "").toLowerCase();
    const snip = clean(it.snippet || "").toLowerCase();
    let titleHit = false;
    let score = 0;
    for (const t of tokens) {
      if (title.includes(t)) { titleHit = true; score += 2; }
      if (snip.includes(t)) score += 1;
    }
    return { it, titleHit, score };
  });
  const titleHits = scored.filter((s) => s.titleHit);
  const anyHits = scored.filter((s) => s.score > 0);
  const kept = titleHits.length >= 2 ? titleHits : anyHits.length >= 1 ? anyHits : scored;
  return kept.slice(0, limit).map(({ it }) => toResult(it));
}

async function main() {
  let fails = 0;

  const gemini = await wikiSearchOne("latest gemini models");
  console.log("== 'latest gemini models' ->");
  for (const t of gemini) console.log("   " + t);
  const dated = gemini.filter((t) => /last updated [A-Z][a-z]{2} \d{1,2}, \d{4}/.test(t));
  if (dated.length === 0) {
    console.log("FAIL: no results carry a last-updated date");
    fails++;
  } else {
    console.log("   (" + dated.length + "/" + gemini.length + " carry last-updated dates)");
  }
  console.log("   tokens:", JSON.stringify(topicTokens("latest gemini models")));
  if (gemini.some((t) => /gpt-5\.2|^imagen|^generative ai/i.test(t))) {
    console.log("FAIL: irrelevant results leaked");
    fails++;
  }
  if (!gemini.some((t) => /\bgemini\b/i.test(t))) {
    console.log("FAIL: no real Gemini articles");
    fails++;
  }

  const claude = await wikiSearchOne("claude fable 5.1 release date");
  console.log("== 'claude fable 5.1 release date' ->");
  for (const t of claude) console.log("   " + t);
  console.log("   tokens:", JSON.stringify(topicTokens("claude fable")));
  if (!claude.some((t) => /\bclaude\b/i.test(t))) {
    console.log("FAIL: no Claude articles for the Claude query");
    fails++;
  }

  // Full user query through the splitter, mirroring searchWikipedia.
  const cleaned = "latest gemini models and claude fable 5.1 release date";
  const parts = cleaned.split(/\s+(?:and|also|&)\s+/i).map((s) => s.trim()).filter(Boolean);
  console.log("== full query parts:", JSON.stringify(parts));
  const combined: string[] = [];
  for (const p of parts) combined.push(...(await wikiSearchOne(p, 6)));
  console.log("== combined results:");
  for (const t of combined.slice(0, 8)) console.log("   " + t);
  if (combined.some((t) => /gpt-5\.2/i.test(t))) {
    console.log("FAIL: GPT-5.2 still present for the Gemini query");
    fails++;
  }

  console.log(fails === 0 ? "\nALL PASS ✓" : `\n${fails} FAILURES ✗`);
  process.exit(fails === 0 ? 0 : 1);
}

main();
