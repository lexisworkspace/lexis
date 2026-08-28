import { buildSearchBlock } from "../src/lib/web-search";

const block = buildSearchBlock([
  {
    id: "t",
    kind: "web",
    title: "Gemini (language model)",
    snippet: "test (Wikipedia, last updated Aug 14, 2026)",
    href: "https://en.wikipedia.org/wiki/Gemini_(language_model)",
  },
]);
console.log(block.includes("FRESHNESS & HONESTY RULES") ? "FRESHNESS RULES: present OK" : "MISSING freshness rules");
console.log(block.includes("training knowledge has a cutoff") ? "CUTOFF RAIL: present OK" : "MISSING cutoff rail");
console.log(block.includes("last updated Aug 14, 2026") ? "DATE STAMP: present OK" : "MISSING date stamp");
console.log("----");
console.log(block.slice(-900));
