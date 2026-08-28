// Lexis Desktop — preload bridge.
// Exposes ONLY the APIs below to the renderer. Everything else is sandboxed.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lexisDesktop", {
  // ── Pairing (existing) ──────────────────────────────────────────────────
  pairing: {
    available: true,
    start: () => ipcRenderer.invoke("pairing:start"),
    stop: () => ipcRenderer.invoke("pairing:stop"),
    onDataRequest: (provider) => {
      ipcRenderer.on("pairing:request-data", () => {
        try {
          const json = provider();
          ipcRenderer.send("pairing:data", typeof json === "string" ? json : JSON.stringify(json));
        } catch {
          ipcRenderer.send("pairing:data", null);
        }
      });
    },
    onPairAction: (handler) => {
      ipcRenderer.on("pairing:apply-action", async (_event, action) => {
        try {
          const result = await handler(action);
          ipcRenderer.send("pairing:action-result", result?.ok ? { ok: true } : { ok: false, error: result?.error || "failed" });
        } catch (e) {
          ipcRenderer.send("pairing:action-result", { ok: false, error: String(e?.message || e) });
        }
      });
    },
  },

  // ── Native notifications ────────────────────────────────────────────────
  notify: (title, body, actions) => {
    ipcRenderer.send("native-notification", { title, body, actions });
  },

  // ── OS theme sync ───────────────────────────────────────────────────────
  getSystemTheme: () => ipcRenderer.invoke("get-system-theme"),
  onThemeChanged: (callback) => {
    ipcRenderer.on("system-theme-changed", (_e, data) => callback(data.theme));
  },

  // ── App version ─────────────────────────────────────────────────────────
  getVersion: () => ipcRenderer.invoke("get-app-version"),

  // ── Deep links ──────────────────────────────────────────────────────────
  onDeepLink: (callback) => {
    ipcRenderer.on("deep-link", (_e, url) => callback(url));
  },

  // ── Keyboard shortcuts config ───────────────────────────────────────────
  getShortcuts: () => ipcRenderer.invoke("shortcuts:get"),
  setShortcuts: (shortcuts) => ipcRenderer.invoke("shortcuts:set", shortcuts),

  // ── File drag & drop ────────────────────────────────────────────────────
  readFile: (filePath) => ipcRenderer.invoke("read-dropped-file", filePath),

  // ── Menu actions (macOS menu bar sends these) ──────────────────────────
  onMenuAction: (channel, callback) => {
    ipcRenderer.on(channel, () => callback());
  },

  // ── Auto-updater ────────────────────────────────────────────────────────
  onUpdateAvailable: (callback) => {
    ipcRenderer.on("update:available", (_e, info) => callback(info));
  },
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  installUpdate: () => ipcRenderer.invoke("install-update"),


  // ── Taskbar progress bar ────────────────────────────────────────────────
  setTaskbarProgress: (percent, mode) => ipcRenderer.invoke('taskbar-progress', percent, mode),

  // ── Auto-start with Windows ──────────────────────────────────────────────
  getAutoStart: () => ipcRenderer.invoke('auto-start:get'),
  setAutoStart: (enabled) => ipcRenderer.invoke('auto-start:set', enabled),

  // ── Shared text from other apps ────────────────────────────────────────
  shareText: (text) => ipcRenderer.invoke('share-text', text),
  onSharedText: (callback) => {
    ipcRenderer.on('shared-text', (_e, text) => callback(text));
  },

  // ── Auth complete (called from success page) ─────────────────────────────
  authComplete: () => ipcRenderer.invoke('auth-complete'),

  // ── File opened from OS (double-click .md/.csv) ─────────────────────────
  onFileOpened: (callback) => {
    ipcRenderer.on('file-opened', (_e, data) => callback(data));
  },
  onNewHabit: (callback) => {
    ipcRenderer.on('menu:new-habit', () => callback());
  },

  // ── Legacy pairing bridge (backward compat) ─────────────────────────────
  lexisPairing: {
    available: true,
    start: () => ipcRenderer.invoke("pairing:start"),
    stop: () => ipcRenderer.invoke("pairing:stop"),
    onDataRequest: (provider) => {
      ipcRenderer.on("pairing:request-data", () => {
        try {
          const json = provider();
          ipcRenderer.send("pairing:data", typeof json === "string" ? json : JSON.stringify(json));
        } catch {
          ipcRenderer.send("pairing:data", null);
        }
      });
    },
    onPairAction: (handler) => {
      ipcRenderer.on("pairing:apply-action", async (_event, action) => {
        try {
          const result = await handler(action);
          ipcRenderer.send("pairing:action-result", result?.ok ? { ok: true } : { ok: false, error: result?.error || "failed" });
        } catch (e) {
          ipcRenderer.send("pairing:action-result", { ok: false, error: String(e?.message || e) });
        }
      });
    },
  },
});
