// Standalone test for the pairing server's offline app cache.
// 1. Warm the cache against the REAL app (app.lexisapp.xyz).
// 2. Stop that server, restart one whose upstream origin is DEAD.
// 3. If / still returns 200 with real HTML, the app is served from disk -
//    i.e. the phone works even with no internet.

const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { startPairingServer, stopPairingServer, warmPairingCache } = require("../desktop/pair-server");

const CACHE = fs.mkdtempSync(path.join(os.tmpdir(), "pair-cache-test-"));
const PORT = 8399;

function get(url, headers) {
  return new Promise((resolve, reject) => {
    // Like a real phone browser: negotiate gzip, decode it. Extra headers
    // (e.g. the RSC marker) are merged in.
    http
      .get(
        url,
        { headers: Object.assign({ "accept-encoding": "gzip, deflate, br" }, headers || {}) },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            let body = Buffer.concat(chunks);
            const enc = String(res.headers["content-encoding"] || "").toLowerCase();
            if (enc === "gzip") {
              const zlib = require("zlib");
              body = zlib.gunzipSync(body);
            }
            resolve({ status: res.statusCode, headers: res.headers, body: body.toString("utf8") });
          });
        }
      )
      .on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  // --- Phase 1: warm against the real site ---
  const info = await startPairingServer({ port: PORT, cacheDir: CACHE, onData: () => "{}", onAction: () => ({ ok: true }) });
  console.log("phase1: server on", PORT, "token", info.token.slice(0, 8));

  await warmPairingCache();
  // Give the chunk fetches a moment, then wait for the cache to fill.
  for (let i = 0; i < 60; i++) {
    const files = fs.readdirSync(CACHE).filter((f) => f.endsWith(".bin"));
    if (files.length >= 2) break;
    await sleep(500);
  }
  const warmed = fs.readdirSync(CACHE).filter((f) => f.endsWith(".bin")).length;
  console.log("phase1: cached", warmed, "assets");

  const first = await get(`http://127.0.0.1:${PORT}/`);
  console.log("phase1: GET / ->", first.status, "html:", first.body.slice(0, 40).replace(/\n/g, " "));
  if (first.status !== 200 || !/<html/i.test(first.body)) throw new Error("warm fetch failed");

  // Also verify an action round-trips through the cached server (live endpoints unaffected).
  const ping = await get(`http://127.0.0.1:${PORT}/api/ping`);
  console.log("phase1: /api/ping ->", ping.status, ping.body.trim());
  if (ping.status !== 200) throw new Error("ping failed");

  // Regression: the app's tab-switch (RSC) requests must NEVER be served the
  // cached HTML document. The real discriminator is the RSC: 1 header - a
  // real router request must come back as text/x-component flight data, even
  // with /habits cached as a document from the request above.
  const rsc = await get(`http://127.0.0.1:${PORT}/tasks?_rsc=test123`, {
    accept: "text/x-component",
    rsc: "1",
  });
  console.log("phase1: RSC /tasks ->", rsc.status, rsc.headers["content-type"] || "");
  if (!String(rsc.headers["content-type"] || "").includes("text/x-component")) {
    throw new Error("RSC request got the cached HTML document - tab navigation would break on the phone");
  }

  await stopPairingServer();
  console.log("phase1: server stopped");

  // --- Phase 2: offline — upstream origin is a dead port ---
  const child = spawn(
    process.execPath,
    [
      "-e",
      `process.env.ORLEIA_APP_ORIGIN = "http://127.0.0.1:1";` +
        `const { startPairingServer } = require(${JSON.stringify(path.resolve(__dirname, "../desktop/pair-server"))});` +
        `startPairingServer({ port: ${PORT}, cacheDir: ${JSON.stringify(CACHE)} }).then(() => console.log("child-ready"));`,
    ],
    { stdio: ["ignore", "pipe", "inherit"] }
  );

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("child never became ready")), 15000);
    child.stdout.on("data", (d) => {
      if (String(d).includes("child-ready")) {
        clearTimeout(t);
        resolve();
      }
    });
  });

  const offline = await get(`http://127.0.0.1:${PORT}/`);
  console.log("phase2 (dead upstream): GET / ->", offline.status, "html:", offline.body.slice(0, 40).replace(/\n/g, " "));
  if (offline.status !== 200 || !/<html/i.test(offline.body)) throw new Error("offline serve FAILED - phone would break without internet");
  console.log("phase2: served from disk with NO internet — PASS");

  const offlinePing = await get(`http://127.0.0.1:${PORT}/api/ping`);
  console.log("phase2: /api/ping ->", offlinePing.status);
  if (offlinePing.status !== 200) throw new Error("offline ping failed");

  child.kill();
  fs.rmSync(CACHE, { recursive: true, force: true });
  console.log("ALL CACHE TESTS PASSED");
}

main().catch((e) => {
  console.error("TEST FAILED:", e.message);
  process.exit(1);
});
