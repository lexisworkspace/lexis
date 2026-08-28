// Single-connection driver that keeps the packaged app page ACTIVE (rAF running)
// and walks the onboarding flow. Actions are passed as argv pairs.
const http = require("http");

const get = (u) =>
  new Promise((res, rej) =>
    http.get(u, (r) => {
      let d = "";
      r.on("data", (c) => (d += c));
      r.on("end", () => res(JSON.parse(d)));
    }).on("error", rej)
  );

(async () => {
  const port = process.env.CDP_PORT || 9222;
  const pages = await get(`http://127.0.0.1:${port}/json`);
  const page = pages.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = {};
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending[m.id]) {
      pending[m.id](m);
      delete pending[m.id];
    }
  };
  const send = (method, params = {}) =>
    new Promise((res) => {
      const mid = ++id;
      pending[mid] = res;
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  // Un-stall rendering (rAF is frozen while the OS window is occluded).
  await send("Page.bringToFront");
  await send("Page.setWebLifecycleState", { state: "active" });
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });

  const ev = (expression) =>
    send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Actions from argv: "click:<text>" clicks a button by exact text,
  // "clickcontain:<text>" first button containing text, "eval:<js>" runs js,
  // "wait:<ms>" waits, "space" presses space, "text:<js>" prints body text.
  const actions = process.argv.slice(2);
  for (const a of actions) {
    if (a.startsWith("click:")) {
      const t = a.slice(6);
      const r = await ev(
        `(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()===${JSON.stringify(t)}); if(!b)return 'NO BTN:'+${JSON.stringify(t)}; b.click(); return 'clicked '+${JSON.stringify(t)}})()`
      );
      console.log(r.result.result.value);
    } else if (a.startsWith("clickcontain:")) {
      const t = a.slice(13);
      const r = await ev(
        `(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(${JSON.stringify(t)})); if(!b)return 'NO BTN:'+${JSON.stringify(t)}; b.click(); return 'clicked '+${JSON.stringify(t)}})()`
      );
      console.log(r.result.result.value);
    } else if (a.startsWith("eval:")) {
      const r = await ev(a.slice(5));
      console.log("EVAL:", JSON.stringify(r.result?.result?.value ?? r.result?.exceptionDetails?.text));
    } else if (a.startsWith("wait:")) {
      await sleep(parseInt(a.slice(5), 10));
    } else if (a === "space") {
      await ev(`window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',key:' ',bubbles:true})); 'space'`);
    } else if (a.startsWith("text")) {
      const r = await ev(`document.body.innerText.split('\\n').slice(0,7).join('|')`);
      console.log("SCREEN:", r.result.result.value);
    }
  }
  process.exit(0);
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
