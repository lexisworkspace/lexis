// Captures the app's REAL tab-switch (RSC payload) request via CDP and saves
// it (url + headers) so it can be replayed through the pairing server.
const http = require("http");
const fs = require("fs");

const get = (u) =>
  new Promise((res, rej) =>
    http.get(u, (r) => {
      let d = "";
      r.on("data", (c) => (d += c));
      r.on("end", () => res(JSON.parse(d)));
    }).on("error", rej)
  );

(async () => {
  const port = process.env.CDP_PORT || 9227;
  const pages = await get(`http://127.0.0.1:${port}/json`);
  const page = pages.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = {};
  const captured = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending[m.id]) {
      pending[m.id](m);
      delete pending[m.id];
      return;
    }
    if (m.method === "Network.requestWillBeSent" && m.params.request.url.includes("_rsc")) {
      captured.push({
        type: "request",
        url: m.params.request.url,
        headers: m.params.request.headers,
      });
    }
    if (m.method === "Network.responseReceived") {
      const url = m.params.response.url;
      const cap = captured.find((c) => c.type === "request" && c.url === url);
      if (cap) {
        cap.type = "response";
        cap.status = m.params.response.status;
        cap.contentType = m.params.response.headers["content-type"] || "";
      }
    }
  };
  const send = (method, params = {}) =>
    new Promise((res) => {
      const mid = ++id;
      pending[mid] = res;
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  await send("Network.enable");
  await send("Page.enable");
  await send("Page.bringToFront");

  // Unlock (real profile may show the password gate). If the gate is up, we
  // can't proceed without the password - report that clearly.
  const state = await send("Runtime.evaluate", {
    expression: `document.body.innerText.slice(0, 120)`,
    returnByValue: true,
  });
  const screen = state.result?.result?.value || "";
  console.log("screen:", screen.replace(/\n/g, " | ").slice(0, 100));

  if (/unlock|welcome back/i.test(screen)) {
    console.log("PASSWORD GATE: cannot drive tabs on the real profile.");
    process.exit(2);
  }

  // Trigger a real tab switch (same as tapping the bottom nav / sidebar).
  await send("Runtime.evaluate", {
    expression: `(()=>{const a=[...document.querySelectorAll('a')].find(x=>x.getAttribute('href')==='/tasks'); if(!a)return 'NO LINK'; a.click(); return 'clicked /tasks'})()`,
    returnByValue: true,
  });
  await new Promise((r) => setTimeout(r, 4000));

  if (captured.length === 0) {
    console.log("NO RSC REQUEST captured (maybe already on /tasks or nav differs)");
    process.exit(3);
  }
  const req = captured.find((c) => c.type === "request");
  const resp = captured.find((c) => c.type === "response");
  fs.writeFileSync("/tmp/rsc-req.json", JSON.stringify({ url: req.url, headers: req.headers }, null, 2));
  console.log("captured RSC request:", req.url.slice(0, 90));
  console.log("response:", resp ? resp.status + " " + resp.contentType : "(no response seen)");
  console.log("key headers:", JSON.stringify({ accept: req.headers.accept, rsc: req.headers["rsc"] || req.headers.RSC, tree: (req.headers["next-router-state-tree"] || "").slice(0, 40) }));
  process.exit(0);
})().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
