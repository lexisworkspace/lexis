// ============================================================
// Orleia Spark — renderer (chrome UI).
// Talks only to the preload bridge. Never touches Node, never
// runs page scripts — webviews live under main-process control.
// ============================================================

const $ = (id) => document.getElementById(id);

const state = {
  tabs: [],            // mirror of engine tabs
  activeId: null,
  bookmarks: [],
  settings: {},
  stats: { blocked: 0, upgraded: 0 },
  cmdIndex: 0,
  cmdItems: [],
  noorMode: null,
  noorHistory: [],
  noorPage: null,
};

// ------------------------------------------------------------
// helpers
// ------------------------------------------------------------
function prettyUrl(u) {
  if (!u) return "";
  if (u === "spark://newtab") return "";
  return u.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
function faviconOf(t) {
  // Privacy first: use the favicon the SITE itself published (collected
  // passively during navigation — no third-party favicon service ever
  // learns your history). Empty string hides the slot; the monochrome
  // chrome doesn't need a placeholder.
  if (t.private) return "";
  try {
    const u = new URL(t.url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return t.favicon || "";
  } catch { return ""; }
}
function hostOf(u) {
  try { return new URL(u).hostname; } catch { return ""; }
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function activeTab() {
  return state.tabs.find((t) => t.id === state.activeId) || null;
}

// ------------------------------------------------------------
// insets — tell main where chrome ends and the webview begins
// ------------------------------------------------------------
function sendInsets() {
  const collapsed = document.body.classList.contains("side-collapsed");
  // When collapsed the sidebar stays visible as a 46px rail holding the
  // reveal button — the tab view must never slide under it, or the button
  // becomes unreachable and the sidebar can never come back.
  const side = collapsed ? 46 : $("sidebar").offsetWidth;
  // Noor panel (right dock): when open it squeezes the page view; the
  // narrow-window float mode is handled by a backdrop, not insets.
  const noorOpen = document.body.classList.contains("noor-open");
  const noorFloat = noorOpen && window.matchMedia("(max-width: 900px)").matches;
  const right = noorOpen && !noorFloat ? $("noor-drawer").offsetWidth : 0;
  window.spark.setInsets($("topbar").offsetHeight, side, right);
}

// ------------------------------------------------------------
// tab list
// ------------------------------------------------------------
function renderTabs() {
  const list = $("tab-list");
  list.innerHTML = "";
  for (const t of state.tabs) {
    const el = document.createElement("button");
    el.className = "tab-item" + (t.id === state.activeId ? " active" : "");
    el.setAttribute("role", "tab");
    el.setAttribute("aria-selected", t.id === state.activeId ? "true" : "false");
    el.dataset.id = t.id;

    const fav = document.createElement("img");
    fav.className = "t-fav";
    const src = faviconOf(t);
    if (src) { fav.src = src; fav.referrerPolicy = "no-referrer"; }
    else { fav.style.display = "none"; }
    el.appendChild(fav);

    if (t.private) {
      const dot = document.createElement("span");
      dot.className = "dot-private";
      dot.title = "Private tab";
      el.appendChild(dot);
    }

    const title = document.createElement("span");
    title.className = "t-title";
    title.textContent = t.title || t.url || "New tab";
    el.appendChild(title);

    if (t.loading) {
      title.textContent = "Loading…";
      el.style.opacity = "0.6";
    }

    const close = document.createElement("span");
    close.className = "t-close";
    close.textContent = "✕";
    close.title = "Close tab";
    close.addEventListener("click", (e) => { e.stopPropagation(); closeTab(t.id); });
    el.appendChild(close);

    el.addEventListener("click", () => activateTab(t.id));
    list.appendChild(el);
  }
  // Keep the active tab visible: when tabs stack past the screen, the
  // newly-created/activated one scrolls into view (new tabs always activate).
  list.querySelector(".tab-item.active")?.scrollIntoView({ block: "nearest" });
}

async function refreshTabs() {
  state.tabs = await window.spark.listTabs();
  if (!state.tabs.find((t) => t.id === state.activeId)) {
    const active = state.tabs.find((t) => t.active) || state.tabs[0];
    state.activeId = active ? active.id : null;
  }
  renderTabs();
  syncTopbar();
  sendInsets();
}

async function activateTab(id) {
  state.activeId = id;
  renderTabs();
  await window.spark.activateTab(id);
  syncTopbar();
  closeDrawer();
}

async function newTab(opts = {}) {
  const t = await window.spark.createTab({ url: "spark://newtab", ...opts });
  await refreshTabs();
  state.activeId = t.id;
  renderTabs();
  syncTopbar();
  $("omnibox").focus();
}

async function closeTab(id) {
  await window.spark.closeTab(id);
  await refreshTabs();
  if (!state.tabs.length) newTab();
}

// ------------------------------------------------------------
// top bar sync
// ------------------------------------------------------------
function syncTopbar() {
  const t = state.tabs.find((x) => x.id === state.activeId);
  const ob = $("omnibox");
  if (t && document.activeElement !== ob) ob.value = prettyUrl(t.url);
  $("btn-back").disabled = !t?.canBack;
  $("btn-fwd").disabled = !t?.canFwd;
  $("shields-count").textContent = String(t?.blocked || 0);
  const host = t ? hostOf(t.url) : "";
  const on = host ? state.settings.shields !== false : false;
  $("shields-indicator").classList.toggle("off", !on);
  updateStar(t);
}

function updateStar(t) {
  const url = t?.url || "";
  const marked = state.bookmarks.some((b) => b.url === url);
  $("btn-star").textContent = marked ? "★" : "☆";
}

// ------------------------------------------------------------
// navigation
// ------------------------------------------------------------
function fixUrl(input) {
  const s = input.trim();
  if (!s) return null;
  if (/^(https?|file|about):/i.test(s)) return s;
  if (/^localhost(:\d+)?(\/|$)/i.test(s)) return "http://" + s;
  const hasSpace = /\s/.test(s);
  const looksDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i.test(s);
  if (!hasSpace && looksDomain) return "https://" + s;
  // Route searches through the engine-agnostic resolver so Settings
  // (Search engine) controls them — never hardcode an engine here.
  return "spark://search?q=" + encodeURIComponent(s);
}

async function navigateActive(input) {
  const t = await activeTab();
  const url = fixUrl(input);
  if (!t || !url) return;
  await window.spark.navigate(t.id, url);
  $("omnibox").blur();
}

// ------------------------------------------------------------
// bookmarks
// ------------------------------------------------------------
async function toggleBookmark() {
  const t = await activeTab();
  if (!t || !/^https?:/.test(t.url)) return;
  const existing = state.bookmarks.find((b) => b.url === t.url);
  if (existing) state.bookmarks = await window.spark.removeBookmark(existing.id);
  else state.bookmarks = await window.spark.addBookmark({ title: t.title || t.url, url: t.url });
  updateStar(t);
}

// ------------------------------------------------------------
// panels (bookmarks / history / clips / settings / about)
// ------------------------------------------------------------
function openPanel(title, renderBody) {
  $("panel-title").textContent = title;
  const body = $("panel-body");
  body.innerHTML = "";
  // Renderers may be sync or async (some fetch data first) — accept both.
  Promise.resolve(renderBody(body));
  $("panel-backdrop").hidden = false;
  sendInsets();
  syncOverlay();
}

function closePanel() {
  $("panel-backdrop").hidden = true;
  sendInsets();
  syncOverlay();
}

$("panel-close").addEventListener("click", closePanel);
$("panel-backdrop").addEventListener("mousedown", (e) => {
  if (e.target === $("panel-backdrop")) closePanel();
});

function rowEl({ title, sub, actions = [] }) {
  const row = document.createElement("div");
  row.className = "panel-row";
  const left = document.createElement("div");
  left.style.cssText = "flex:1;min-width:0";
  const t = document.createElement("div");
  t.className = "r-title";
  t.textContent = title;
  left.appendChild(t);
  if (sub) {
    const s = document.createElement("div");
    s.className = "r-sub";
    s.textContent = sub;
    left.appendChild(s);
  }
  row.appendChild(left);
  for (const a of actions) row.appendChild(a);
  return row;
}
function linkBtn(label, title, fn) {
  const b = document.createElement("button");
  b.textContent = label;
  b.title = title;
  b.addEventListener("click", fn);
  return b;
}

function openBookmarks() {
  openPanel("Bookmarks", (body) => {
    if (!state.bookmarks.length) {
      const empty = document.createElement("p");
      empty.className = "cmd-empty";
      empty.textContent = "No bookmarks yet. Press ☆ or Ctrl+D on any page — or import from another browser below.";
      body.appendChild(empty);
    }
    for (const b of state.bookmarks) {
      body.appendChild(rowEl({
        title: b.title || b.url,
        sub: b.url,
        actions: [
          linkBtn("Open", "Open in new tab", async () => { closePanel(); await newTab({ url: b.url }); }),
          linkBtn("✕", "Remove bookmark", async () => {
            state.bookmarks = await window.spark.removeBookmark(b.id);
            openBookmarks(); updateStar(await activeTab());
          }),
        ],
      }));
    }
    const foot = document.createElement("div");
    foot.className = "panel-foot";
    foot.appendChild(linkBtn("Import…", "Import bookmarks from Chrome, Firefox, Edge or a JSON file", async () => {
      const r = await window.spark.importBookmarks();
      state.bookmarks = await window.spark.listBookmarks();
      openBookmarks();
      if (r && !r.error) {
        foot.querySelector(".import-note")?.remove();
        const note = document.createElement("span");
        note.className = "import-note";
        note.textContent = r.added ? `imported ${r.added}${r.skipped ? ` · ${r.skipped} duplicates skipped` : ""}` : "no new bookmarks found";
        foot.appendChild(note);
      } else if (r && r.error) {
        foot.querySelector(".import-note")?.remove();
        const note = document.createElement("span");
        note.className = "import-note";
        note.textContent = r.error;
        foot.appendChild(note);
      }
    }));
    foot.appendChild(linkBtn("Export", "Save all bookmarks as a file other browsers can import", async () => {
      const r = await window.spark.exportBookmarks();
      if (r && r.saved) {
        foot.querySelector(".import-note")?.remove();
        const note = document.createElement("span");
        note.className = "import-note";
        note.textContent = `saved ${r.count} bookmarks`;
        foot.appendChild(note);
      }
    }));
    body.appendChild(foot);
  });
}

async function openHistory() {
  const items = await window.spark.searchHistory("");
  openPanel("History", (body) => {
    const head = document.createElement("div");
    head.style.cssText = "display:flex;justify-content:flex-end;margin-bottom:6px";
    head.appendChild(linkBtn("Clear all", "Clear browsing history", async () => {
      await window.spark.clearHistory();
      closePanel();
    }));
    body.appendChild(head);
    if (!items.length) {
      body.innerHTML += `<p class="cmd-empty">Nothing here yet — and it never leaves this device.</p>`;
      return;
    }
    for (const h of items.slice(0, 200)) {
      body.appendChild(rowEl({
        title: h.title || h.url,
        sub: new Date(h.at).toLocaleString(),
        actions: [linkBtn("Open", "Open in new tab", async () => { closePanel(); await newTab({ url: h.url }); })],
      }));
    }
  });
}

async function openClips() {
  const clips = await window.spark.listClips();
  openPanel("Clips", (body) => {
    body.innerHTML = `<p style="font-size:12px;color:var(--text-dim);margin-bottom:10px">
      A staging area on this device — copy a clip and paste it anywhere, Orleia included.</p>`;
    if (!clips.length) {
      body.innerHTML += `<p class="cmd-empty">Select text on any page, right-click → “Clip to Orleia”.</p>`;
      return;
    }
    for (const c of clips) {
      body.appendChild(rowEl({
        title: c.title || "Clip",
        sub: (c.text || "").slice(0, 90) + ((c.text || "").length > 90 ? "…" : ""),
        actions: [
          linkBtn("Copy", "Copy clip text", async () => {
            try { await navigator.clipboard.writeText(c.text || ""); } catch {}
          }),
          linkBtn("✕", "Remove clip", async () => { await window.spark.removeClip(c.id); openClips(); }),
        ],
      }));
    }
  });
}

async function openSettings() {
  state.settings = await window.spark.getSettings();
  openPanel("Settings", (body) => {
    const sec = (title) => {
      const h = document.createElement("div");
      h.className = "set-section";
      h.textContent = title;
      body.appendChild(h);
    };
    const mkSwitch = (label, key, desc, onChange) => {
      const sw = document.createElement("button");
      sw.className = "switch" + (state.settings[key] ? " on" : "");
      sw.setAttribute("role", "switch");
      sw.setAttribute("aria-checked", state.settings[key] ? "true" : "false");
      sw.addEventListener("click", async () => {
        state.settings = await window.spark.setSetting(key, !state.settings[key]);
        sw.classList.toggle("on", !!state.settings[key]);
        sw.setAttribute("aria-checked", state.settings[key] ? "true" : "false");
        if (onChange) onChange(state.settings[key]);
      });
      const wrap = document.createElement("div");
      wrap.className = "panel-row";
      const left = document.createElement("div");
      left.style.flex = "1";
      const t = document.createElement("div"); t.className = "r-title"; t.textContent = label;
      const s2 = document.createElement("div"); s2.className = "r-sub"; s2.textContent = desc;
      left.append(t, s2);
      wrap.append(left, sw);
      body.appendChild(wrap);
    };
    const mkSelect = (label, key, options, desc, onChange) => {
      const row = document.createElement("div");
      row.className = "panel-row";
      const left = document.createElement("div");
      left.style.flex = "1";
      const t = document.createElement("div"); t.className = "r-title"; t.textContent = label;
      const s2 = document.createElement("div"); s2.className = "r-sub"; s2.textContent = desc || "";
      left.append(t, s2);
      const sel = document.createElement("select");
      sel.style.cssText = "background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:5px 8px;font:inherit;outline:none";
      for (const [val, lab] of options) {
        const o = document.createElement("option");
        o.value = val; o.textContent = lab;
        if (String(state.settings[key]) === String(val)) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener("change", async () => {
        state.settings = await window.spark.setSetting(key, sel.value);
        if (onChange) onChange(sel.value);
      });
      row.append(left, sel);
      body.appendChild(row);
      return sel;
    };
    const mkText = (label, key, desc, saveLabel, onSave) => {
      const wrap = document.createElement("div");
      wrap.className = "panel-row";
      const left = document.createElement("div");
      left.style.flex = "1";
      const t = document.createElement("div"); t.className = "r-title"; t.textContent = label;
      const s2 = document.createElement("div"); s2.className = "r-sub"; s2.textContent = desc || "";
      left.append(t, s2);
      const input = document.createElement("input");
      input.type = "text";
      input.value = state.settings[key] || "";
      input.placeholder = "https://";
      input.style.cssText = "width:170px;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:5px 8px;font:inherit;outline:none";
      const btn = linkBtn(saveLabel || "Save", "Save", async () => {
        state.settings = await window.spark.setSetting(key, input.value.trim());
        btn.textContent = "Saved";
        setTimeout(() => (btn.textContent = saveLabel || "Save"), 1200);
        if (onSave) onSave(input.value.trim());
      });
      wrap.append(left, input, btn);
      body.appendChild(wrap);
    };

    // ---------- Default browser ----------
    sec("Default browser");
    (async () => {
      const wrap = document.createElement("div");
      wrap.className = "panel-row";
      const left = document.createElement("div");
      left.style.flex = "1";
      const t = document.createElement("div"); t.className = "r-title"; t.textContent = "Make Spark your default browser";
      const s2 = document.createElement("div"); s2.className = "r-sub";
      const btn = linkBtn("Set default", "Hand off to the OS to confirm", async () => {
        btn.textContent = "...";
        await window.spark.setDefaultBrowser();
        setTimeout(() => (btn.textContent = "Set default"), 1500);
      });
      try {
        const st = await window.spark.isDefaultBrowser();
        if (st && st.isDefault) {
          s2.textContent = "Spark is your default browser";
          btn.style.display = "none";
        } else if (st && st.canSet) {
          s2.textContent = "Links from other apps open in Spark";
        } else {
          s2.textContent = "Available in the installed app";
          btn.style.display = "none";
        }
      } catch { s2.textContent = "Links from other apps open in Spark"; }
      left.append(t, s2);
      wrap.append(left, btn);
      body.appendChild(wrap);
    })();

    // ---------- Privacy ----------
    sec("Privacy");
    mkSwitch("Shields", "shields", "Block trackers and ads on every site (per-site override in the shields panel)");
    mkSwitch("HTTPS-only", "httpsOnly", "Upgrade insecure connections automatically");
    mkSwitch("Block third-party cookies", "blockThirdPartyCookies", "Off = cookies flow everywhere. On = third-party cookies are stripped");
    mkSwitch("Do Not Track", "doNotTrack", "Send the DNT signal with every request (sites may ignore it)");
    mkSwitch("Spellcheck", "spellcheck", "Check spelling in text fields on web pages");

    // ---------- Browsing ----------
    sec("Browsing");
    const engines = [
      ["duckduckgo", "DuckDuckGo"],
      ["brave", "Brave Search"],
      ["startpage", "Startpage"],
      ["mojeek", "Mojeek"],
      ["google", "Google"],
    ];
    mkSelect("Search engine", "searchEngine", engines, "Used by the address bar and the new-tab page");
    mkSelect("Page zoom", "zoomLevel", [
      ["0.8", "80%"], ["0.9", "90%"], ["1", "100%"], ["1.1", "110%"], ["1.25", "125%"], ["1.5", "150%"], ["1.75", "175%"], ["2", "200%"],
    ], "Default zoom for pages", async (v) => {
      const num = Number(v);
      state.settings = await window.spark.setSetting("zoomLevel", isNaN(num) ? 1 : num);
    });
    mkText("Homepage", "homepage", "Opened by the home button and on startup (optional)", "Set");

    // ---------- Appearance ----------
    sec("Appearance");
    mkSelect("Theme", "theme", [
      ["dark", "Dark"], ["light", "Light"], ["system", "Match system"],
    ], "Spark's own colors", async () => {
      applyUiPrefs(state.settings);
    });
    mkSelect("Accent", "accent", [
      ["violet", "Violet"], ["blue", "Blue"], ["green", "Green"], ["orange", "Orange"], ["pink", "Pink"], ["white", "White"],
    ], "Tints active states and highlights", async () => applyUiPrefs(state.settings));
    mkSelect("Interface size", "uiScale", [
      ["85", "85%"], ["90", "90%"], ["95", "95%"], ["100", "100%"], ["105", "105%"], ["110", "110%"], ["115", "115%"],
    ], "Scales the browser chrome text", async () => applyUiPrefs(state.settings));
    mkSwitch("Compact tabs", "compactTabs", "Slimmer sidebar and tighter tab list", async () => applyUiPrefs(state.settings));

    // ---------- Startup ----------
    sec("Startup");
    mkSwitch("Restore session", "restoreSession", "Reopen the tabs you had when Spark was last closed");
    mkSelect("New tab position", "newTabPosition", [
      ["afterActive", "Next to current tab"], ["end", "End of tab list"],
    ], "Where a new tab lands in the sidebar");

    // ---------- Data ----------
    sec("Data");
    const clearRow = document.createElement("div");
    clearRow.className = "panel-row";
    const cLeft = document.createElement("div");
    cLeft.style.flex = "1";
    const cT = document.createElement("div"); cT.className = "r-title"; cT.textContent = "Clear browsing data";
    const cS = document.createElement("div"); cS.className = "r-sub"; cS.textContent = "History, cookies and cached files. Bookmarks, clips and settings stay.";
    cLeft.append(cT, cS);
    const cBtn = linkBtn("Clear", "Clear browsing data", async () => {
      cBtn.disabled = true; cBtn.textContent = "...";
      await window.spark.clearBrowsingData();
      cBtn.textContent = "Done";
      setTimeout(() => { cBtn.textContent = "Clear"; cBtn.disabled = false; }, 1500);
    });
    clearRow.append(cLeft, cBtn);
    body.appendChild(clearRow);

    const ioRow = document.createElement("div");
    ioRow.className = "panel-row";
    const ioLeft = document.createElement("div");
    ioLeft.style.flex = "1";
    const ioT = document.createElement("div"); ioT.className = "r-title"; ioT.textContent = "Bookmarks file";
    const ioS = document.createElement("div"); ioS.className = "r-sub"; ioS.textContent = "Import or export as HTML (works with other browsers)";
    ioLeft.append(ioT, ioS);
    const ioWrap = document.createElement("div");
    ioWrap.style.cssText = "display:flex;gap:10px";
    const imp = linkBtn("Import", "Import bookmarks", () => window.spark.importBookmarks());
    const exp = linkBtn("Export", "Export bookmarks", () => window.spark.exportBookmarks());
    ioWrap.append(imp, exp);
    ioRow.append(ioLeft, ioWrap);
    body.appendChild(ioRow);

    const about = document.createElement("div");
    about.style.cssText = "margin-top:10px;font-size:11px;color:var(--text-faint)";
    about.textContent = "Orleia Spark 1.0 - local-first browser. No telemetry, no account. History, bookmarks and clips live on this device only.";
    body.appendChild(about);
  });
  const st = await window.spark.stats();
  const statsRow = document.createElement("div");
  statsRow.style.cssText = "margin-top:14px;padding:0 16px 14px";
  statsRow.innerHTML = '<div class="shield-stat"><span>Trackers blocked</span><b>' + (st.blocked || 0).toLocaleString() + '</b></div>' +
    '<div class="shield-stat"><span>HTTPS upgrades</span><b>' + (st.httpsUpgradedTotal || 0).toLocaleString() + '</b></div>';
  $("panel-body").appendChild(statsRow);
}

async function openShieldsPanel() {
  const t = await activeTab();
  const host = hostOf(t?.url || "");
  if (!host) return;
  const on = await window.spark.shieldsState(host);
  openPanel("Shields — " + host, (body) => {
    const info = document.createElement("div");
    info.style.cssText = "font-size:12.5px;color:var(--text-dim);margin-bottom:10px";
    info.textContent = `${t.blocked || 0} trackers blocked on this page.`;
    body.appendChild(info);
    const row = document.createElement("div");
    row.className = "panel-row";
    const label = document.createElement("div");
    label.className = "r-title";
    label.textContent = "Shields on " + host;
    const sw = document.createElement("button");
    sw.className = "switch" + (on ? " on" : "");
    sw.addEventListener("click", async () => {
      const now = await window.spark.toggleShields(host);
      sw.classList.toggle("on", !!now);
      row.querySelector(".r-sub").textContent = now
        ? "Protected. Reload to apply."
        : "Disabled for this site. Reload to apply.";
    });
    const sub = document.createElement("div");
    sub.className = "r-sub";
    sub.textContent = on ? "Protected." : "Disabled for this site.";
    const left = document.createElement("div");
    left.append(label, sub);
    row.append(left, sw);
    body.appendChild(row);
  });
}

// ------------------------------------------------------------
// Noor drawer
// ------------------------------------------------------------
async function readPageText() {
  const t = await activeTab();
  if (state.noorPage && state.noorPage.tabId === t.id && state.noorPage.url === t.url) {
    return state.noorPage.text;
  }
  const text = await window.spark.pageText(t.id);
  state.noorPage = { tabId: t.id, url: t.url, text };
  return text;
}

function updateNoorContext() {
  const pill = $("noor-context");
  if (!pill) return;
  const t = state.tabs.find((x) => x.id === state.activeId);
  const sel = t && t.selection ? String(t.selection).trim() : "";
  pill.hidden = !sel;
  if (sel) {
    pill.textContent = "using your selection · click to clear";
    pill.title = sel.length > 300 ? sel.slice(0, 300) + "…" : sel;
  }
}

function noorFooterActions(answer) {
  const foot = document.createElement("div");
  foot.className = "noor-foot";
  foot.appendChild(linkBtn("Copy", "Copy answer", async () => {
    try { await navigator.clipboard.writeText(answer); } catch {}
  }));
  foot.appendChild(linkBtn("Save clip", "Copy this answer into Spark's clips panel", async () => {
    await window.spark.addClip({
      title: "Noor · " + (state.noorMode || "page"),
      text: answer,
      url: (state.tabs.find((x) => x.id === state.activeId) || {}).url || "",
    });
    foot.querySelector(".noor-sent")?.remove();
    const ok = document.createElement("span");
    ok.className = "noor-sent";
    ok.textContent = "saved ✓ (Clips panel)";
    foot.appendChild(ok);
  }));
  return foot;
}

const noorFloatMode = () => window.matchMedia("(max-width: 900px)").matches;
const noorTargetW = () =>
  parseInt(getComputedStyle(document.body).getPropertyValue("--noor-w"), 10) || 380;
let noorAnim = 0;

/* Choreographed open/close: one rAF loop drives the panel width, the grid
   column and the webview inset in lockstep, so the page view slides with
   the panel instead of snapping. Dock mode = width reveal (the inner sheet
   stays fixed-width and gets unclipped); float mode = translateX slide. */
function animateNoorFrame(fromW, toW, onDone) {
  const drawer = $("noor-drawer");
  const dur = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : 240;
  const start = performance.now();
  cancelAnimationFrame(noorAnim);
  const tick = (now) => {
    const p = dur ? Math.min(1, (now - start) / dur) : 1;
    const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
    if (noorFloatMode()) {
      drawer.style.transform = `translateX(${Math.round((1 - eased) * 100)}%)`;
    } else {
      const w = Math.round(fromW + (toW - fromW) * eased);
      drawer.style.width = w + "px";
      document.body.style.gridTemplateColumns = `auto 1fr ${w}px`;
    }
    sendInsets();
    if (p < 1) {
      noorAnim = requestAnimationFrame(tick);
    } else {
      // Final state equals the CSS-defined open state — drop the inline styles.
      drawer.style.width = "";
      drawer.style.transform = "";
      document.body.style.gridTemplateColumns = "";
      if (onDone) onDone();
    }
  };
  noorAnim = requestAnimationFrame(tick);
}

function openDrawer(reset) {
  const t = state.tabs.find((x) => x.id === state.activeId);
  const samePage = t && state.noorPage && state.noorPage.tabId === t.id && state.noorPage.url === t.url;
  if (reset || !samePage) {
    state.noorHistory = [];
    $("noor-output").textContent = "";
    $("noor-output").classList.remove("thinking");
  }
  document.body.classList.add("noor-open");
  const d = $("noor-drawer");
  d.hidden = false;
  $("noor-input").hidden = false;
  updateNoorContext();
  if (noorFloatMode()) ensureNoorBackdrop();
  animateNoorFrame(0, noorTargetW());
}
function closeDrawer() {
  const d = $("noor-drawer");
  if (d.hidden) return;
  const fromW = d.offsetWidth || noorTargetW();
  animateNoorFrame(fromW, 0, () => {
    document.body.classList.remove("noor-open");
    d.hidden = true;
    removeNoorBackdrop();
    sendInsets();
  });
}

/* Narrow windows (<900px): the panel floats above the page, so the native
   view must ignore clicks over the panel area — a backdrop handles that
   (click to dismiss, like every other browser side panel). */
function ensureNoorBackdrop() {
  if (!window.matchMedia("(max-width: 900px)").matches) return;
  let bd = document.getElementById("noor-backdrop");
  if (!bd) {
    bd = document.createElement("div");
    bd.id = "noor-backdrop";
    bd.addEventListener("click", () => closeDrawer());
    document.body.appendChild(bd);
  }
}
function removeNoorBackdrop() {
  document.getElementById("noor-backdrop")?.remove();
}
window.addEventListener("resize", () => {
  if (!document.body.classList.contains("noor-open")) return;
  if (window.matchMedia("(max-width: 900px)").matches) { ensureNoorBackdrop(); }
  else { removeNoorBackdrop(); }
  sendInsets();
});
function toggleNoor() {
  if (document.body.classList.contains("noor-open")) closeDrawer();
  else openDrawer(true);
}
$("noor-close").addEventListener("click", () => closeDrawer());

$("noor-context")?.addEventListener("click", () => {
  window.spark.clearSelection(state.activeId);
  updateNoorContext();
});

document.querySelectorAll("#noor-drawer [data-noor-mode]").forEach((b) => {
  b.addEventListener("click", async () => {
    const mode = b.dataset.noorMode;
    state.noorMode = mode;
    if (mode === "ask") {
      $("noor-input").focus();
      return;
    }
    runNoor(mode, "");
  });
});
$("noor-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const q = $("noor-input").value.trim();
    if (!q) return;
    runNoor("ask", q);
  }
});

// ------------------------------------------------------------
// Noor analyzer — the "thinking" visual. One card with a scanning
// beam over a miniature of the page; the caption narrates the phase.
// ------------------------------------------------------------
const NOOR_PHASES = [
  "Reading the page",
  "Mapping the content",
  "Analyzing what matters",
  "Distilling the answer",
];
let noorPhaseTimer = 0;
function noorAnalyzerStart() {
  const an = $("noor-analyzer");
  if (!an) return;
  let cap = an.querySelector(".an-caption");
  if (!cap) {
    cap = document.createElement("div");
    cap.className = "an-caption";
    cap.textContent = NOOR_PHASES[0];
    const dots = document.createElement("span");
    dots.className = "an-dots";
    cap.appendChild(dots);
    an.appendChild(cap);
  }
  let i = 0;
  cap.firstChild.textContent = NOOR_PHASES[0];
  an.hidden = false;
  clearInterval(noorPhaseTimer);
  noorPhaseTimer = setInterval(() => {
    i = (i + 1) % NOOR_PHASES.length;
    cap.firstChild.textContent = NOOR_PHASES[i];
  }, 1800);
}
function noorAnalyzerStop() {
  clearInterval(noorPhaseTimer);
  const an = $("noor-analyzer");
  if (an) an.hidden = true;
}

async function runNoor(mode, question) {
  const out = $("noor-output");
  out.classList.add("thinking");
  out.textContent = "";
  noorAnalyzerStart();
  let pageText = "";
  try { pageText = await readPageText(); } catch {}
  const t = state.tabs.find((x) => x.id === state.activeId);
  const history = mode === "ask" ? state.noorHistory.slice(-6) : [];
  const res = await window.spark.noor({
    mode, text: question, pageText,
    pageUrl: t ? t.url : "",
    lang: navigator.language.slice(0, 2),
    history,
  });
  noorAnalyzerStop();
  out.classList.remove("thinking");
  if (!res.ok) {
    out.textContent = res.overCap
      ? `You've used today's free Noor messages in Spark too (shared with the Orleia app). It resets at midnight — or upgrade in the app.`
      : "Noor couldn't answer just now: " + (res.error || "service unavailable");
    return;
  }
  const answer = res.answer || "(empty response)";
  if (mode === "ask") {
    state.noorHistory.push({ role: "user", content: question });
    state.noorHistory.push({ role: "assistant", content: answer });
  }
  out.textContent = answer;
  out.appendChild(noorFooterActions(answer));
}

// ------------------------------------------------------------
// command bar
// ------------------------------------------------------------
const COMMANDS = [
  { ico: "＋", label: "New tab", hint: "Ctrl+T", run: () => newTab() },
  { ico: "◌", label: "New private tab", hint: "no history, no cache", run: () => newTab({ private: true }) },
  { ico: "★", label: "Bookmarks", hint: "Ctrl+Shift+B", run: openBookmarks },
  { ico: "⏱", label: "History", hint: "Ctrl+Y", run: openHistory },
  { ico: "✂", label: "Clips", hint: "text saved from Noor", run: openClips },
  { ico: "⚙", label: "Settings", hint: "Ctrl+,", run: openSettings },
  { ico: "N", label: "Ask Noor about this page", hint: "Ctrl+J", run: () => openDrawer() },
  { ico: "‹", label: "Toggle sidebar", hint: "Ctrl+B", run: toggleSidebar },
];

async function commandItems(q) {
  const s = (q || "").trim().toLowerCase();
  const cmds = COMMANDS.filter((c) => !s || c.label.toLowerCase().includes(s));
  const items = cmds.map((c) => ({ ...c, kind: "cmd" }));
  if (s) {
    const url = fixUrl(q);
    if (url) items.unshift({ ico: "→", label: s, hint: s.includes(" ") ? "search" : "open", kind: "url", run: () => navigateActive(q) });
    const books = state.bookmarks.filter((b) => (b.title || "").toLowerCase().includes(s) || b.url.toLowerCase().includes(s))
      .slice(0, 4)
      .map((b) => ({ ico: "★", label: b.title || b.url, hint: "bookmark", kind: "url", run: () => navigateActive(b.url) }));
    const hist = (await window.spark.searchHistory(s, 5))
      .map((h) => ({ ico: "⏱", label: h.title || h.url, hint: "history", kind: "url", run: () => navigateActive(h.url) }));
    items.push(...books, ...hist);
  }
  return items.slice(0, 12);
}

async function renderCommandList() {
  const q = $("command-input").value;
  state.cmdItems = await commandItems(q);
  state.cmdIndex = 0;
  const list = $("command-list");
  list.innerHTML = "";
  if (!state.cmdItems.length) {
    list.innerHTML = `<li class="cmd-empty">Nothing found</li>`;
    return;
  }
  state.cmdItems.forEach((item, i) => {
    const li = document.createElement("li");
    li.className = "cmd-item" + (i === state.cmdIndex ? " sel" : "");
    li.innerHTML = `<span class="cmd-ico">${esc(item.ico)}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(item.label)}</span><span class="cmd-hint">${esc(item.hint || "")}</span>`;
    li.addEventListener("click", () => execCommand(item));
    list.appendChild(li);
  });
}
function highlightCommand() {
  [...$("command-list").children].forEach((el, i) => el.classList.toggle("sel", i === state.cmdIndex));
}
function execCommand(item) {
  closeCommandBar();
  item.run();
}
function openCommandBar() {
  $("command-bar").hidden = false;
  $("command-input").value = "";
  renderCommandList();
  $("command-input").focus();
  sendInsets();
  syncOverlay();
}
function closeCommandBar() {
  $("command-bar").hidden = true;
  const t = state.tabs.find((x) => x.id === state.activeId);
  if (t) $("omnibox").value = prettyUrl(t.url);
  syncOverlay();
}

// The tab view (a native WebContentsView) always floats above the chrome
// DOM, so any chrome overlay that covers the page area would be unreachable
// by real mouse clicks — the page would swallow them. While an overlay is
// open, tell main to make the tab view ignore the cursor entirely.
function syncOverlay() {
  const overlayOpen =
    !$("panel-backdrop").hidden ||
    !$("command-bar").hidden ||
    // Noor floats above the page on narrow windows — the native view must
    // not swallow clicks meant for the panel or its backdrop.
    (document.body.classList.contains("noor-open") &&
      window.matchMedia("(max-width: 900px)").matches);
  window.spark.setPageInputEnabled(!overlayOpen);
}
$("command-input").addEventListener("input", renderCommandList);
$("command-input").addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); state.cmdIndex = Math.min(state.cmdIndex + 1, state.cmdItems.length - 1); highlightCommand(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); state.cmdIndex = Math.max(state.cmdIndex - 1, 0); highlightCommand(); }
  else if (e.key === "Enter") { const item = state.cmdItems[state.cmdIndex]; if (item) execCommand(item); }
  else if (e.key === "Escape") closeCommandBar();
});

// ------------------------------------------------------------
// sidebar collapse
// ------------------------------------------------------------
function toggleSidebar() {
  const collapsed = document.body.classList.toggle("side-collapsed");
  // The native tab layer always draws above the chrome, so insets must be
  // choreographed with the width animation or it covers the moving sidebar:
  //   expand → move the tab view out instantly, sidebar grows into the gap;
  //   collapse → sidebar shrinks visibly first, then the tab view slides over.
  if (collapsed) {
    setTimeout(sendInsets, 230); // just after the 0.22s width transition
  } else {
    sendInsets();
  }
}

// ------------------------------------------------------------
// wiring
// ------------------------------------------------------------
$("btn-newtab").addEventListener("click", () => newTab());
$("btn-collapse").addEventListener("click", toggleSidebar);
$("btn-back").addEventListener("click", () => { const t = state.tabs.find((x) => x.id === state.activeId); if (t) window.spark.back(t.id); });
$("btn-fwd").addEventListener("click", () => { const t = state.tabs.find((x) => x.id === state.activeId); if (t) window.spark.forward(t.id); });
$("btn-reload").addEventListener("click", () => { const t = state.tabs.find((x) => x.id === state.activeId); if (t) window.spark.reload(t.id); });
$("btn-star").addEventListener("click", toggleBookmark);
$("btn-noor").addEventListener("click", () => toggleNoor());
$("shields-indicator").addEventListener("click", openShieldsPanel);
$("btn-bookmarks").addEventListener("click", openBookmarks);
$("btn-history").addEventListener("click", openHistory);
$("btn-clips").addEventListener("click", openClips);
$("btn-settings").addEventListener("click", openSettings);

const ob = $("omnibox");
ob.addEventListener("focus", () => {
  const t = state.tabs.find((x) => x.id === state.activeId);
  ob.value = t ? t.url : "";
  requestAnimationFrame(() => ob.select());
});
ob.addEventListener("blur", () => syncTopbar());
ob.addEventListener("keydown", (e) => {
  if (e.key === "Enter") navigateActive(ob.value);
  if (e.key === "Escape") { ob.blur(); syncTopbar(); }
});

// engine events → UI
window.spark.on("browser-event", ({ type, payload }) => {
  if (type === "tabs-changed") {
    const activeBefore = state.activeId;
    state.tabs = payload;
    if (!state.tabs.find((t) => t.id === activeBefore)) {
      const active = state.tabs.find((t) => t.active) || state.tabs[0];
      state.activeId = active ? active.id : null;
    }
    renderTabs();
    syncTopbar();
  } else if (type === "tab-updated" || type === "active-changed") {
    if (!payload || !payload.id) return;
    const i = state.tabs.findIndex((t) => t.id === payload.id);
    if (i >= 0) state.tabs[i] = { ...state.tabs[i], ...payload };
    else state.tabs.push(payload);
    if (type === "active-changed" || payload.active) state.activeId = payload.id;
    renderTabs();
    syncTopbar();
  } else if (type === "stats") {
    state.stats = payload;
  }
});

// menu / accelerator events from main
window.spark.on("ui:command-bar", openCommandBar);
window.spark.on("ui:focus-address", () => ob.focus());
window.spark.on("ui:find", () => ob.focus());
window.spark.on("ui:history", openHistory);
window.spark.on("ui:history-cleared", openHistory);
window.spark.on("ui:about", () =>
  openPanel("About Orleia Spark", (body) => {
    body.innerHTML = `<p style="line-height:1.7">
      <b>Orleia Spark</b> — the private browser with a brain.<br>
      Local-first like Orleia: history, bookmarks and clips live on this device only.
      No telemetry, no accounts, no profiling. Noor reads pages <i>for</i> you — never the other way around.</p>`;
  }));
window.spark.on("ui:update-available", (info) => {
  openPanel("Update available", (body) => {
    body.innerHTML = `<p style="line-height:1.7">Spark ${esc(info.version)} is available${info.notes ? " — " + esc(info.notes) : ""}.<br><br>Download the new installer from <b>orleia.app/spark</b>.</p>`;
  });
});
window.spark.on("ui:update-none", () => {
  openPanel("Up to date", (body) => { body.innerHTML = `<p>You're on the latest version of Spark.</p>`; });
});

// app keyboard shortcuts (menu covers most; these are chrome-local)
window.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.shiftKey && e.key.toLowerCase() === "b") { e.preventDefault(); openBookmarks(); }
  else if (mod && e.key.toLowerCase() === "b") { e.preventDefault(); toggleSidebar(); }
  else if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); toggleBookmark(); }
  else if (mod && e.key.toLowerCase() === "j") { e.preventDefault(); toggleNoor(); }
  else if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); openCommandBar(); }
  else if (mod && e.key.toLowerCase() === "l") { e.preventDefault(); ob.focus(); }
  else if (e.key === "Escape") {
    if (!$("command-bar").hidden) closeCommandBar();
    else if (!$("panel-backdrop").hidden) closePanel();
    else if (!$("noor-drawer").hidden) closeDrawer();
  }
});

window.addEventListener("resize", sendInsets);

// ------------------------------------------------------------
// boot
// ------------------------------------------------------------
(async function boot() {
window.__errs = [];
window.addEventListener("error", (e) => { window.__errs.push(String(e.message)); try { window.spark.logError("renderer", e.message + " @ " + (e.filename || "") + ":" + (e.lineno || 0)); } catch {} });
window.addEventListener("unhandledrejection", (e) => { window.__errs.push("rejection: " + String(e.reason)); try { window.spark.logError("renderer-rejection", String(e.reason)); } catch {} });

  try {
    state.settings = await window.spark.getSettings();
    applyUiPrefs(state.settings);
    state.bookmarks = await window.spark.listBookmarks();
    await refreshTabs();
    sendInsets();
    if (window.spark.onUiPrefs) window.spark.onUiPrefs(applyUiPrefs);
  } catch (err) {
    try { window.spark.logError("init", String((err && err.stack) || err)); } catch {}
  }
})();

// UI prefs -> body classes/vars (theme, accent, density, scale)
function applyUiPrefs(prefs) {
  if (!prefs) return;
  const body = document.body;
  // theme: light class comes from nativeTheme via matchMedia; system handled too
  const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const light = prefs.theme === "light" || (prefs.theme === "system" && !sysDark);
  body.classList.toggle("light", light);
  body.classList.remove("accent-violet", "accent-blue", "accent-green", "accent-orange", "accent-pink", "accent-white");
  body.classList.add("accent-" + (prefs.accent || "violet"));
  body.classList.toggle("compact-tabs", !!prefs.compactTabs);
  document.documentElement.style.setProperty("--font-scale", String((Number(prefs.uiScale) || 100) / 100));
}
window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
  if (state.settings && state.settings.theme === "system") applyUiPrefs(state.settings);
});
