// Standalone test of desktop/pair-server.js: data, ping, action (ok + reject),
// token auth, and 24h expiry shape.
const { startPairingServer, stopPairingServer } = require("../desktop/pair-server");

const actions = [];
async function run() {
  const info = await startPairingServer({
    port: 8124,
    onData: async () => JSON.stringify({ ok: true, workspace: "live", theme: { language: "en" } }),
    onAction: async (action) => {
      actions.push(action);
      if (action.type === "boom") return { ok: false, error: "boom failed" };
      return { ok: true };
    },
  });
  const base = `http://127.0.0.1:${info.port}`;
  const q = (path) => fetch(base + path).then((r) => r.json());

  let pass = 0, fail = 0;
  const check = (name, cond) => { cond ? pass++ : (fail++, console.log("FAIL:", name)); };

  // token exists
  check("token present", typeof info.token === "string" && info.token.length === 32);
  check("24h expiry", info.expiresAt - Date.now() > 23 * 60 * 60 * 1000 && info.expiresAt - Date.now() < 25 * 60 * 60 * 1000);

  // page - the server reverse-proxies the real app (no longer a static
  // pair page), so the shell must be the Next.js app document.
  const page = await fetch(base + "/").then((r) => r.text());
  check("proxy serves the real app shell", page.includes("ORLEIA") && page.includes("_next/static"));

  // ping
  const ping = await q("/api/ping");
  check("ping ok", ping.ok === true);

  // data with token
  const data = await q(`/api/data?token=${info.token}`);
  check("data ok", data.ok === true && data.workspace === "live");

  // data with wrong token
  const bad = await fetch(base + "/api/data?token=nope").then((r) => r.json());
  check("wrong token rejected", bad.error && bad.error.includes("token"));

  // action ok
  const actOk = await fetch(base + `/api/action?token=${info.token}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "task.add", title: "Test" }),
  }).then((r) => r.json());
  check("action ok", actOk.ok === true && actions.length === 1 && actions[0].type === "task.add");

  // action failure
  const actBad = await fetch(base + `/api/action?token=${info.token}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "boom" }),
  }).then((r) => r.json());
  check("action failure mapped", actBad.error === "boom failed");

  // action without token
  const actNoTok = await fetch(base + "/api/action", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "task.add", title: "X" }),
  }).then((r) => r.json());
  check("action no token rejected", actNoTok.error && actNoTok.error.includes("token"));

  // invalid json
  const actBadJson = await fetch(base + `/api/action?token=${info.token}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: "not json",
  }).then((r) => r.json());
  check("invalid json rejected", actBadJson.error && actBadJson.error.includes("JSON"));

  await stopPairingServer();
  console.log(`PASS: ${pass}  FAIL: ${fail}`);
  process.exit(fail ? 1 : 0);
}
run().catch((e) => { console.error(e); process.exit(1); });
