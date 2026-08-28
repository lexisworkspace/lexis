const fs = require("fs");
const path = require("path");

function patch(file, pairs) {
  const p = path.resolve(file);
  let c = fs.readFileSync(p, "utf8");
  let count = 0;
  for (const [oldS, newS] of pairs) {
    if (!c.includes(oldS)) {
      console.log(`MISS ${file}: ${oldS.slice(0, 60)}`);
      continue;
    }
    c = c.split(oldS).join(newS);
    count++;
  }
  fs.writeFileSync(p, c);
  console.log(`${file}: ${count} replacements`);
}

// 1. types/index.ts - AIModel union, aliases, AI_MODELS entry
patch("src/types/index.ts", [
  ['export type AIModel = "ethos-1.2" | "logos-1.0" | "verse-0.8";',
   'export type AIModel = "ethos-1.5" | "logos-1.0" | "verse-0.8";'],
  ['  "arete-1.5": "ethos-1.2",',
   '  "arete-1.5": "ethos-1.5",'],
  ['  "jarvis-1.0": "ethos-1.2",',
   '  "jarvis-1.0": "ethos-1.5",\n  "ethos-1.2": "ethos-1.5",'],
  ['{ id: "ethos-1.2", name: "Ethos 1.2", description: "The ultimate authority in reasoning", tagline: "Exceptional context & deep analytical power", contextWindow: 20, responseStyle: "thorough" },',
   '{ id: "ethos-1.5", name: "Ethos 1.5", description: "The ultimate authority in reasoning", tagline: "Frontier-scale reasoning - Nemotron 3, 120B", contextWindow: 24, responseStyle: "thorough" },'],
]);

// 2. ai-models.ts - ethos profile rename + smarter model
patch("src/lib/ai-models.ts", [
  ['  "ethos-1.2": {\n    id: "ethos-1.2",\n    maxContextMessages: 20,\n    nvidiaModelId: "nvidia/llama-3.3-nemotron-super-49b-v1",\n    temperature: 0.6,\n    maxTokens: 1600,',
   '  "ethos-1.5": {\n    id: "ethos-1.5",\n    maxContextMessages: 24,\n    nvidiaModelId: "nvidia/nemotron-3-super-120b-a12b",\n    temperature: 0.6,\n    maxTokens: 2000,'],
]);

// 3. assistant/page.tsx - MODEL_META + thinking-state check
patch("src/app/assistant/page.tsx", [
  ['  "ethos-1.2": "Ethos 1.2",',
   '  "ethos-1.5": "Ethos 1.5",'],
  ['selectedModel === "ethos-1.2" ? t("assistant.thinkingDeeply")',
   'selectedModel === "ethos-1.5" ? t("assistant.thinkingDeeply")'],
]);

// 4. ai.ts - all ethos-1.2 id checks + error message
patch("src/lib/ai.ts", [
  ['return "Invalid model selected. Please choose Ethos 1.2, Logos 1.0, or Verse 0.8.";',
   'return "Invalid model selected. Please choose Ethos 1.5, Logos 1.0, or Verse 0.8.";'],
]);
{
  const p = path.resolve("src/lib/ai.ts");
  let c = fs.readFileSync(p, "utf8");
  const before = (c.match(/model\.id === "ethos-1\.2"/g) || []).length;
  c = c.split('model.id === "ethos-1.2"').join('model.id === "ethos-1.5"');
  fs.writeFileSync(p, c);
  console.log(`src/lib/ai.ts: ${before} id checks updated`);
}

// 5. ai-stream.ts - error message
patch("src/lib/ai-stream.ts", [
  ['const msg = "Invalid model selected. Please choose Ethos 1.2, Logos 1.0, or Verse 0.8.";',
   'const msg = "Invalid model selected. Please choose Ethos 1.5, Logos 1.0, or Verse 0.8.";'],
]);

// 6. landing page - Ethos 1.5 + version bumps
patch("src/app/landing/page.tsx", [
  ['"Three AI modes - Ethos (deep), Logos (balanced), Verse (instant) - fast queries, balanced advice, or deep analysis. Noor understands your data across all tools.",',
   '"Three AI modes - Ethos 1.5 (deep), Logos (balanced), Verse (instant) - fast queries, balanced advice, or deep analysis. Noor understands your data across all tools.",'],
  ['    name: "Ethos",\n    tag: "DEEP REASONING",\n    desc: "The ultimate authority in reasoning. Exceptional context understanding and deep analytical power.",',
   '    name: "Ethos 1.5",\n    tag: "DEEP REASONING",\n    desc: "The ultimate authority in reasoning. Now powered by NVIDIA Nemotron 3 - frontier-scale analytical power.",'],
  ['"Three distinct AI modes - Ethos, Logos, and Verse - powered by NVIDIA. From quick answers to deep strategic thinking - Noor understands your context.",',
   '"Three distinct AI modes - Ethos 1.5, Logos, and Verse - powered by NVIDIA. From quick answers to deep strategic thinking - Noor understands your context.",'],
  ['    title: "Lexis v1.0",',
   '    title: "Lexis v1.1",'],
  ['BUILT WITH CARE &middot; FOR THE CURIOUS &middot; v1.0.0',
   'BUILT WITH CARE &middot; FOR THE CURIOUS &middot; v1.1.0'],
]);

// 7. i18n.ts - version bump in 6 languages
{
  const p = path.resolve("src/lib/i18n.ts");
  let c = fs.readFileSync(p, "utf8");
  const before = (c.match(/Lexis v1\.0/g) || []).length;
  c = c.split("Lexis v1.0").join("Lexis v1.1");
  fs.writeFileSync(p, c);
  console.log(`src/lib/i18n.ts: ${before} version strings updated`);
}

// 8. privacy page - Ethos 1.5 mention
patch("src/app/privacy/page.tsx", [
  ["Noor offers three models - Ethos (deep reasoning), Logos (balanced everyday intelligence), and Verse (fast, lightweight responses).",
   "Noor offers three models - Ethos 1.5 (deep reasoning), Logos (balanced everyday intelligence), and Verse (fast, lightweight responses)."],
]);

console.log("DONE");
