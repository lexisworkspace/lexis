// Minimal CDP driver for the running Lexis desktop app.
// Usage: node scripts-test/cdp.js '<js expression>'
// Connects to the first page target, evaluates, prints JSON.
const http = require("http");

function getTargets() {
  return new Promise((resolve, reject) => {
    http.get("http://127.0.0.1:9222/json", (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(JSON.parse(d)));
    }).on("error", reject);
  });
}

function evaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error("CDP timeout"));
    }, 15000);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: "Runtime.evaluate",
        params: { expression, awaitPromise: true, returnByValue: true },
      }));
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id === 1) {
        clearTimeout(timer);
        try { ws.close(); } catch {}
        resolve(msg.result);
      }
    };
    ws.onerror = (e) => {
      clearTimeout(timer);
      reject(new Error("ws error " + e.message));
    };
  });
}

(async () => {
  const targets = await getTargets();
  const page = targets.find((t) => t.type === "page");
  if (!page) throw new Error("no page target");
  const expr = process.argv[2];
  if (!expr) throw new Error("usage: node cdp.js '<expr>'");
  const result = await evaluate(page.webSocketDebuggerUrl, expr);
  if (result.exceptionDetails) {
    console.log("EXCEPTION:", JSON.stringify(result.exceptionDetails.exception?.description || result.exceptionDetails.text));
  } else {
    console.log("RESULT:", JSON.stringify(result.result?.value, null, 2));
  }
  process.exit(0);
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
