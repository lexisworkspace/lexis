import fs from "fs";
import { QUESTIONS } from "./questions.mjs";

const key = fs
  .readFileSync(".env.local", "utf8")
  .match(/NVIDIA_API_KEY=(\S+)/)?.[1]
  ?.replace(/["']/g, "")
  .trim();

const MODELS = [
  { id: "ethos-1.5", label: "Ethos 1.5 (Nemotron 3 Super 120B)", model: "nvidia/nemotron-3-super-120b-a12b" },
  { id: "nemotron-ultra-550b", label: "Nemotron 3 Ultra 550B (reference)", model: "nvidia/nemotron-3-ultra-550b-a55b" },
  { id: "llama-3.3-70b", label: "Llama 3.3 70B (reference)", model: "meta/llama-3.3-70b-instruct" },
];

async function callStreaming(model, prompt, timeoutMs = 75000) {
  const started = Date.now();
  let firstTokenAt = 0;
  let full = "";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.3,
        stream: true,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok || !res.body) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `http${res.status} ${txt.slice(0, 120)}`, ms: Date.now() - started, firstTokenAt: 0, full: "" };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const j = JSON.parse(payload);
          const delta = j?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) {
            if (!firstTokenAt) firstTokenAt = Date.now() - started;
            full += delta;
          }
        } catch {
          /* skip */
        }
      }
    }
    return { ok: true, error: "", ms: Date.now() - started, firstTokenAt: firstTokenAt || 0, full: full.trim() };
  } catch (e) {
    return { ok: false, error: e.name === "AbortError" ? "timeout" : e.message, ms: Date.now() - started, firstTokenAt: 0, full: "" };
  } finally {
    clearTimeout(timer);
  }
}

const results = {};
for (const m of MODELS) results[m.id] = { label: m.label, tasks: [], passes: 0, fails: 0, errors: 0, totalMs: 0, firstTokenSum: 0 };

for (const m of MODELS) {
  console.log(`\n=== ${m.label} ===`);
  // run this model's questions in parallel (5 at a time to respect quota)
  const chunk = 5;
  for (let i = 0; i < QUESTIONS.length; i += chunk) {
    const batch = QUESTIONS.slice(i, i + chunk);
    const outs = await Promise.all(batch.map((q) => callStreaming(m.model, q.prompt)));
    for (let k = 0; k < batch.length; k++) {
      const q = batch[k];
      const r = outs[k];
      const rec = results[m.id];
      rec.totalMs += r.ms;
      rec.firstTokenSum += r.firstTokenAt;
      let passed = false;
      let status = "ERROR";
      if (r.ok) {
        passed = q.check(r.full);
        status = passed ? "PASS" : "FAIL";
        if (passed) rec.passes++;
        else rec.fails++;
        const answer = r.full.replace(/\n+/g, " ").slice(0, 100);
        console.log(`  ${q.id.padEnd(14)} ${status}  (${r.ms}ms, first ${r.firstTokenAt}ms)  ${answer}`);
      } else {
        rec.errors++;
        console.log(`  ${q.id.padEnd(14)} ERROR (${r.error}) ${r.ms}ms`);
      }
    }
  }
}

console.log("\n\n================ SUMMARY ================");
for (const m of MODELS) {
  const r = results[m.id];
  const pct = Math.round((r.passes / QUESTIONS.length) * 100);
  console.log(
    `${r.label}\n  PASS ${r.passes}/${QUESTIONS.length} (${pct}%) | FAIL ${r.fails} | ERR ${r.errors} | avg total ${Math.round(r.totalMs / QUESTIONS.length)}ms | avg first-token ${Math.round(r.firstTokenSum / Math.max(1, r.passes + r.fails))}ms`
  );
}

fs.writeFileSync("bench/results.json", JSON.stringify(results, null, 2));
console.log("saved bench/results.json");
