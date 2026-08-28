// Node test for phone-first sync: direction detection (bootstrapPaired) and
// the workspace.import action (applyPairAction). Run: npx tsx scripts-test/pair-direction.test.ts
import { storage } from "../src/lib/storage";
import { applyPairAction } from "../src/lib/pair-actions";
import { bootstrapPaired, pushWorkspaceToDesktop } from "../src/lib/pair-sync";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`  PASS  ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name}${extra ? "  -> " + extra : ""}`);
  }
}

// Minimal localStorage/IndexedDB shims so the storage singleton works in Node.
(globalThis as any).localStorage = {
  _m: new Map<string, string>(),
  getItem(k: string) { return this._m.get(k) ?? null; },
  setItem(k: string, v: string) { this._m.set(k, String(v)); },
  removeItem(k: string) { this._m.delete(k); },
};
(globalThis as any).indexedDB = undefined;

async function main() {
  console.log("== workspace.import action (phone -> desktop) ==");
  await storage.init();
  // Seed a fresh-ish workspace the way a phone-first user would have it.
  storage.createHabit({ name: "Morning run", description: "", categoryId: "health", frequency: "daily", timeOfDay: "morning", targetCount: 1, color: "#6366f1", icon: "🏃" });
  storage.createTask({ title: "Call mom", description: "", status: "todo", priority: "high", dueDate: null, dueTime: null, completedAt: null, tags: [], listId: null, recurring: "none", recurringEndDate: null, estimatedMinutes: null });
  const before = storage.exportData();
  check("phone has seeded content", before.includes("Morning run") && before.includes("Call mom"));

  // Simulate the phone POSTing its whole workspace to the (empty) desktop.
  const result = applyPairAction({ type: "workspace.import", json: before });
  check("workspace.import ok", result.ok === true);
  const after = storage.exportData();
  check("desktop adopted the phone's workspace", after.includes("Morning run") && after.includes("Call mom"));

  console.log("== bootstrapPaired direction detection ==");
  // Case: desktop empty + phone has data -> phone-first
  // We simulate a real desktop: its workspace starts EMPTY, and applying a
  // workspace.import REPLACES it, so later /api/data calls return the phone's
  // data (exactly what the real desktop's storage does).
  const realFetch = globalThis.fetch;
  let desktopWorkspace = JSON.stringify({ onboardingCompleted: false, habits: [], tasks: [], notes: [], journalEntries: [] });
  (globalThis as any).fetch = async (url: any, init?: any) => {
    const u = String(url);
    if (u.includes("/api/data")) {
      return new Response(desktopWorkspace, { status: 200 });
    }
    if (u.includes("/api/action")) {
      // simulate the desktop applying the import to ITS OWN storage
      const body = JSON.parse(String(init?.body || "{}"));
      if (body.type === "workspace.import") desktopWorkspace = String(body.json || "{}");
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return new Response("{}", { status: 404 });
  };
  // pair-sync checks window.location - shim a paired-looking environment.
  (globalThis as any).window = {
    location: { protocol: "http:", href: "http://192.168.0.10:8123/?token=test", search: "?token=test" },
    setInterval: () => 0 as any,
    addEventListener: () => {},
    visibilityState: "visible",
  };
  (globalThis as any).sessionStorage = {
    _m: new Map<string, string>([["lexis-pair-token", "test"]]),
    getItem(k: string) { return this._m.get(k) ?? null; },
    setItem(k: string, v: string) { this._m.set(k, String(v)); },
    removeItem(k: string) { this._m.delete(k); },
  };
  const sessionRe = /sessionStorage/;

  // Reset storage to a phone-first state: has content.
  const data = JSON.parse(before);
  data.onboardingCompleted = true;
  (storage as any).data = { ...(storage as any).data, ...data };
  (storage as any).saveData();

  const dir = await bootstrapPaired();
  check("desktop empty + phone has data -> phone-first", dir.status === "phone-first", `status=${dir.status}`);

  // Now push the phone's workspace to the desktop.
  const pushed = await pushWorkspaceToDesktop();
  check("pushWorkspaceToDesktop succeeds", pushed === true, `pushed=${pushed}`);

  (globalThis as any).fetch = realFetch;
  console.log(failures === 0 ? "\nALL DIRECTION CHECKS PASSED" : `\n${failures} FAILURES`);
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
