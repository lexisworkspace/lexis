// ============================================================
// Orleia Spark — preload bridge.
// Minimal, promise-based surface. Nothing here executes page
// scripts or touches user files — main process owns all state.
// ============================================================

const { contextBridge, ipcRenderer } = require("electron");

const invoke = (ch, payload) => ipcRenderer.invoke(ch, payload);

// One-way error reporting from the chrome UI to the main-process log.
const logError = (kind, detail) => { try { ipcRenderer.send("ui:log-error", { kind, detail: String(detail).slice(0, 2000) }); } catch {} };

contextBridge.exposeInMainWorld("spark", {
  logError,
  // tabs
  createTab: (opts) => invoke("tab:create", opts),
  closeTab: (id) => invoke("tab:close", id),
  activateTab: (id) => invoke("tab:activate", id),
  listTabs: () => invoke("tab:list"),
  navigate: (id, url) => invoke("tab:navigate", { id, url }),
  back: (id) => invoke("tab:back", id),
  forward: (id) => invoke("tab:forward", id),
  reload: (id) => invoke("tab:reload", id),
  clearSelection: (id) => invoke("selection:clear", id),
  stop: (id) => invoke("tab:stop", id),

  // page data (for Noor + reader)
  pageText: (id) => invoke("page:text", id),
  pageSelection: (id) => invoke("page:selection", id),
  screenshot: (id) => invoke("page:screenshot", id),

  // user data
  addBookmark: (b) => invoke("bookmark:add", b),
  removeBookmark: (id) => invoke("bookmark:remove", id),
  listBookmarks: () => invoke("bookmark:list"),
  searchHistory: (q) => invoke("history:search", q),
  clearHistory: () => invoke("history:clear"),
  clearBrowsingData: () => invoke("browsing:clear"),

  // clips (Send-to-Orleia landing pad)
  listClips: () => invoke("clip:list"),
  removeClip: (id) => invoke("clip:remove", id),
  addClip: (c) => invoke("clip:add", c),
  importBookmarks: () => invoke("bookmark:import"),
  exportBookmarks: () => invoke("bookmark:export"),

  // settings + shields
  getSettings: () => invoke("settings:get"),
  setSetting: (key, value) => invoke("settings:set", { key, value }),
  applyAllSettings: () => invoke("settings:apply-all"),
  onUiPrefs: (cb) => {
    ipcRenderer.on("ui-prefs-changed", (_e, prefs) => cb(prefs));
  },
  toggleShields: (host) => invoke("shields:toggle", host),
  shieldsState: (host) => invoke("shields:state", host),
  stats: () => invoke("stats:get"),

  // Noor
  noor: (req) => invoke("noor:ask", req),

  // chrome geometry (main needs px insets to place webviews)
  setInsets: (top, left, right) => ipcRenderer.send("chrome:insets", { top, left, right }),
  setPageInputEnabled: (enabled) => ipcRenderer.send("page-input", { enabled }),

  // main → UI events
  on: (channel, cb) => {
    const allowed = [
      "browser-event", "ui:find", "ui:command-bar", "ui:focus-address",
      "ui:history", "ui:history-cleared", "ui:about", "ui:update-available", "ui:update-none",
    ];
    if (!allowed.includes(channel)) return () => {};
    const handler = (_e, ...args) => cb(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
