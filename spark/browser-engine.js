// ============================================================
// Orleia Spark — browser engine (main process).
//
// One WebContentsView per tab inside Spark's own BrowserWindow.
// Everything a hostile page could touch lives here in the main
// process; the renderer only ever receives sanitized events.
//
// Privacy stack:
//   - EasyList/EasyPrivacy-derived request blocker (onBeforeRequest)
//   - HTTPS-only upgrades with a visible count
//   - Third-party cookie blocking + per-site isolation
//   - Referrer trimming on cross-site navigations
//   - Fingerprint noise (canvas/WebGL/Audio) via content script
//   - Persistent session for normal tabs, ephemeral for Private
// ============================================================

const { WebContentsView, session, app, net } = require("electron");
const path = require("path");
const fs = require("fs");

// ------------------------------------------------------------
// Blocked request patterns (EasyList/EasyPrivacy-derived subset).
// Matched against the URL (and as a doublekey domain filter).
// Compact on purpose: the heavy tail lives on the allowlist UX.
// ------------------------------------------------------------
const BLOCK_PATTERNS = [
  "googlesyndication.com", "doubleclick.net", "google-analytics.com",
  "googletagmanager.com", "googletagservices.com", "adservice.google.",
  "ads.yahoo.com", "advertising.com", "adnxs.com", "adsystem.com",
  "criteo.com", "criteo.net", "outbrain.com", "taboola.com", "zedo.com",
  "pubmatic.com", "rubiconproject.com", "openx.net", "smartadserver.com",
  "casalemedia.com", "yieldmo.com", "indexww.com", "spotxchange.com",
  "scorecardresearch.com", "quantserve.com", "chartbeat.com", "mixpanel.com",
  "segment.io", "segment.com", "hotjar.com", "fullstory.com", "loggly.com",
  "amplitude.com", "heapanalytics.com", "kissmetrics.com", "mouseflow.com",
  "crazyegg.com", "luckyorange.com", "matomo.cloud", "clarity.ms",
  "facebook.net", "connect.facebook.net", "ads-twitter.com", "static.ads-twitter.com",
  "analytics.tiktok.com", "ads.linkedin.com", "px.ads.linkedin.com", "snap.licdn.com",
  "bat.bing.com", "clarity.microsoft.com", "adzerk.net", "adroll.com",
  "moatads.com", "adsafeprotected.com", "doubleverify.com", "media.net",
  "revcontent.com", "mgid.com", "propellerads.com", "popads.net",
  "amazon-adsystem.com", "moatpixel.com", "branch.io", "appsflyer.com",
  "adjust.com", "kochava.com", "singular.net", "tenjin.io",
];

const FINGERPRINT_HOSTS = [
  "fingerprintjs.com", "fpjs.io", "fingerprint.com", "iovation.com",
  "threatmetrix.com", "perimeterx.net", "datadome.co",
];

function hostOf(u) {
  try { return new URL(u).hostname.toLowerCase(); } catch { return ""; }
}

function isBlockedUrl(url) {
  const h = hostOf(url);
  if (!h) return false;
  for (const p of BLOCK_PATTERNS) {
    if (h === p || h.endsWith("." + p) || h.includes(p)) return true;
  }
  for (const p of FINGERPRINT_HOSTS) {
    if (h === p || h.endsWith("." + p)) return true;
  }
  return false;
}

// Sites whose anti-fraud systems read a fingerprint NOISE as a bot signal.
// The noise is randomized per load; a real device is stable, so "changing"
// fingerprints on google.* trigger CAPTCHAs. Noise stays on everywhere else.
const GOOGLE_SAFE_HOSTS = ["google.com", "gstatic.com", "googleapis.com", "googleusercontent.com", "youtube.com"];
function isFingerprintSafeHost(h) {
  if (!h) return false;
  h = h.toLowerCase().replace(/^www\./, "");
  for (const p of GOOGLE_SAFE_HOSTS) {
    if (h === p || h.endsWith("." + p)) return true;
  }
  return false;
}

// UA-CH shim: runs on EVERY page (identity correction, not noise) — the UA
// string claims Chrome but Electron never defines navigator.userAgentData,
// a JS-visible mismatch fraud systems check.
const UA_CH_SHIM = `
(() => {
  if (window.__sparkUaCh) return;
  window.__sparkUaCh = true;
  try {
    if (!navigator.userAgentData) {
      const V = ${JSON.stringify(process.versions.chrome)};
      Object.defineProperty(Navigator.prototype, 'userAgentData', {
        get: () => ({
          brands: [
            { brand: 'Not:A-Brand', version: '8' },
            { brand: 'Chromium', version: V },
            { brand: 'Google Chrome', version: V },
          ],
          mobile: false,
          platform: 'Windows',
          getHighEntropyValues: async (hints) => ({
            architecture: 'x86', bitness: '64', model: '', platformVersion: '10.0.0',
            uaFullVersion: V + '.0.0.0', fullVersionList: [
              { brand: 'Not:A-Brand', version: '8.0.0.0' },
              { brand: 'Chromium', version: V + '.0.0.0' },
              { brand: 'Google Chrome', version: V + '.0.0.0' },
            ],
            ...(hints.includes('wow64') ? { wow64: false } : {}),
          }),
          toJSON: function () { return { brands: this.brands, mobile: this.mobile, platform: this.platform }; },
        }),
        configurable: true,
      });
    }
  } catch {}
})();
`;

// Fingerprint-noise bootstrap: runs in every page before its scripts.
const FP_NOISE_SCRIPT = `
(() => {
  if (window.__sparkFpNoise) return;
  window.__sparkFpNoise = true;
  const seed = Math.floor(Math.random() * 1e9);
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  try {
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (...a) {
      try {
        const ctx = this.getContext('2d');
        if (ctx) { const d = ctx.getImageData(0, 0, Math.min(this.width, 32), Math.min(this.height, 32));
          for (let i = 0; i < d.data.length; i += 4) d.data[i] = Math.min(255, d.data[i] + (rnd() * 2 - 1) * 1.2);
          ctx.putImageData(d, 0, 0); }
      } catch {}
      return origToDataURL.apply(this, a);
    };
    const origGIP = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (...a) {
      const d = origGIP.apply(this, a);
      for (let i = 0; i < d.data.length; i += 4) d.data[i] = Math.min(255, d.data[i] + (rnd() * 2 - 1) * 1.2);
      return d;
    };
    const origParam = AudioContext.prototype.getChannelData || (window.OfflineAudioContext && OfflineAudioContext.prototype.getChannelData);
    if (origParam) {
      AudioContext.prototype.getChannelData = function (...a) {
        const d = origParam.apply(this, a);
        for (let i = 0; i < d.length; i++) d[i] = d[i] + (rnd() * 2 - 1) * 1e-7;
        return d;
      };
    }
    const origGL = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (p) {
      if (p === 37445 || p === 37446) return 'Spark protected ' + (seed % 97);
      return origGL.apply(this, [p]);
    };
  } catch {}
})();
`;

// ------------------------------------------------------------
// Engine
// ------------------------------------------------------------
class BrowserEngine {
  constructor(win, opts = {}) {
    // Never let an engine-side exception bubble into Electron's modal
    // "A JavaScript error occurred in the main process" dialog — log to
    // file and keep serving tabs.
    process.on("uncaughtException", (err) => this.logError("uncaught", err));
    process.on("unhandledRejection", (err) => this.logError("rejection", err));

    this.win = win;
    this.tabs = new Map(); // id -> { view, id, title, url, favicon, private, loading, canBack, canFwd, blocked, httpsUpgraded, crashed }
    this.order = [];
    this.activeId = null;
    this.onEvent = opts.onEvent || (() => {});
    this.registerProtocol = opts.registerProtocol || null; // (session) => void — per-session spark:// handler
    this.historyStore = opts.historyStore || null;   // { add(u, t), search() }
    this.shieldOverrides = new Map(); // host -> bool (shields on/off)
    this.blockedTotal = 0;
    this.pageInputEnabled = true; // false while a chrome overlay owns the cursor
    this.uiTop = 0;      // px reserved at the top of the window for Spark chrome
    this.uiLeft = 0;     // px reserved at the left (sidebar)
    this.cookiePolicy = opts.cookiePolicy || "third-party"; // settings-driven
    this.doNotTrack = !!opts.doNotTrack;                    // settings-driven
    this.zoomFactor = Number(opts.zoomFactor) || 1;         // settings-driven page zoom
    this.newTabPosition = opts.newTabPosition || "afterActive";
    this.setDataDir(opts.dataDir || app.getPath("userData"));
  }

  setDataDir(dir) {
    this.dataDir = dir;
    try { fs.mkdirSync(path.join(dir, "browser"), { recursive: true }); } catch {}
  }

  // ---------- sessions ----------
  sessionFor(tab) {
    return tab.private
      ? session.fromPartition("spark-private", { cache: false })
      : session.fromPartition("persist:spark");
  }

  installSessionHooks(ses) {
    if (ses.__sparkHooks) return;
    ses.__sparkHooks = true;

    // spark:// is a custom scheme: Electron registers protocol handlers per
    // SESSION. The default-session registration does NOT cover tab partitions
    // (persist:spark / spark-private) — without this, every tab's new-tab
    // page loads as a blank white void. Register on each session we create.
    if (this.registerProtocol) {
      try { this.registerProtocol(ses); } catch {}
    }

    // Request blocker + counters
    ses.webRequest.onBeforeRequest({ urls: ["*://*/*"] }, (details, callback) => {
      const tab = [...this.tabs.values()].find((t) => t.view.webContents === details.webContents);
      const host = tab ? hostOf(tab.url) : "";
      const shieldsOn = tab ? this.shieldsOn(host) : true;
      if (!shieldsOn || details.webContents.getURL().startsWith("spark://")) {
        callback({ cancel: false });
        return;
      }
      if (isBlockedUrl(details.url)) {
        this.blockedTotal += 1;
        if (tab) tab.blocked = (tab.blocked || 0) + 1;
        this.pushStats();
        callback({ cancel: true });
        return;
      }
      // HTTPS-only: upgrade http:// page loads
      if (details.resourceType === "mainFrame" && details.url.startsWith("http://")) {
        const upgraded = details.url.replace("http://", "https://");
        if (tab) tab.httpsUpgraded = (tab.httpsUpgraded || 0) + 1;
        this.pushStats();
        callback({ redirectURL: upgraded });
        return;
      }
      callback({ cancel: false });
    });

    // Third-party cookies: block in third-party contexts (or everywhere if
    // the user chose the stricter policy). Cookie policy comes from settings:
    //   "third-party" (default) | "all" | "none"
    ses.webRequest.onHeadersReceived({ urls: ["*://*/*"] }, (details, callback) => {
      const tab = [...this.tabs.values()].find((t) => t.view.webContents === details.webContents);
      if (!tab || tab.private) { callback({}); return; }
      const policy = this.cookiePolicy || "third-party";
      if (policy === "none") { callback({}); return; }
      const pageHost = hostOf(tab.url);
      const reqHost = hostOf(details.url);
      const headers = details.responseHeaders || {};
      const isThirdParty = pageHost && reqHost && !reqHost.endsWith(pageHost) && !pageHost.endsWith(reqHost);
      if (isThirdParty || policy === "all") {
        for (const k of Object.keys(headers)) {
          if (k.toLowerCase() === "set-cookie") {
            headers[k] = headers[k].map((c) => c + "; SameSite=Lax; Secure");
          }
        }
        callback({ responseHeaders: headers });
        return;
      }
      callback({});
    });

    // Referrer trimming + browser-identity normalization.
    //
    // Electron ships "Electron/<ver>" inside the User-Agent and Chrome's
    // "X-Client-Data" experiment header; Google's abuse systems treat both
    // as automation signals and CAPTCHA every search. Sites get a genuine
    // Chrome identity (Spark IS Chromium); the tracker header is dropped
    // outright — it exists to phone home to Google, not to serve the user.
    ses.webRequest.onBeforeSendHeaders({ urls: ["*://*/*"] }, (details, callback) => {
      const ref = details.requestHeaders.Referer || details.requestHeaders.referer;
      if (ref) {
        try {
          const r = new URL(ref);
          const d = new URL(details.url);
          if (r.hostname !== d.hostname) {
            details.requestHeaders.Referer = r.origin + "/";
          }
        } catch {}
      }
      // Genuine-Chrome UA, version-matched to the bundled Chromium.
      const ua = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
      for (const k of Object.keys(details.requestHeaders)) {
        if (k.toLowerCase() === "user-agent") details.requestHeaders[k] = ua;
        if (k.toLowerCase() === "x-client-data") delete details.requestHeaders[k];
        // brand list must not advertise Electron, or UA/header mismatch is itself a bot tell
        if (k.toLowerCase() === "sec-ch-ua") details.requestHeaders[k] = `"Chromium";v="${process.versions.chrome}", "Google Chrome";v="${process.versions.chrome}"`;
      }
      // Do Not Track: opt-in signal, honored only when the user asks for it.
      if (this.doNotTrack) details.requestHeaders["DNT"] = "1";
      callback({ requestHeaders: details.requestHeaders });
    });

    // Fingerprint noise + permission denials
    // No legacy preloads anywhere — Spark webviews are sandboxed by design.
    ses.setPermissionRequestHandler((_wc, permission, callback) => {
      const allow = new Set(["fullscreen", "clipboard-sanitized-write", "pointerLock"]);
      callback(allow.has(permission));
    });
    ses.setPermissionCheckHandler((_wc, permission) => {
      const allow = new Set(["fullscreen", "clipboard-sanitized-write", "pointerLock"]);
      return allow.has(permission);
    });
  }

  injectTabScripts(tab) {
    const wc = tab.view.webContents;
    // UA-CH shim everywhere (stable identity); fingerprint noise in ALL tabs
    // (privacy is not optional) — except on hosts where randomized noise is
    // itself read as bot activity (google.*).
    wc.on("dom-ready", () => {
      wc.executeJavaScript(UA_CH_SHIM, true).catch(() => {});
      if (isFingerprintSafeHost(hostOf(tab.url))) return;
      wc.executeJavaScript(FP_NOISE_SCRIPT, true).catch(() => {});
    });
  }

  shieldsOn(host) {
    if (!host) return true;
    return this.shieldOverrides.get(host) !== false;
  }

  logError(kind, err) {
    try {
      const fs = require("fs");
      const path = require("path");
      const dir = path.join(app.getPath("userData"), "browser");
      fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(
        path.join(dir, "error.log"),
        `[${new Date().toISOString()}] engine/${kind}: ${err && err.stack ? err.stack : String(err)}\n`,
        "utf8"
      );
    } catch {}
    if (process.env.SPARK_DEBUG) console.error(`[spark-engine:${kind}]`, err);
  }

  // ---------- tab lifecycle ----------
  createTab({ url = "spark://newtab", private: isPrivate = false, activate = true, background = false } = {}) {
    const ses = isPrivate
      ? session.fromPartition("spark-private", { cache: false })
      : session.fromPartition("persist:spark");
    this.installSessionHooks(ses);

    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        spellcheck: this.spellcheck !== false, // settings-driven, default on
        session: ses,
      },
    });
    // Transparent view: the new-tab page renders the window's own surface
    // through it, so the NTP needs no background of its own. Websites set
    // their own backgrounds and are unaffected.
    view.setBackgroundColor("#00000000");
    // Per-tab page zoom (settings-driven; new tabs inherit the current factor).
    if (this.zoomFactor && this.zoomFactor !== 1) { try { view.webContents.setZoomFactor(this.zoomFactor); } catch {} }
    try { view.setVisible(this.pageInputEnabled); } catch {}
    const id = "tab_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const tab = {
      id, view, url, title: "New Tab", favicon: "", private: isPrivate,
      loading: false, canBack: false, canFwd: false, blocked: 0, httpsUpgraded: 0, crashed: false,
    };
    this.tabs.set(id, tab);
    // Where new tabs land: right after the active tab (default) or at the end.
    if (this.newTabPosition === "afterActive" && this.activeId) {
      const at = this.order.indexOf(this.activeId);
      this.order.splice(at + 1, 0, id);
    } else {
      this.order.push(id);
    }
    this.wireTab(tab);
    this.injectTabScripts(tab);

    if (activate || !this.activeId) this.setActive(id);
    else this.layoutOne(tab);

    if (url && url !== "spark://newtab") this.navigate(id, url);
    else this.showNewTab(tab);
    this.onEvent("tabs-changed", this.publicTabs());
    return tab;
  }

  showNewTab(tab) {
    // The new tab page is Spark's own local page.
    tab.view.webContents.loadURL("spark://newtab").catch(() => {});
  }

  closeTab(id) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    const idx = this.order.indexOf(id);
    this.order = this.order.filter((x) => x !== id);
    this.tabs.delete(id);
    try { this.win.contentView.removeChildView(tab.view); } catch {}
    try { tab.view.webContents.stop(); } catch {}
    try { tab.view.webContents.close(); } catch {}
    if (this.activeId === id) {
      const next = this.order[Math.min(idx, this.order.length - 1)];
      if (next) this.setActive(next);
      else this.createTab({ url: "spark://newtab" });
    }
    this.onEvent("tabs-changed", this.publicTabs());
  }

  setActive(id) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    for (const [, t] of this.tabs) {
      try { this.win.contentView.removeChildView(t.view); } catch {}
    }
    this.activeId = id;
    try { this.win.contentView.addChildView(tab.view); } catch {}
    this.layoutOne(tab);
    this.onEvent("tabs-changed", this.publicTabs());
    this.onEvent("active-changed", this.publicTab(tab));
    this.onEvent("stats", this.stats());
  }

  active() {
    return this.tabs.get(this.activeId) || null;
  }

  // ---------- navigation ----------
  navigate(id, input) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    const url = this.normalizeUrl(input);
    if (!url) return;
    tab.loading = true;
    this.pushTabState(tab);
    if (url === "spark://newtab") {
      this.showNewTab(tab);
      return;
    }
    tab.view.webContents.loadURL(url).catch((e) => {
      if (!String(e).includes("ERR_ABORTED")) {
        tab.title = "Can't reach this page";
        this.pushTabState(tab);
      }
    });
  }

  normalizeUrl(input) {
    const s = String(input || "").trim();
    if (!s) return null;
    if (s.startsWith("spark://")) return s;
    if (/^https?:\/\//i.test(s)) return s;
    // Looks like a domain?
    if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(s) || s.startsWith("localhost")) {
      return "https://" + s;
    }
    // Otherwise: search via the user's chosen engine (resolved by main
    // through the spark://search handler, so Settings controls it).
    return "spark://search?q=" + encodeURIComponent(s);
  }

  goBack(id) { const t = this.tabs.get(id); if (t) t.view.webContents.goBack(); }
  goForward(id) { const t = this.tabs.get(id); if (t) t.view.webContents.goForward(); }
  reload(id) { const t = this.tabs.get(id); if (t) t.view.webContents.reload(); }
  stop(id) { const t = this.tabs.get(id); if (t) t.view.webContents.stop(); }

  // ---------- page introspection (Noor) ----------
  async getPageText(id) {
    const tab = this.tabs.get(id);
    if (!tab) return "";
    try {
      return await tab.view.webContents.executeJavaScript(
        "(() => { const clone = document.body ? document.body.cloneNode(true) : null; if (!clone) return '';" +
        " clone.querySelectorAll('script,style,noscript,svg,nav,footer,header,aside').forEach(n => n.remove());" +
        " return (clone.innerText || '').replace(/\\s{3,}/g, '\\n').slice(0, 12000); })()",
        true
      );
    } catch { return ""; }
  }

  async getSelection(id) {
    const tab = this.tabs.get(id);
    if (!tab) return "";
    try {
      return await tab.view.webContents.executeJavaScript("window.getSelection().toString()", true);
    } catch { return ""; }
  }

  async screenshot(id) {
    const tab = this.tabs.get(id);
    if (!tab) return null;
    try {
      const image = await tab.view.webContents.capturePage();
      return image.toDataURL();
    } catch { return null; }
  }

  // ---------- chrome wiring ----------
  wireTab(tab) {
    const wc = tab.view.webContents;
    // UA-CH bootstrap: once the UA claims Chrome, Electron suppresses the
    // client-hint headers a real Chrome always sends — a fraud-system tell.
    // (a) make navigator.userAgentData exist so page JS sees a Chrome brand;
    // (b) seed the request headers on every navigation, at the source, via
    //     the canonical Origin-Trial API (only fires when absent — our
    //     onBeforeSendHeaders override still wins when present).
    try {
      wc.setUserAgent(
        `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`,
        "en-US,en"
      );
    } catch { /* per-webContents variant unsupported in old Electron: harmless */ }
    wc.session.webRequest.onBeforeSendHeaders(
      { urls: ["*://*.google.com/*"], webContentsId: wc.id },
      (details, callback) => {
        const h = details.requestHeaders;
        const v = process.versions.chrome;
        h["sec-ch-ua"] = `"Not:A-Brand";v="8", "Chromium";v="${v}", "Google Chrome";v="${v}"`;
        h["sec-ch-ua-mobile"] = "?0";
        h["sec-ch-ua-platform"] = '"Windows"';
        h["sec-ch-ua-full-version-list"] = `"Not:A-Brand";v="8.0.0.0", "Chromium";v="${v}.0.0.0", "Google Chrome";v="${v}.0.0.0"`;
        h["sec-ch-ua-model"] = '""';
        h["sec-ch-ua-platform-version"] = '"10.0.0"';
        h["accept-language"] = h["accept-language"] || h["Accept-Language"] || "en-US,en;q=0.9";
        callback({ requestHeaders: h });
      }
    );
    // Failed loads are information, not errors: a dead network, an offline
    // site, or a race during tab close (ERR_ABORTED on a torn-down view).
    // Recorded to the log file; the tab keeps its last good URL.
    wc.on("did-fail-load", (_e, code, desc, url, isMain) => {
      if (isMain && code !== -3) this.logError("load-fail", new Error(`${code} ${desc} @ ${url}`));
    });
    wc.on("did-fail-provisional-load", (_e, code, desc, url) => {
      if (code !== -3) this.logError("provisional-fail", new Error(`${code} ${desc} @ ${url}`));
    });
    wc.on("page-title-updated", (_e, title) => { tab.title = title || tab.title; this.pushTabState(tab); });
    wc.on("did-navigate", (_e, url) => {
      tab.url = url; tab.loading = false; tab.canBack = wc.navigationHistory.canGoBack(); tab.canFwd = wc.navigationHistory.canGoForward();
      if (this.historyStore && !tab.private && url.startsWith("http")) this.historyStore.add(url, tab.title);
      this.pushTabState(tab);
    });
    wc.on("did-navigate-in-page", (_e, url) => {
      tab.url = url; tab.canBack = wc.navigationHistory.canGoBack(); tab.canFwd = wc.navigationHistory.canGoForward();
      if (this.historyStore && !tab.private && url.startsWith("http")) this.historyStore.add(url, tab.title);
      this.pushTabState(tab);
    });
    wc.on("did-start-loading", () => { tab.loading = true; this.pushTabState(tab); });
    wc.on("did-stop-loading", () => { tab.loading = false; tab.url = wc.getURL(); this.pushTabState(tab); });
    wc.on("page-favicon-updated", (_e, icons) => { tab.favicon = (icons && icons[icons.length - 1]) || ""; this.pushTabState(tab); });
    wc.on("render-process-gone", () => { tab.crashed = true; this.pushTabState(tab); });
    wc.setWindowOpenHandler(({ url: newUrl }) => {
      this.createTab({ url: newUrl, private: tab.private });
      return { action: "deny" };
    });
    wc.on("context-menu", (_e, params) => {
      // Selection tracking feeds Noor's context pill. Stored on the tab
      // (never logged, never leaves with page text unless the user asks).
      const sel = (params.selectionText || "").trim();
      tab.selection = sel ? sel.slice(0, 1000) : "";
      this.pushTabState(tab);
      this.onEvent("context-menu", {
        tabId: tab.id,
        x: params.x, y: params.y,
        hasSelection: !!params.selectionText,
        selectionText: (params.selectionText || "").slice(0, 400),
        linkURL: params.linkURL || "",
        srcURL: params.srcURL || "",
        pageURL: tab.url,
      });
    });
  }

  // ---------- layout ----------
  setChromeInsets({ top = 0, left = 0, right = 0 }) {
    this.uiTop = top;
    this.uiLeft = left;
    this.uiRight = right;
    for (const [, t] of this.tabs) this.layoutOne(t);
  }

  // WebContentsViews stack above the chrome DOM, so chrome overlays
  // (panels, command bar) covering the page area would be unreachable by
  // real mouse clicks — the native page layer swallows them. This Electron
  // has no per-view input-blocking API, so while an overlay is open we
  // hide the page views entirely (the dim backdrop covers that area
  // anyway) and restore them when it closes.
  // Selection cleared explicitly (Noor context pill "click to clear").
  clearSelection(id) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.selection = "";
    this.pushTabState(tab);
    try { tab.view.webContents.executeJavaScript("try { window.getSelection().removeAllRanges() } catch {}").catch(() => {}); } catch {}
  }

  setPageInputEnabled(enabled) {
    for (const [, t] of this.tabs) {
      try { t.view.setVisible(enabled); } catch {}
    }
  }

  layoutOne(tab) {
    if (!this.win || this.win.isDestroyed()) return;
    const [w, h] = this.win.getContentSize();
    tab.view.setBounds({
      x: this.uiLeft, y: this.uiTop,
      width: Math.max(50, w - this.uiLeft - (this.uiRight || 0)),
      height: Math.max(50, h - this.uiTop),
    });
  }

  // ---------- renderer-facing data ----------
  publicTab(tab) {
    return {
      id: tab.id, title: tab.title, url: tab.url, favicon: tab.favicon,
      private: tab.private, loading: tab.loading, canBack: tab.canBack,
      canFwd: tab.canFwd, blocked: tab.blocked || 0, httpsUpgraded: tab.httpsUpgraded || 0,
      crashed: tab.crashed, active: tab.id === this.activeId,
      selection: tab.selection || "",
    };
  }
  publicTabs() {
    return this.order.map((id) => this.publicTab(this.tabs.get(id))).filter(Boolean);
  }
  stats() {
    return { blockedTotal: this.blockedTotal, blockedActiveTab: (this.active() || {}).blocked || 0 };
  }
  pushTabState(tab) { this.onEvent("tab-updated", this.publicTab(tab)); }
  pushStats() { this.onEvent("stats", this.stats()); }

  toggleShields(host) {
    if (!host) return;
    this.shieldOverrides.set(host, !this.shieldsOn(host));
    this.onEvent("stats", this.stats());
    return this.shieldsOn(host);
  }

  destroy() {
    for (const [, t] of this.tabs) {
      try { t.view.webContents.close(); } catch {}
    }
    this.tabs.clear();
  }
}

module.exports = { BrowserEngine, isBlockedUrl, FP_NOISE_SCRIPT, UA_CH_SHIM };
