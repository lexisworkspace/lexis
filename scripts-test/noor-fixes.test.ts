// Node test for the Noor fixes: web-search hijack, bulk-action summary,
// and duplicate handling. Run with: npx tsx scripts-test/noor-fixes.test.ts
import { detectAction } from "../src/lib/ai-actions";
import { processActionReply } from "../src/lib/ai-actions";
import { stripActionRemnants, sanitizeStoredReply } from "../src/lib/ai-actions";
import { isLiveQuery } from "../src/lib/web-search";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`  PASS  ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name}${extra ? "  -> " + extra : ""}`);
  }
}

console.log("== 1. Web-search hijack (user's exact query) ==");
const q = "research the latest gemini models and also research when is Claude Fable 5.1 coming out";
const act = detectAction(q);
check(
  "detectAction does NOT hijack 'research...gemini...coming out'",
  act.matched === false,
  `matched=${act.matched} type=${act.type}`
);
check("isLiveQuery detects the query (web path)", isLiveQuery(q) === true);
check(
  "plain local search still works: 'search my notes for gemini'",
  detectAction("search my notes for gemini").type === "search_data"
);
check(
  "'find my notes about X' still local-searches",
  detectAction("find my notes about the plan").type === "search_data"
);
check(
  "'look up my task list' still local-searches",
  detectAction("look up my task list").type === "search_data"
);

console.log("== 2. Bulk action reply -> one clean summary ==");
// Replicates the shape of the model's real bulk output: preamble prose,
// then several LEXIS_ACTION lines, no closing sentence.
const bulkReply = `I'll create all the habits and tasks for your daily routine in bulk. Here they are:
LEXIS_ACTION {"action":"create_habit","params":{"name":"Morning Stretching","frequency":"daily","timeOfDay":"09:00"}}
LEXIS_ACTION {"action":"create_habit","params":{"name":"Meditation","frequency":"daily"}}
LEXIS_ACTION {"action":"create_task","params":{"title":"Prepare Healthy Breakfast"}}
LEXIS_ACTION {"action":"create_task","params":{"title":"Review Schedule and Prioritize Tasks"}}
LEXIS_ACTION {"action":"create_habit","params":{"name":"Focus Work Block","frequency":"daily"}}
`;
const out1 = processActionReply(bulkReply) || "(null)";
console.log("  output:", JSON.stringify(out1));
check("bulk reply returns a single short summary", out1.includes("Done!"));
check("summary counts habits", /created 3 habits/.test(out1), out1);
check("summary counts tasks", /and 2 tasks/.test(out1), out1);
check("no raw per-item confirmation leaked", !out1.includes("Start tracking today to build your streak"), out1);
check("no duplicate confirmation lines", (out1.match(/I've/g) || []).length <= 1, out1);

console.log("== 3. Duplicate pass (re-run same bulk) ==");
const out2 = processActionReply(bulkReply) || "(null)";
console.log("  output:", JSON.stringify(out2));
check("duplicates reported as skipped", /skipped/.test(out2), out2);
check("still ends with a short summary", out2.includes("Done!"), out2);

console.log("== 4. Single action reply stays rich ==");
const single = processActionReply(
  'LEXIS_ACTION {"action":"create_habit","params":{"name":"Drink Water","frequency":"daily"}}'
) || "(null)";
console.log("  output:", JSON.stringify(single));
check("single action keeps its full confirmation", single.includes("Drink Water") && single.includes("streak"), single);

console.log("== 5. Model's own trailing 'Done' is not duplicated ==");
const trailing = processActionReply(
  `Here you go:
LEXIS_ACTION {"action":"create_habit","params":{"name":"Read 10 pages","frequency":"daily"}}
LEXIS_ACTION {"action":"create_habit","params":{"name":"Journal for 5 minutes","frequency":"daily"}}
Done!`
) || "(null)";
console.log("  output:", JSON.stringify(trailing));
check("no double 'Done!'", (trailing.match(/Done!/g) || []).length === 1, trailing);

console.log("== 6. Misspelled markers must never leak raw JSON ==");
const leaked = `LEVIS_ACTION {"action":"create_task","params":{"title":"Define key features and functionalities of academic SaaS"}}`;
const cleaned = stripActionRemnants(leaked);
check("LEVIS_ACTION (missing X) is stripped", !/LEVIS_ACTION|create_task/.test(cleaned) && cleaned === "", cleaned);
check("LEXIS_ACTION with space is stripped", stripActionRemnants(`ok\nLEXIS ACTION {"action":"create_task","params":{}}`) === "ok", stripActionRemnants(`ok\nLEXIS ACTION {"action":"create_task","params":{}}`));
check("LEXIS-ACTION with hyphen is stripped", stripActionRemnants(`ok\nLEXIS-ACTION {"action":"create_task","params":{}}`) === "ok");
check("LEXISACTION (no separator) is stripped", stripActionRemnants(`ok\nLEXISACTION{"action":"create_task","params":{}}`) === "ok");
const prose = "Here are the next steps for your project.";
check("healthy stored reply is untouched", sanitizeStoredReply(prose) === prose);
check("leaked stored reply is cleaned", sanitizeStoredReply(leaked) === "");
const typoExec = processActionReply(
  `Your new task:\nLEVIS_ACTION {"action":"create_task","params":{"title":"Typo marker task"}}`
);
console.log("  typo-marker output:", JSON.stringify(typoExec));
check(
  "typo'd marker still EXECUTES the action in the background",
  !!typoExec && /Typo marker task/.test(typoExec) && !/LEVIS_ACTION/.test(typoExec),
  typoExec || "(null)"
);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
