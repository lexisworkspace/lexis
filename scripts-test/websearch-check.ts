// Verifies the web engine returns real results for the query that fumbled
// in the user's conversation. Run with: npx tsx scripts-test/websearch-check.ts
import { webSearch, isLiveQuery, buildSearchBlock } from "../src/lib/web-search";

const q =
  "research the latest gemini models and also research when is Claude Fable 5.1 coming out";

async function main() {
  console.log("live-query detected:", isLiveQuery(q));
  const results = await webSearch(q, 6);
  console.log(`got ${results.length} results:`);
  for (const r of results.slice(0, 5)) {
    console.log(`  [${r.title}]`);
    console.log(`    ${r.url}`);
    console.log(`    ${r.snippet.slice(0, 140)}`);
  }
  const block = buildSearchBlock(
    results.map((r, i) => ({
      id: "web" + i,
      kind: "web" as const,
      title: r.title,
      snippet: r.snippet,
      href: r.url,
    }))
  );
  console.log("\n--- search block header ---");
  console.log(block.split("\n")[0]);
  console.log("--- search block has results:", block.includes("[1]"));
}

main().catch((e) => {
  console.error("FAILED", e);
  process.exit(1);
});
