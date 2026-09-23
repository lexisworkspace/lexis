// ============================================================
// Orleia Spark — main process.
// Standalone privacy-first browser. Own window, own data dir,
// own protocol (spark://). The renderer never touches Node.
// ============================================================

const {
  app, BrowserWindow, ipcMain, session, protocol, shell, net,
  nativeTheme, Menu, dialog, globalShortcut,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { BrowserEngine } = require("./browser-engine");

const isDev = !app.isPackaged;

// Single instance
const { exec } = require("child_process");
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_e, argv) => {
    const url = (argv || []).find((a) => /^(https?|spark):\/\//i.test(a));
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      if (url && url.startsWith("spark://")) openFromDeepLink(url);
      else if (url && engine) {
        const t = engine.createTab({ url });
        engine.setActive(t.id);
      }
    }
  });
}

let mainWindow = null;
let engine = null;

// Shared secret for Orleia's guarded AI endpoints. Set SPARK_CLIENT_SECRET
// when packaging; falls back to CRON_SECRET for dev builds.
// Shared secret for Orleia's guarded AI endpoints. The real value lives in
// spark.config.local.json (gitignored); spark.config.json is the committed
// placeholder that keeps builds working without the secret.
let bundledSparkSecret = "";
for (const cfg of ["spark.config.local.json", "spark.config.json"]) {
  try {
    bundledSparkSecret = JSON.parse(fs.readFileSync(path.join(__dirname, cfg), "utf8")).sparkClientSecret || "";
    if (bundledSparkSecret) break;
  } catch {}
}
const SPARK_SECRET = process.env.SPARK_CLIENT_SECRET || bundledSparkSecret || "";

// Stable per-install device id (same "x-orleia-device" semantics as the app,
// so Noor usage counts against the same daily cap per device).
function deviceIdentity() {
  const file = path.join(DATA_DIR, "device-id");
  try { return fs.readFileSync(file, "utf8").trim(); } catch {}
  const id = "spark-" + require("crypto").randomBytes(16).toString("hex");
  try { fs.writeFileSync(file, id, "utf8"); } catch {}
  return id;
}

// ------------------------------------------------------------
// Local stores (all on device, JSON, human-inspectable)
// ------------------------------------------------------------
const DATA_DIR = app.getPath("userData");
const STORE_DIR = path.join(DATA_DIR, "browser");
try { fs.mkdirSync(STORE_DIR, { recursive: true }); } catch {}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(STORE_DIR, file), "utf8")); } catch { return fallback; }
}
function writeJson(file, data) {
  try { fs.writeFileSync(path.join(STORE_DIR, file), JSON.stringify(data), "utf8"); } catch {}
}

// ------------------------------------------------------------
// Error net — last resort so no exception EVER surfaces as
// Electron's modal "A JavaScript error occurred in the main
// process" dialog (the "syntax error" popup users reported).
// Appends to a readable log the user can inspect; the app
// keeps running.
// ------------------------------------------------------------
function logError(kind, err) {
  try {
    const line = `[${new Date().toISOString()}] ${kind}: ${err && err.stack ? err.stack : String(err)}\n`;
    fs.appendFileSync(path.join(STORE_DIR, "error.log"), line, "utf8");
  } catch {}
  if (process.env.SPARK_DEBUG) console.error(`[spark:${kind}]`, err);
}
process.on("uncaughtException", (err) => logError("uncaught", err));
process.on("unhandledRejection", (err) => logError("rejection", err));

const bookmarks = {
  list: readJson("bookmarks.json", []),
  add(b) { this.list.push({ ...b, id: "bm_" + Date.now().toString(36), at: new Date().toISOString() }); writeJson("bookmarks.json", this.list); },
  remove(id) { this.list = this.list.filter((x) => x.id !== id); writeJson("bookmarks.json", this.list); },
};

// ------------------------------------------------------------
// Bookmark import/export — Netscape HTML (every browser's format)
// and JSON. All parsing happens here in the main process; the
// renderer only ever sees the result counts.
// ------------------------------------------------------------
function parseNetscapeBookmarks(html) {
  const out = [];
  const re = /<a\s+[^>]*href="(https?:\/\/[^""]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && out.length < 2000) {
    const url = m[1];
    const title = m[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    if (url && !out.some((b) => b.url === url)) out.push({ url, title: title || url });
  }
  return out;
}
function bookmarksHtml() {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const items = bookmarks.list.map((b) => {
    const ts = b.at ? Math.floor(new Date(b.at).getTime() / 1000) : "";
    return `    <DT><A HREF="${esc(b.url)}" ADD_DATE="${ts}">${esc(b.title || b.url)}</A>`;
  }).join("\n");
  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n${items}\n</DL><p>\n`;
}

const history = {
  list: readJson("history.json", []),
  add(url, title) {
    this.list = this.list.filter((x) => x.url !== url);
    this.list.unshift({ url, title, at: new Date().toISOString() });
    this.list = this.list.slice(0, 5000);
    writeJson("history.json", this.list);
  },
  search(q, limit = 200) {
    const s = (q || "").toLowerCase();
    return this.list
      .filter((x) => !s || x.url.toLowerCase().includes(s) || (x.title || "").toLowerCase().includes(s))
      .slice(0, limit);
  },
  clear() { this.list = []; writeJson("history.json", this.list); },
};

const clips = {
  list: readJson("clips.json", []),
  add(c) { this.list.unshift({ ...c, id: "clip_" + Date.now().toString(36), at: new Date().toISOString() }); this.list = this.list.slice(0, 500); writeJson("clips.json", this.list); },
  remove(id) { this.list = this.list.filter((x) => x.id !== id); writeJson("clips.json", this.list); },
};

const settings = {
  data: readJson("settings.json", {
    // privacy
    shields: true, httpsOnly: true, blockThirdPartyCookies: true, doNotTrack: false, safeBrowsingNotice: true,
    // browsing
    searchEngine: "duckduckgo", homepage: "", zoomLevel: 1, spellcheck: true,
    // appearance
    theme: "dark", uiScale: 100, accent: "violet", compactTabs: false,
    // startup
    restoreSession: true, newTabPosition: "afterActive",
  }),
  get(k) { return this.data[k]; },
  set(k, v) { this.data[k] = v; writeJson("settings.json", this.data); },
  merge(patch) { Object.assign(this.data, patch); writeJson("settings.json", this.data); },
};

// Migrate silent v1 defaults: anything unset gets the new default once.
(function migrateSettings() {
  let touched = false;
  for (const [k, v] of Object.entries({
    blockThirdPartyCookies: true, doNotTrack: false, spellcheck: true,
    theme: "dark", uiScale: 100, accent: "violet", compactTabs: false,
    restoreSession: true, newTabPosition: "afterActive", homepage: "",
  })) {
    if (settings.data[k] === undefined) { settings.data[k] = v; touched = true; }
  }
  // zoomLevel stores a zoom FACTOR (1 = 100%). A stored 0 would blank pages.
  if (!settings.data.zoomLevel || Number(settings.data.zoomLevel) < 0.5) { settings.data.zoomLevel = 1; touched = true; }
  if (touched) writeJson("settings.json", settings.data);
})();

// ---------- theme ----------
// The UI chrome reads nativeTheme; "system" follows the OS, dark/light force it.
function applyTheme() {
  const t = settings.get("theme");
  nativeTheme.themeSource = t === "light" ? "light" : t === "dark" ? "dark" : "system";
}
applyTheme();
ipcMain.on("theme:changed", () => applyTheme());

// ---------- settings side effects ----------
// A settings write fans out to every subsystem that honors it.
function applySettingsSideEffects(key, value) {
  switch (key) {
    case "theme":
      applyTheme();
      break;
    case "spellcheck":
      if (engine) engine.spellcheck = value !== false;
      break;
    case "zoomLevel": {
      const factor = Number(value) || 1;
      if (engine) {
        engine.zoomFactor = factor;
        for (const t of engine.tabs.values()) {
          try { t.view.webContents.setZoomFactor(factor); } catch {}
        }
      }
      break;
    }
    case "newTabPosition":
      if (engine) engine.newTabPosition = value || "afterActive";
      break;
    case "doNotTrack":
      if (engine) engine.doNotTrack = !!value;
      break;
    case "blockThirdPartyCookies":
      if (engine) engine.cookiePolicy = value === false ? "none" : "third-party";
      break;
    case "uiScale":
    case "accent":
    case "compactTabs":
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("ui-prefs-changed", {
          uiScale: settings.get("uiScale"),
          accent: settings.get("accent"),
          compactTabs: settings.get("compactTabs"),
          theme: settings.get("theme"),
        });
      }
      break;
  }
}

// Re-apply everything (used at UI boot and after engine restarts).
function applyAllSettings() {
  applyTheme();
  if (engine) {
    engine.spellcheck = settings.get("spellcheck") !== false;
    engine.zoomFactor = Number(settings.get("zoomLevel")) || 1;
    engine.doNotTrack = !!settings.get("doNotTrack");
    engine.cookiePolicy = settings.get("blockThirdPartyCookies") === false ? "none" : "third-party";
    engine.newTabPosition = settings.get("newTabPosition") || "afterActive";
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("ui-prefs-changed", {
      uiScale: settings.get("uiScale"),
      accent: settings.get("accent"),
      compactTabs: settings.get("compactTabs"),
      theme: settings.get("theme"),
    });
  }
}

// ------------------------------------------------------------
// spark:// protocol — local pages (new tab, reader fallback)
// ------------------------------------------------------------
protocol.registerSchemesAsPrivileged([
  { scheme: "spark", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function newTabHTML() {
  // Minimal monochrome NTP: ghost logo + one input, on the transparent view.
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { background: transparent; }
    @font-face { font-family:'Instrument Sans Variable'; src:url('spark://font-instrument') format('woff2-variations'); font-weight:100 900; }
    @font-face { font-family:'Fraunces Variable'; src:url('spark://font-fraunces') format('woff2-variations'); font-weight:100 900; }
    body { height:100vh; display:flex; align-items:center; justify-content:center;
      color:#fff; font-family:'Instrument Sans Variable',system-ui,-apple-system,'Segoe UI',sans-serif; }
    .logo { width:96px; height:96px; background:center/contain no-repeat url('spark://ghost'); }
    form { width:min(520px, 84vw); display:flex; margin-top:34px; }
    input { flex:1; padding:14px 20px; border-radius:13px 0 0 13px; border:1px solid #2a2a2e; border-right:none;
      background:rgba(255,255,255,0.05); color:#fff; font-size:14.5px; outline:none; }
    input:focus { border-color:#4a4a50; }
    input::placeholder { color:rgba(255,255,255,0.32); }
    button { padding:0 20px; border-radius:0 13px 13px 0; border:1px solid #2a2a2e;
      background:rgba(255,255,255,0.08); color:#fff; cursor:pointer; font-size:13.5px; }
    button:hover { background:rgba(255,255,255,0.14); }
    @keyframes bloom { from { opacity:0; transform:scale(0.9); } }
    @keyframes rise { from { opacity:0; transform:translateY(10px); } }
    .logo { animation: bloom 0.6s cubic-bezier(0.2,0.7,0.2,1) backwards; }
    form { animation: rise 0.5s 0.15s cubic-bezier(0.2,0.7,0.2,1) backwards; }
    @media (prefers-reduced-motion: reduce) { .logo, form { animation: none; } }
  </style></head><body>
    <div style="display:flex;flex-direction:column;align-items:center">
      <div class="logo"></div>
      <form onsubmit="event.preventDefault(); location.href='spark://search?q='+encodeURIComponent(document.getElementById('q').value)">
        <input id="q" autofocus placeholder="Search or type a URL">
        <button>→</button>
      </form>
    </div>
  </body></html>`;
}

// Search engines offered in Settings; duckduckgo is the default.
const SEARCH_ENGINES = {
  duckduckgo: (q) => "https://duckduckgo.com/?q=" + encodeURIComponent(q),
  brave: (q) => "https://search.brave.com/search?q=" + encodeURIComponent(q),
  startpage: (q) => "https://www.startpage.com/sp/search?query=" + encodeURIComponent(q),
  mojeek: (q) => "https://www.mojeek.com/search?q=" + encodeURIComponent(q),
  google: (q) => "https://www.google.com/search?q=" + encodeURIComponent(q),
};

function searchUrl(q) {
  const engine = SEARCH_ENGINES[settings.get("searchEngine")] || SEARCH_ENGINES.duckduckgo;
  return engine(q);
}

// protocol.handle expects a Promise<Response> (or a plain Response).
// The old callback-style shape belongs to the removed registerFileProtocol
// API and silently serves empty documents if you get this wrong.
async function handleSparkProtocol(req) {
  const url = req.url;
  if (url === "spark://newtab" || url === "spark://newtab/" || url.startsWith("spark://newtab?")) {
    return new Response(Buffer.from(newTabHTML()), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  if (url.startsWith("spark://logo")) {
    try {
      const file = path.join(__dirname, "assets", "spark-icon.png");
      return new Response(fs.readFileSync(file), {
        headers: { "content-type": "image/png" },
      });
    } catch {
      return new Response("not found", { status: 404 });
    }
  }
  if (url.startsWith("spark://font-instrument")) {
    try {
      const file = path.join(__dirname, "ui", "fonts", "instrument-sans-latin-wght-normal.woff2");
      return new Response(fs.readFileSync(file), { headers: { "content-type": "font/woff2" } });
    } catch { return new Response("not found", { status: 404 }); }
  }
  if (url.startsWith("spark://font-fraunces")) {
    try {
      const file = path.join(__dirname, "ui", "fonts", "fraunces-latin-wght-normal.woff2");
      return new Response(fs.readFileSync(file), { headers: { "content-type": "font/woff2" } });
    } catch { return new Response("not found", { status: 404 }); }
  }
  if (url.startsWith("spark://ghost")) {
    try {
      const file = path.join(__dirname, "assets", "spark-ghost.png");
      return new Response(fs.readFileSync(file), {
        headers: { "content-type": "image/png" },
      });
    } catch {
      return new Response("not found", { status: 404 });
    }
  }
  if (url.startsWith("spark://search?q=") || url.startsWith("spark://search/?q=")) {
    const q = decodeURIComponent(url.split("q=")[1] || "");
    return Response.redirect(searchUrl(q), 302);
  }
  return new Response("not found", { status: 404 });
}

// ------------------------------------------------------------
// Window
// ------------------------------------------------------------
function loadWindowState() {
  try { return JSON.parse(fs.readFileSync(path.join(STORE_DIR, "window.json"), "utf8")); } catch {}
  return { width: 1280, height: 820, x: undefined, y: undefined, maximized: false };
}
function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  writeJson("window.json", {
    width: mainWindow.getBounds().width,
    height: mainWindow.getBounds().height,
    x: mainWindow.getBounds().x,
    y: mainWindow.getBounds().y,
    maximized: mainWindow.isMaximized(),
  });
}

function createMainWindow() {
  const state = loadWindowState();
  mainWindow = new BrowserWindow({
    width: state.width, height: state.height, x: state.x, y: state.y,
    minWidth: 940, minHeight: 600,
    show: false,
    title: "Orleia Spark",
    backgroundColor: "#0b0b14",
    icon: path.join(__dirname, "assets", "spark.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  if (state.maximized) mainWindow.maximize();

  engine = new BrowserEngine(mainWindow, {
    registerProtocol: (ses) => ses.protocol.handle("spark", handleSparkProtocol),
    dataDir: DATA_DIR,
    historyStore: history,
    cookiePolicy: settings.get("blockThirdPartyCookies") === false ? "none" : "third-party",
    doNotTrack: !!settings.get("doNotTrack"),
    zoomFactor: Number(settings.get("zoomLevel")) || 1,
    newTabPosition: settings.get("newTabPosition") || "afterActive",
    onEvent: (type, payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("browser-event", { type, payload });
      }
    },
  });
  engine.spellcheck = settings.get("spellcheck") !== false;
  engine.zoomFactor = Number(settings.get("zoomLevel")) || 1;

  mainWindow.loadFile(path.join(__dirname, "ui", "index.html"));
  mainWindow.once("ready-to-show", () => mainWindow.show());

  // Chrome insets live in the engine (set via chrome:insets IPC); re-layout on geometry changes.
  const relayout = () => { if (engine) engine.setChromeInsets({ top: engine.uiTop, left: engine.uiLeft, right: engine.uiRight || 0 }); };
  mainWindow.on("resize", relayout);
  mainWindow.on("maximize", relayout);
  mainWindow.on("unmaximize", relayout);
  mainWindow.on("enter-full-screen", relayout);
  mainWindow.on("leave-full-screen", relayout);
  mainWindow.on("close", () => {
    saveWindowState();
    try {
      if (engine) {
        const urls = engine.publicTabs().filter((t) => t.url && !t.url.startsWith("spark://") && !t.private).map((t) => t.url);
        writeJson("session.json", urls);
      }
    } catch {}
  });
  mainWindow.on("closed", () => { engine.destroy(); mainWindow = null; });
}

function openFromDeepLink(url) {
  if (!engine) return;
  const m = String(url).match(/^spark:\/\/(open|clip)\?payload=(.+)$/);
  if (m) {
    try {
      const payload = JSON.parse(decodeURIComponent(m[2]));
      if (m[1] === "clip" && payload.text) {
        clips.add({ title: payload.title || "Clip", text: payload.text, url: payload.url || "" });
      }
      if (payload.url) {
        const tab = engine.createTab({ url: payload.url });
        engine.setActive(tab.id);
      }
    } catch {}
  }
}

// ------------------------------------------------------------
// IPC — everything the renderer can ask for
// ------------------------------------------------------------
function registerIpc() {
  ipcMain.on("chrome:insets", (_e, insets) => { if (engine) engine.setChromeInsets(insets); });
  ipcMain.on("page-input", (_e, { enabled }) => { if (engine) engine.setPageInputEnabled(!!enabled); });
  ipcMain.on("ui:log-error", (_e, { kind, detail }) => logError(`ui:${kind}`, new Error(detail)));

  ipcMain.handle("tab:create", (_e, opts) => { const t = engine.createTab(opts || {}); return engine.publicTab(t); });
  ipcMain.handle("tab:close", (_e, id) => { try { engine.closeTab(id); } catch (err) { logError("tab:close", err); } return true; });
  ipcMain.handle("tab:activate", (_e, id) => { try { engine.setActive(id); } catch (err) { logError("tab:activate", err); } return true; });
  ipcMain.handle("tab:list", () => engine.publicTabs());
  ipcMain.handle("tab:navigate", (_e, { id, url }) => { engine.navigate(id, url); return true; });
  ipcMain.handle("tab:back", (_e, id) => { engine.goBack(id); return true; });
  ipcMain.handle("tab:forward", (_e, id) => { engine.goForward(id); return true; });
  ipcMain.handle("tab:reload", (_e, id) => { engine.reload(id); return true; });
  ipcMain.handle("tab:stop", (_e, id) => { engine.stop(id); return true; });
  ipcMain.handle("selection:clear", (_e, id) => { try { engine.clearSelection(id); } catch (err) { logError("selection:clear", err); } return true; });

  ipcMain.handle("page:text", (_e, id) => engine.getPageText(id));
  ipcMain.handle("page:selection", (_e, id) => engine.getSelection(id));
  ipcMain.handle("page:screenshot", (_e, id) => engine.screenshot(id));

  ipcMain.handle("bookmark:add", (_e, b) => { bookmarks.add(b); return bookmarks.list; });
  ipcMain.handle("bookmark:remove", (_e, id) => { bookmarks.remove(id); return bookmarks.list; });
  ipcMain.handle("bookmark:list", () => bookmarks.list);
  ipcMain.handle("bookmark:import", async () => {
    const r = await dialog.showOpenDialog(mainWindow, {
      title: "Import bookmarks",
      filters: [{ name: "Bookmarks", extensions: ["html", "htm", "json"] }],
      properties: ["openFile"],
    });
    if (r.canceled || !r.filePaths[0]) return { added: 0, skipped: 0 };
    try {
      const raw = fs.readFileSync(r.filePaths[0], "utf8");
      let incoming = [];
      if (r.filePaths[0].toLowerCase().endsWith(".json")) {
        const j = JSON.parse(raw);
        const roots = Array.isArray(j) ? j : Array.isArray(j.bookmarks) ? j.bookmarks : Array.isArray(j.children) ? j.children : [];
        const walk = (nodes) => {
          for (const n of nodes || []) {
            if (typeof n.url === "string" && /^https?:\/\//.test(n.url)) incoming.push({ url: n.url, title: n.title || n.name || n.url });
            if (n.children) walk(n.children);
          }
        };
        walk(roots);
      } else {
        incoming = parseNetscapeBookmarks(raw);
      }
      const known = new Set(bookmarks.list.map((b) => b.url));
      let added = 0, skipped = 0;
      for (const b of incoming.slice(0, 2000)) {
        if (known.has(b.url)) { skipped++; continue; }
        bookmarks.add(b); known.add(b.url); added++;
      }
      return { added, skipped };
    } catch (err) {
      logError("bookmark:import", err);
      return { added: 0, skipped: 0, error: "Could not read that file." };
    }
  });
  ipcMain.handle("bookmark:export", async () => {
    const r = await dialog.showSaveDialog(mainWindow, {
      title: "Export bookmarks",
      defaultPath: "spark-bookmarks.html",
      filters: [{ name: "Bookmarks (Netscape HTML)", extensions: ["html"] }, { name: "JSON", extensions: ["json"] }],
    });
    if (r.canceled || !r.filePath) return { saved: false };
    try {
      const data = r.filePath.toLowerCase().endsWith(".json")
        ? JSON.stringify(bookmarks.list, null, 2)
        : bookmarksHtml();
      fs.writeFileSync(r.filePath, data, "utf8");
      return { saved: true, count: bookmarks.list.length, path: r.filePath };
    } catch (err) {
      logError("bookmark:export", err);
      return { saved: false, error: "Could not write the file." };
    }
  });

  ipcMain.handle("history:search", (_e, q) => history.search(q));
  ipcMain.handle("history:clear", () => { history.clear(); return true; });
  ipcMain.handle("browsing:clear", async () => {
    // History + every tab session's cookies/cache. Bookmarks, clips and
    // settings deliberately survive — they are user-created, not traces.
    history.clear();
    for (const part of ["persist:spark", "spark-private"]) {
      try {
        const ses = session.fromPartition(part);
        await ses.clearStorageData({});
        await ses.clearCache();
      } catch {}
    }
    return true;
  });

  ipcMain.handle("clip:add", (_e, c) => { clips.add(c); return clips.list; });
  ipcMain.handle("clip:list", () => clips.list);
  ipcMain.handle("clip:remove", (_e, id) => { clips.remove(id); return clips.list; });

  ipcMain.handle("settings:get", (_e, k) => (k ? settings.get(k) : settings.data));
  ipcMain.handle("settings:set", (_e, { key, value }) => {
    settings.set(key, value);
    applySettingsSideEffects(key, value);
    return settings.data;
  });
  ipcMain.handle("settings:apply-all", () => { applyAllSettings(); return settings.data; });

  // Default browser: status + opt-in handoff to the OS. Windows wants the
  // Settings app (per-user choice since Win10); macOS/other fall back to
  // our protocol registration. We never force it silently.
  ipcMain.handle("default-browser:status", () => ({
    canSet: canBeDefaultBrowser(),
    isDefault: !canBeDefaultBrowser() && app.isPackaged,
  }));
  ipcMain.handle("default-browser:set", () => {
    try { app.setAsDefaultProtocolClient("http"); app.setAsDefaultProtocolClient("https"); } catch {}
    try { if (process.platform === "win32") { exec("start ms-settings:defaultapps"); } else { app.setAsDefaultBrowser?.(); } } catch {}
    return true;
  });

  ipcMain.handle("stats:get", () => ({
    ...engine.stats(),
    httpsUpgradedTotal: engine.order.reduce((a, id) => a + (engine.tabs.get(id)?.httpsUpgraded || 0), 0),
  }));

  ipcMain.handle("shields:toggle", (_e, host) => engine.toggleShields(host));
  ipcMain.handle("shields:state", (_e, host) => engine.shieldsOn(host));

  ipcMain.handle("noor:ask", async (_e, { mode, text, pageText, pageUrl, lang, history }) => {
    // Spark routes AI through Orleia's guarded endpoint (same caps + billing
    // as the app). Auth = shared secret header + this install's device id.
    try {
      const res = await net.fetch("https://app.orleia.app/api/spark/noor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-orleia-spark": SPARK_SECRET,
          "x-orleia-spark-device": deviceIdentity(),
        },
        body: JSON.stringify({
          mode,
          text: (text || "").slice(0, 1000),
          pageText: (pageText || "").slice(0, 9000),
          pageUrl,
          lang: lang || app.getLocale().slice(0, 2) || "en",
          history: Array.isArray(history)
            ? history.slice(-6).map((m) => ({
                role: m && m.role === "assistant" ? "assistant" : "user",
                content: String((m && m.content) || "").slice(0, 500),
              })).filter((m) => m.content)
            : [],
        }),
      });
      const j = await res.json();
      return { ok: res.ok, ...j };
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    }
  });
}

// ------------------------------------------------------------
// Menu (minimal) + shortcuts
// ------------------------------------------------------------
function buildMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        { label: "New Tab", accelerator: "CmdOrCtrl+T", click: () => engine.createTab({ url: "spark://newtab" }) },
        { label: "Close Tab", accelerator: "CmdOrCtrl+W", click: () => { const a = engine.active(); if (a) engine.closeTab(a.id); } },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" }, { role: "redo" }, { type: "separator" },
        { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" },
        { type: "separator" },
        { label: "Find in Page", accelerator: "CmdOrCtrl+F", click: () => sendUI("ui:find") },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Command Bar", accelerator: "CmdOrCtrl+K", click: () => sendUI("ui:command-bar") },
        { label: "Focus Address Bar", accelerator: "CmdOrCtrl+L", click: () => sendUI("ui:focus-address") },
        { type: "separator" },
        { role: "reload", accelerator: "CmdOrCtrl+R" },
        { label: "Hard Reload", accelerator: "CmdOrCtrl+Shift+R", click: () => { const a = engine.active(); if (a) engine.reload(a.id); } },
        { type: "separator" },
        { role: "togglefullscreen" },
        { label: "Toggle Developer Tools", accelerator: "F12", click: () => mainWindow.webContents.toggleDevTools() },
      ],
    },
    {
      label: "History",
      submenu: [
        { label: "Back", accelerator: "Alt+Left", click: () => { const a = engine.active(); if (a) engine.goBack(a.id); } },
        { label: "Forward", accelerator: "Alt+Right", click: () => { const a = engine.active(); if (a) engine.goForward(a.id); } },
        { type: "separator" },
        { label: "Show History", accelerator: "CmdOrCtrl+Y", click: () => sendUI("ui:history") },
        { label: "Clear History", click: () => { history.clear(); sendUI("ui:history-cleared"); } },
      ],
    },
    {
      label: "Spark",
      submenu: [
        { label: "About Orleia Spark", click: () => sendUI("ui:about") },
        { label: "Check for Updates", click: () => checkForUpdates(true) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function sendUI(channel, ...args) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, ...args);
  } catch (err) { logError("sendUI", err); }
}

// ------------------------------------------------------------
// Updates (lightweight version check, no auto-update in v1)
// ------------------------------------------------------------
async function checkForUpdates(manual = false) {
  try {
    const res = await net.fetch("https://orleia.app/spark-version.json", { method: "GET" });
    const j = await res.json();
    if (j.version && j.version !== app.getVersion()) {
      sendUI("ui:update-available", j);
    } else if (manual) {
      sendUI("ui:update-none");
    }
  } catch {
    if (manual) sendUI("ui:update-none");
  }
}

// ------------------------------------------------------------
// Browser identity — a browser must look like a browser.
// Electron exposes itself in the UA ("Electron/43") and Google's fraud
// systems CAPTCHA any search from it. Spark IS Chromium, so sites get a
// genuine Chrome identity: version-matched UA, no Electron token, and a
// matching client-hints brand list. Applied as the app-wide fallback so
// every session (default, persist:spark, spark-private) inherits it.
const CHROME_UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
app.userAgentFallback = CHROME_UA;

// ------------------------------------------------------------
// App lifecycle
// ------------------------------------------------------------
app.whenReady().then(() => {
  protocol.handle("spark", handleSparkProtocol);
  try {
    registerIpc();
  } catch (err) {
    // A failed IPC registration (e.g. a duplicate handler) must never leave
    // the app half-wired — that's the crash-loop class of bug. Log loudly
    // and die fast with a clear message instead of a silent white screen.
    logError("registerIpc", err);
    dialog.showErrorBox("Orleia Spark failed to start", String(err && err.message || err));
    app.exit(1);
  }
  buildMenu();
  createMainWindow();

  // Startup order: URL from the OS (default-browser launch) > restored
  // session > homepage > plain new tab.
  const launchUrl = urlFromArgv(process.argv);
  let opened = false;
  if (launchUrl && !launchUrl.startsWith("spark://")) {
    engine.createTab({ url: launchUrl });
    opened = true;
  }
  if (!opened) {
    try {
      const saved = readJson("session.json", []);
      if (settings.get("restoreSession") !== false && Array.isArray(saved) && saved.length) {
        saved.slice(0, 20).forEach((u, i) => engine.createTab({ url: u, activate: i === 0 }));
        opened = true;
      }
    } catch {}
  }
  if (!opened) {
    const home = String(settings.get("homepage") || "").trim();
    if (home && /^https?:\/\//i.test(home)) engine.createTab({ url: home });
    else engine.createTab({ url: "spark://newtab" });
  }

  setInterval(() => checkForUpdates(false), 6 * 60 * 60 * 1000).unref?.();
});

app.on("window-all-closed", () => {
  app.quit(); // Spark is a browser: closing the window quits
});

// Default browser registration: spark:// deep links (dev-safe), and on a
// packaged build also claim HTTP/HTTPS so the OS lists Spark as a browser.
// In dev the plain executable path breaks Windows' protocol registration
// (it wants "exe" + args), so only packaged builds touch http/https.
if (app.isPackaged) {
  app.setAsDefaultProtocolClient("http");
  app.setAsDefaultProtocolClient("https");
  app.setAsDefaultProtocolClient("spark");
} else {
  app.setAsDefaultProtocolClient("spark");
}

// Can Spark become the OS default browser right now?
function canBeDefaultBrowser() {
  try {
    if (!app.isPackaged) return false; // dev builds never claim it
    return !app.isDefaultProtocolClient("https");
  } catch { return false; }
}

// Open a URL passed on the command line (cold start from OS "open with").
function urlFromArgv(argv) {
  return (argv || []).find((a) => /^(https?|spark):\/\//i.test(a)) || null;
}
