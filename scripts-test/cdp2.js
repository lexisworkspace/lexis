// CDP driver with REAL input events.
// Usage:
//   node scripts-test/cdp2.js eval '<js>'            -> Runtime.evaluate
//   node scripts-test/cdp2.js click '<selector>'     -> real mouse click at element center
//   node scripts-test/cdp2.js clicktext '<text>'     -> real mouse click on first button containing text
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

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    ws.onopen = () => {
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && pending.has(msg.id)) {
          const p = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.error) p.rej(new Error(msg.error.message));
          else p.res(msg.result);
        }
      };
      resolve({
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const mid = ++id;
            pending.set(mid, { res, rej });
            ws.send(JSON.stringify({ id: mid, method, params }));
          });
        },
        close() { try { ws.close(); } catch {} },
      });
    };
    ws.onerror = () => reject(new Error("ws error"));
  });
}

(async () => {
  const targets = await getTargets();
  const page = targets.find((t) => t.type === "page");
  if (!page) throw new Error("no page target");
  const c = await connect(page.webSocketDebuggerUrl);
  const mode = process.argv[2];

  if (mode === "eval") {
    const expr = process.argv[3];
    const r = await c.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) console.log("EXCEPTION:", r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    else console.log("RESULT:", JSON.stringify(r.result?.value, null, 2));
  } else if (mode === "click") {
    const selector = process.argv[3];
    const r = await c.send("Runtime.evaluate", {
      expression: `(()=>{const el=document.querySelector(${JSON.stringify(selector)}); if(!el) return null; const b=el.getBoundingClientRect(); return {x:b.x+b.width/2, y:b.y+b.height/2, w:b.width, h:b.height}})()`,
      returnByValue: true,
    });
    const pt = r.result?.value;
    if (!pt) { console.log("NO ELEMENT"); process.exit(1); }
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pt.x, y: pt.y });
    await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: pt.x, y: pt.y, button: "left", clickCount: 1 });
    await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pt.x, y: pt.y, button: "left", clickCount: 1 });
    console.log("CLICKED", JSON.stringify(selector), "at", pt.x.toFixed(0), pt.y.toFixed(0));
  } else if (mode === "clicktext") {
    const text = process.argv[3];
    const r = await c.send("Runtime.evaluate", {
      expression: `(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()===${JSON.stringify(text)}); if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`,
      returnByValue: true,
    });
    const pt = r.result?.value;
    if (!pt) { console.log("NO BUTTON:", text); process.exit(1); }
    await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pt.x, y: pt.y });
    await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: pt.x, y: pt.y, button: "left", clickCount: 1 });
    await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pt.x, y: pt.y, button: "left", clickCount: 1 });
    console.log("CLICKED TEXT:", text, "at", pt.x.toFixed(0), pt.y.toFixed(0));
  } else {
    console.log("usage: cdp2.js eval '<js>' | click '<sel>' | clicktext '<text>'");
  }
  setTimeout(() => process.exit(0), 200);
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
