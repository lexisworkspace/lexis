// Lexis pairing server - a tiny local-only HTTP server started on demand.
//
// It runs in the Electron MAIN process (the sandboxed page cannot listen for
// connections). When the user taps "Pair with phone", the main process calls
// startPairingServer(), which:
//   - reverse-proxies the REAL Lexis web app at GET / and /pair, so the phone
//     runs the exact same app (mobile UI included) over the LAN
//   - serves the workspace JSON at GET /api/data?token=... (validated, one
//     session token, 24-hour expiry) so the app can bootstrap the desktop data
//   - accepts phone actions at POST /api/action?token=... which the desktop
//     applies to its own storage, so both devices stay in sync
// The data itself is pulled live from the renderer via a callback - so the
// phone always gets the CURRENT workspace, never a stale copy. Nothing is
// stored, logged, or uploaded anywhere; the server only listens on the local
// network for as long as the pairing session is active.
//
// Offline-first app delivery:
// Every asset of the real app used to be fetched from the internet on every
// request, which made pairing miserable on slow connections and impossible
// offline. Now the desktop keeps a small on-disk cache of the app's static
// assets (HTML, JS chunks, CSS, fonts, images). The first request for an
// asset fetches it over the internet; everything after that is served
// straight from disk over the LAN - fast, and the core workspace (dashboard,
// habits, tasks, journal, docs) works even with no internet at all. Live
// data (anything under /api/*) always passes through untouched, so Noor and
// the sync are unaffected. main.js calls warmPairingCache() the moment a
// pairing session starts, so the app shell is usually cached before the
// phone even scans the QR code.

const http = require("http");
const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Overridable via env so tests can prove offline serving (point it at a dead
// origin after warming the cache against the real one).
const APP_ORIGIN = process.env.LEXIS_APP_ORIGIN || "https://app.lexisapp.xyz";

let server = null;
let sessionToken = null;
let sessionExpires = 0;
let dataCallback = null; // async () => workspace JSON string
let actionCallback = null; // async (action) => { ok }
let cacheDir = null; // on-disk asset cache, or null to disable caching
let cacheVersion = null; // desktop version that owns the cache (stale caches are wiped)
const inflight = new Map(); // cache key -> Promise<entry|null> (dedupes concurrent fetches)

function makeToken() {
  return require("crypto").randomBytes(16).toString("hex");
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body));
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(obj));
}

// ---------------- Local asset cache ----------------

function cacheKey(pathname) {
  return crypto.createHash("sha1").update(pathname).digest("hex");
}

function entryPath(key) {
  return path.join(cacheDir, key + ".json");
}

function bodyPath(key) {
  return path.join(cacheDir, key + ".bin");
}

function readEntry(key) {
  try {
    const meta = JSON.parse(fs.readFileSync(entryPath(key), "utf8"));
    const body = fs.readFileSync(bodyPath(key));
    return { status: meta.status, headers: meta.headers, body };
  } catch (_) {
    return null;
  }
}

function writeEntry(key, entry) {
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(bodyPath(key), entry.body);
    fs.writeFileSync(entryPath(key), JSON.stringify({ status: entry.status, headers: entry.headers }));
  } catch (_) {}
}

// Headers safe to store/re-serve. CSP/HSTS/COOP/CORP are stripped because
// they would break serving over plain http; hop-by-hop headers are dropped;
// content-length is recomputed from the stored body.
function sanitizeHeaders(headers) {
  const out = {};
  for (const k of Object.keys(headers)) {
    const lk = k.toLowerCase();
    if (
      lk === "content-security-policy" ||
      lk === "strict-transport-security" ||
      lk === "cross-origin-opener-policy" ||
      lk === "cross-origin-resource-policy" ||
      lk === "transfer-encoding" ||
      lk === "connection" ||
      lk === "keep-alive" ||
      lk === "content-length" ||
      lk === "set-cookie"
    ) {
      continue;
    }
    out[k] = headers[k];
  }
  return out;
}

function serveEntry(res, entry) {
  const headers = Object.assign({}, entry.headers, { "content-length": entry.body.length });
  res.writeHead(entry.status, headers);
  res.end(entry.body);
}

function serveCantLoad(res) {
  try {
    res.writeHead(502, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(
      '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
        '<body style="background:#0a0a0a;color:#fafafa;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px">' +
        '<div><h1 style="font-family:Georgia,serif;font-weight:300;font-size:24px">Can\'t load Lexis</h1>' +
        '<p style="color:rgba(250,250,250,.55);font-size:13px;margin-top:8px">Lexis Desktop couldn\'t reach the app server. Check your internet connection and try again.</p></div></body></html>'
    );
  } catch (_) {}
}

// Fetch one asset from the real app and store it in the cache. Non-200s are
// returned but not cached. On network failure, resolves null (caller decides).
// Assets are requested gzip-compressed and stored compressed (with their
// content-encoding header), so the phone's transfer over the Wi-Fi is a few
// times smaller - important on a weak connection. Every browser decodes
// gzip, and if upstream ever answers identity instead, the entry is simply
// stored without an encoding header.
function fetchAndCache(url, key) {
  return new Promise((resolve) => {
    const target = new URL(APP_ORIGIN + url.pathname);
    const p = https.request(
      target,
      {
        method: "GET",
        headers: {
          "user-agent": "LexisDesktopPairing/1.0",
          accept: "*/*",
          "accept-encoding": "gzip",
        },
      },
      (up) => {
        const out = sanitizeHeaders(up.headers);
        const chunks = [];
        up.on("data", (c) => chunks.push(c));
        up.on("end", () => {
          const body = Buffer.concat(chunks);
          const entry = { status: up.statusCode, headers: out, body };
          if (up.statusCode === 200 && key) writeEntry(key, entry);
          resolve(entry);
        });
        up.on("error", () => resolve(null));
      }
    );
    p.on("error", () => resolve(null));
    p.setTimeout(20000, () => {
      try {
        p.destroy();
      } catch (_) {}
    });
    p.end();
  });
}

// Decode a cached body to UTF-8 text (for warm-up chunk discovery).
function entryText(entry) {
  if (!entry) return "";
  const enc = String(entry.headers["content-encoding"] || "").toLowerCase();
  if (enc === "gzip") {
    try {
      return zlib.gunzipSync(entry.body).toString("utf8");
    } catch (_) {}
  }
  return entry.body.toString("utf8");
}

// The app's client-side router fetches RSC payloads when switching tabs
// (Accept: text/x-component / application/rsc+xml, plus a ?_rsc= query).
// These MUST pass straight through with their original headers and query -
// caching them would serve the full HTML document to a router that expects
// a data payload, which is exactly the "tabs don't load" failure.
function isRscRequest(req, url) {
  if (url.searchParams.has("_rsc")) return true;
  const accept = String(req.headers.accept || "");
  return accept.includes("text/x-component") || accept.includes("application/rsc");
}

// Reverse-proxy one request. Static GETs come from the disk cache when
// possible; everything else (live /api/* data, POSTs, the router's RSC
// payload fetches) streams straight through to the real app.
function proxyToApp(req, res) {
  const url = new URL(APP_ORIGIN + req.url);
  // Cache key: pathname for normal documents/static assets, but the FULL
  // query for /_next/image (all image requests share that pathname - the
  // ?url= query is what identifies each image, so keying by pathname alone
  // would serve the first image for every image request).
  const cacheable =
    req.method === "GET" &&
    cacheDir &&
    !url.pathname.startsWith("/api/") &&
    !isRscRequest(req, url);
  const key = cacheable ? cacheKey(url.pathname + (url.pathname === "/_next/image" ? url.search : "")) : null;

  if (key) {
    const hit = readEntry(key);
    if (hit) {
      try {
        serveEntry(res, hit);
      } catch (_) {}
      return;
    }
    let pending = inflight.get(key);
    if (!pending) {
      pending = fetchAndCache(url, key).finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }
    pending.then((entry) => {
      try {
        if (res.writableEnded) return;
        if (entry) serveEntry(res, entry);
        else serveCantLoad(res);
      } catch (_) {}
    });
    return;
  }

  // Live passthrough: pairing data endpoints, API calls (Noor, TTS, ...),
  // non-GET requests. Never buffered, never cached.
  const target = new URL(APP_ORIGIN + req.url);
  const headers = Object.assign({}, req.headers, { host: target.host });
  const p = https.request(target, { method: req.method, headers }, (up) => {
    const out = sanitizeHeaders(up.headers);
    res.writeHead(up.statusCode, out);
    up.pipe(res);
  });
  p.on("error", () => serveCantLoad(res));
  req.pipe(p);
}

// Pre-fetch the app shell (and the static assets it references) so the phone
// finds everything already on disk when it scans the QR code. Best-effort:
// already-cached assets are skipped, failures are ignored, nothing blocks.
// The app shell is ALWAYS re-fetched: it's one small request, and it picks
// up new web deploys (new chunk hashes) even when the desktop version is
// unchanged - otherwise the phone would keep getting the old app from the
// cache. If the network is down the old shell stays cached and is served.
function warmPairingCache() {
  if (!cacheDir) return Promise.resolve();
  const rootKey = cacheKey("/");
  const warmRoot = fetchAndCache(new URL("/", APP_ORIGIN), rootKey);
  return warmRoot.then((entry) => {
    const html = entryText(entry);
    const seen = new Set([rootKey]);
    const jobs = [];
    const re = /\/_next\/static\/[^"'()\s]+\.(?:js|css)/g;
    let m;
    while ((m = re.exec(html)) && jobs.length < 60) {
      const assetPath = m[0];
      const k = cacheKey(assetPath);
      if (seen.has(k)) continue;
      seen.add(k);
      if (!readEntry(k)) jobs.push(assetPath);
    }
    // Fetch up to 4 at a time so a slow connection still warms quickly.
    let i = 0;
    const step = () => {
      if (i >= jobs.length) return;
      const p = jobs[i++];
      fetchAndCache(new URL(p, APP_ORIGIN), cacheKey(p)).finally(step);
    };
    for (let c = 0; c < 4; c++) step();
  });
}

async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;

  // Everything that isn't a pairing endpoint is the real app.
  if (pathname !== "/api/data" && pathname !== "/api/action" && pathname !== "/api/ping") {
    proxyToApp(req, res);
    return;
  }

  // Workspace data - requires the session token.
  if (pathname === "/api/data") {
    const token = url.searchParams.get("token") || "";
    if (!sessionToken || token !== sessionToken || Date.now() > sessionExpires) {
      sendJson(res, 401, { error: "Pairing token missing, invalid, or expired. Scan a fresh QR code from Lexis Desktop." });
      return;
    }
    try {
      if (!dataCallback) throw new Error("no data callback");
      const json = await dataCallback();
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      });
      res.end(json);
    } catch (e) {
      sendJson(res, 500, { error: "Could not read the workspace from the desktop: " + String(e && e.message || e) });
    }
    return;
  }

  // Phone actions - the mobile UI tells the desktop what to change (check a
  // habit, add a task, ...). The desktop applies it to its own storage, so
  // both devices converge. Requires the same session token.
  if (pathname === "/api/action" && req.method === "POST") {
    const token = url.searchParams.get("token") || "";
    if (!sessionToken || token !== sessionToken || Date.now() > sessionExpires) {
      sendJson(res, 401, { error: "Pairing token missing, invalid, or expired. Scan a fresh QR code from Lexis Desktop." });
      return;
    }
    try {
      let body = await readBody(req);
      let action = null;
      try {
        action = JSON.parse(body || "{}");
      } catch (_) {
        return sendJson(res, 400, { error: "Invalid JSON body" });
      }
      if (!action || typeof action !== "object" || !action.type) {
        return sendJson(res, 400, { error: "Missing action type" });
      }
      if (!actionCallback) throw new Error("no action callback");
      const result = await actionCallback(action);
      if (!result || result.ok !== true) {
        sendJson(res, 422, { error: (result && result.error) || "Action failed" });
        return;
      }
      sendJson(res, 200, { ok: true });
    } catch (e) {
      sendJson(res, 500, { error: "Could not apply action on the desktop: " + String(e && e.message || e) });
    }
    return;
  }

  // Health/ping used by the pair page to confirm the desktop is reachable.
  if (pathname === "/api/ping") {
    sendJson(res, 200, { ok: true, app: "lexis" });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

function startPairingServer({ onData, onAction, port = 8123, cacheDir: dir = null, version = null }) {
  return new Promise((resolve, reject) => {
    // A session is already live - REUSE it. The phone keeps its token and
    // stays connected; the pairing server must survive navigating around
    // the desktop app (it is NOT tied to any screen). Rotating the token
    // here would silently kill the phone's session whenever the pairing
    // screen is opened again. Only stop+restart when the session expired.
    if (server && Date.now() < sessionExpires) {
      dataCallback = onData || dataCallback;
      actionCallback = onAction || actionCallback;
      cacheDir = dir;
      cacheVersion = version || null;
      resolve({ token: sessionToken, port, expiresAt: sessionExpires });
      return;
    }
    // If a previous server is still winding down (e.g. the user left the
    // pairing screen and came straight back), wait for it to fully close
    // before binding the port again - otherwise the new listen races the
    // old one and dies with EADDRINUSE.
    const begin = () => {
      dataCallback = onData || null;
      actionCallback = onAction || null;
      cacheDir = dir;
      cacheVersion = version || null;
      // Wipe the asset cache when the desktop version changed - a cache from
      // an older build references an older web app (old chunk hashes), and
      // serving it would give the phone a stale app. First run with a
      // version marker also wipes (the marker itself didn't exist before).
      if (cacheDir && cacheVersion) {
        let cur = null;
        try {
          cur = fs.readFileSync(path.join(cacheDir, ".version"), "utf8");
        } catch (_) {}
        if (cur !== cacheVersion) {
          try {
            fs.rmSync(cacheDir, { recursive: true, force: true });
            fs.mkdirSync(cacheDir, { recursive: true });
          } catch (_) {}
          try {
            fs.writeFileSync(path.join(cacheDir, ".version"), cacheVersion);
          } catch (_) {}
        }
      }
      sessionToken = makeToken();
      sessionExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      server = http.createServer((req, res) => {
        handle(req, res).catch((e) => {
          try {
            sendJson(res, 500, { error: String(e && e.message || e) });
          } catch (_) {}
        });
      });

      server.on("error", (err) => {
        server = null;
        reject(err);
      });

      server.listen(port, "0.0.0.0", () => {
        resolve({
          token: sessionToken,
          port,
          expiresAt: sessionExpires,
        });
      });
    };

    if (server) {
      stopPairingServer().then(begin);
    } else {
      begin();
    }
  });
}

function stopPairingServer() {
  return new Promise((resolve) => {
    if (!server) {
      sessionToken = null;
      sessionExpires = 0;
      dataCallback = null;
      actionCallback = null;
      cacheDir = null;
      resolve();
      return;
    }
    const old = server;
    server = null;
    sessionToken = null;
    sessionExpires = 0;
    dataCallback = null;
    actionCallback = null;
    cacheDir = null;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    try {
      // Force-close keep-alive connections so close() fires promptly.
      if (typeof old.closeAllConnections === "function") old.closeAllConnections();
      old.close(finish);
    } catch (_) {
      finish();
    }
    // Safety net: never hang the caller if close() never fires.
    const safety = setTimeout(finish, 2000);
    if (safety.unref) safety.unref();
  });
}

module.exports = { startPairingServer, stopPairingServer, warmPairingCache };
