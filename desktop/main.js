// Orleia Desktop — native OS integration layer.
//
// Security: nodeIntegration off, contextIsolation on, sandbox on.
// The page never touches Node APIs — everything goes through preload bridges.

const {
  app, BrowserWindow, Menu, shell, ipcMain, globalShortcut,
  nativeTheme, nativeImage, Notification, Tray, protocol, dialog,
} = require("electron");
const path = require("path");
const os = require("os");
const { autoUpdater } = require("electron-updater");
const { startPairingServer, stopPairingServer, warmPairingCache } = require("./pair-server");

// ── Constants ──────────────────────────────────────────────────────────────

const APP_URL = "https://app.orleia.app";
const PAIRING_PORT = 8123;
const PAIRING_CACHE_DIR = path.join(app.getPath("userData"), "pair-cache");
const WINDOW_STATE_FILE = path.join(app.getPath("userData"), "window-state.json");

let mainWindow = null;
let tray = null;
let pendingData = null;
let pendingAction = null;
let isQuitting = false;

// ── LAN address (for pairing) ──────────────────────────────────────────────

function lanAddress() {
  const nets = os.networkInterfaces();
  const VIRTUAL =
    /vEthernet|wsl|hyper-?v|docker|virtualbox|vbox|vmware|vmnet|vpn|tailscale|zerotier|openvpn|wireguard|hamachi|nordvpn|surfshark|expressvpn|radmin|anyconnect|tun|tap|utun|bluetooth|bt |loopback|ics|bridge/i;
  const PHYSICAL = /wi-?fi|wireless|wlan|ethernet|eth[0-9]|en[0-9]|enp|eth/i;

  const candidates = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (String(net.family) !== "IPv4" || net.internal) continue;
      const addr = net.address;
      if (addr.startsWith("169.254.")) continue;
      if (VIRTUAL.test(name)) continue;
      candidates.push({ name, addr });
    }
  }
  if (candidates.length) {
    const pick = candidates.find((c) => PHYSICAL.test(c.name)) || candidates[0];
    return pick.addr;
  }
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (String(net.family) === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}

// ── Window state persistence ───────────────────────────────────────────────

function loadWindowState() {
  try {
    const fs = require("fs");
    if (fs.existsSync(WINDOW_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(WINDOW_STATE_FILE, "utf-8"));
    }
  } catch { /* ignore */ }
  return { width: 1280, height: 820, x: undefined, y: undefined, maximized: false };
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const fs = require("fs");
    const bounds = mainWindow.getBounds();
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      maximized: mainWindow.isMaximized(),
    };
    fs.writeFileSync(WINDOW_STATE_FILE, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ── Shortcuts config persistence ─────────────────────────────────────────
const SHORTCUTS_FILE = path.join(app.getPath("userData"), "shortcuts.json");

const DEFAULT_SHORTCUTS = {
  "Focus Orleia": "CommandOrControl+Shift+L",
  "New Note": "CommandOrControl+Shift+N",
  "New Task": "CommandOrControl+Shift+T",
};

function loadShortcutsConfig() {
  try {
    const fs = require("fs");
    if (fs.existsSync(SHORTCUTS_FILE)) {
      return JSON.parse(fs.readFileSync(SHORTCUTS_FILE, "utf-8"));
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_SHORTCUTS };
}

function saveShortcutsConfig(shortcuts) {
  try {
    const fs = require("fs");
    fs.writeFileSync(SHORTCUTS_FILE, JSON.stringify(shortcuts, null, 2));
  } catch { /* ignore */ }
}

function registerAllShortcuts() {
  globalShortcut.unregisterAll();
  const shortcuts = loadShortcutsConfig();
  for (const [action, accelerator] of Object.entries(shortcuts)) {
    if (!accelerator) continue;
    try {
      if (action === "Focus Orleia") {
        globalShortcut.register(accelerator, () => showMainWindow());
      } else if (action === "New Note") {
        globalShortcut.register(accelerator, () => {
          showMainWindow();
          sendToRenderer("menu:new-note");
        });
      } else if (action === "New Task") {
        globalShortcut.register(accelerator, () => {
          showMainWindow();
          sendToRenderer("menu:new-task");
        });
      }
    } catch (e) {
      console.error(`[Shortcuts] Failed to register "${accelerator}" for ${action}:`, e.message);
    }
  }
}

// ── Pairing (existing) ────────────────────────────────────────────────────

function requestWorkspaceData() {
  return new Promise((resolve, reject) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      reject(new Error("desktop window unavailable"));
      return;
    }
    const timeout = setTimeout(() => { pendingData = null; reject(new Error("timeout")); }, 15000);
    pendingData = { resolve, reject, timeout };
    mainWindow.webContents.send("pairing:request-data");
  });
}

function applyPhoneAction(action) {
  return new Promise((resolve, reject) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      reject(new Error("desktop window unavailable"));
      return;
    }
    const timeout = setTimeout(() => { pendingAction = null; reject(new Error("timeout")); }, 15000);
    pendingAction = { resolve, reject, timeout };
    mainWindow.webContents.send("pairing:apply-action", action);
  });
}


// ── macOS: Touch Bar buttons ──────────────────────────────────────────────
function setupTouchBar() {
  if (process.platform !== "darwin" || !mainWindow) return;
  try {
    const { TouchBar } = require("electron");
    const { TouchBarButton } = TouchBar;

    const newTaskBtn = new TouchBarButton({
      label: "New Task",
      click: () => { showMainWindow(); sendToRenderer("menu:new-task"); }
    });
    const newNoteBtn = new TouchBarButton({
      label: "New Note",
      click: () => { showMainWindow(); sendToRenderer("menu:new-note"); }
    });
    const newHabitBtn = new TouchBarButton({
      label: "New Habit",
      click: () => { showMainWindow(); sendToRenderer("menu:new-habit"); }
    });

    mainWindow.setTouchBar(new TouchBar({
      items: [newTaskBtn, newNoteBtn, newHabitBtn]
    }));
  } catch (e) {
    // TouchBar not available on this Mac
  }
}

// ── Linux: Create .desktop file ────────────────────────────────────────────
function createLinuxDesktopFile() {
  if (process.platform !== "linux") return;
  try {
    const fs2 = require("fs");
    const os2 = require("os");
    const path2 = require("path");
    var parts = [];
    parts.push("[Desktop Entry]");
    parts.push("Name=Orleia");
    parts.push("Comment=Local-first AI productivity suite");
    parts.push("Exec=orleia-desktop %U");
    parts.push("Icon=orleia-desktop");
    parts.push("Type=Application");
    parts.push("Categories=Office;Productivity;Utility;");
    parts.push("MimeType=text/markdown;text/csv;text/plain;");
    parts.push("Keywords=productivity;habits;tasks;notes;journal;ai;");
    parts.push("StartupWMClass=orleia-desktop");
    parts.push("Terminal=false");
    parts.push("StartupNotify=true");
    var content = parts.join(String.fromCharCode(10));
    var p = path2.join(os2.homedir(), ".local", "share", "applications", "orleia-desktop.desktop");
    fs2.mkdirSync(path2.dirname(p), { recursive: true });
    fs2.writeFileSync(p, content);
  } catch (e) {
    console.error("[Linux] .desktop file:", e.message);
  }
}

// ── System tray ───────────────────────────────────────────────────────────

function createTray() {
  // Use a 16x16 icon for the tray
  const iconPath = path.join(__dirname, "build", "icon.png");
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    // Fallback: create a tiny blank icon
    trayIcon = nativeImage.createEmpty();
  }
  tray = new Tray(trayIcon);
  tray.setToolTip("Orleia");

  const contextMenu = Menu.buildFromTemplate([
    { label: "Show Orleia", click: () => showMainWindow() },
    { type: "separator" },
    { label: "Quit Orleia", click: () => { isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => showMainWindow());
}

function showMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

// ── macOS menu bar ────────────────────────────────────────────────────────

function buildMacMenu() {
  if (process.platform !== "darwin") return;

  const template = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "File",
      submenu: [
        { label: "New Note", accelerator: "CmdOrCtrl+N", click: () => sendToRenderer("menu:new-note") },
        { label: "New Task", accelerator: "CmdOrCtrl+Shift+T", click: () => sendToRenderer("menu:new-task") },
        { type: "separator" },
        { role: "close" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "delete" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Toggle Sidebar", accelerator: "CmdOrCtrl+Shift+D", click: () => sendToRenderer("menu:toggle-sidebar") },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" },
      ],
    },
    {
      label: "Help",
      submenu: [
        { label: "Orleia Website", click: () => shell.openExternal("https://orleia.app") },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function sendToRenderer(channel) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel);
  }
}

// ── Auto-updater ──────────────────────────────────────────────────────────

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update:available", {
        version: info.version,
        releaseNotes: info.releaseNotes,
      });
    }
  });

  autoUpdater.on("update-downloaded", (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      Notification({
        title: "Orleia Update Ready",
        body: `v${info.version} has been downloaded. Click to restart.`,
        silent: false,
      }).on("click", () => autoUpdater.quitAndInstall());
    }
  });

  autoUpdater.on("error", (err) => {
    console.error("[Updater]", err.message);
  });

  // Check on launch, then every 6 hours
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10_000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
}

// ── Deep links (orleia://) ─────────────────────────────────────────────────

function setupDeepLinks() {
  // Register protocol before app is ready (macOS requirement)
  if (process.platform === "darwin") {
    app.setAsDefaultProtocolClient("orleia");
  } else {
    // Windows/Linux: register via app.whenReady
    app.whenReady().then(() => {
      app.setAsDefaultProtocolClient("orleia");
    });
  }

  // Handle deep link on Windows/Linux
  app.on("second-instance", (_event, commandLine) => {
    const url = commandLine.find((arg) => arg.startsWith("orleia://"));
    if (url && mainWindow) {
      showMainWindow();
      mainWindow.webContents.send("deep-link", url);
    }
  });

  // Handle deep link on macOS
  app.on("open-url", (_event, url) => {
    if (url.startsWith("orleia://") && mainWindow) {
      showMainWindow();
      mainWindow.webContents.send("deep-link", url);
    }
  });
}

// ── Main ──────────────────────────────────────────────────────────────────

// Single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  // Deep links must be set up early (before app.ready on macOS)
  setupDeepLinks();

  app.on("second-instance", () => {
    showMainWindow();
  });

  app.on("before-quit", () => {
    isQuitting = true;
    globalShortcut.unregisterAll();
    stopPairingServer();
  });

  app.whenReady().then(() => {
    // ── Window ────────────────────────────────────────────────────────────
    const state = loadWindowState();
    mainWindow = new BrowserWindow({
      width: state.width,
      height: state.height,
      x: state.x,
      y: state.y,
      minWidth: 900,
      minHeight: 600,
      show: false,
      title: "Orleia",
      backgroundColor: nativeTheme.shouldUseDarkColors ? "#0a0a0a" : "#ffffff",
      icon: path.join(__dirname, "build", "icon.png"),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        spellcheck: true,
        preload: path.join(__dirname, "preload.js"),
      },
    });

    if (state.maximized) mainWindow.maximize();

    // ── External links ────────────────────────────────────────────────────
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      // Allow Supabase auth to open in-app
      if (url.includes("supabase.co/auth")) return { action: "allow" };
      if (url.startsWith("https://")) shell.openExternal(url);
      return { action: "deny" };
    });

    mainWindow.webContents.on("will-navigate", (event, url) => {
      // Allow full OAuth flow inside Electron BrowserWindow
      if (url.includes("supabase.co")) return;             // Supabase (auth, callback, API)
      if (url.includes("accounts.google.com")) return;     // Google sign-in
      if (url.includes("github.com")) return;               // GitHub sign-in
      if (url.includes("appleid.apple.com")) return;       // Apple sign-in
      if (url.includes("login.microsoftonline.com")) return; // Microsoft sign-in
      // Allow orleia:// deep links (auth-complete, etc.)
      if (url.startsWith("orleia://")) return;
      if (!url.startsWith(APP_URL)) {
        event.preventDefault();
        if (url.startsWith("http")) shell.openExternal(url);
      }
    });

    // ── Show window ───────────────────────────────────────────────────────
    mainWindow.once("ready-to-show", () => {
      mainWindow.show();

      // F12 toggles devtools
      globalShortcut.register("F12", () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.toggleDevTools();
        }
      });
    });

    // ── Minimize to tray (close button hides, tray Quit actually quits) ───
    mainWindow.on("close", (event) => {
      if (!isQuitting) {
        event.preventDefault();
        mainWindow.hide();
        return false;
      }
      saveWindowState();
    });

    mainWindow.on("closed", () => {
      globalShortcut.unregisterAll();
      mainWindow = null;
      stopPairingServer();
    });

    // ── Save window state on resize/move ──────────────────────────────────
    let saveTimer = null;
    const debouncedSave = () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(saveWindowState, 500);
    };
    mainWindow.on("resize", debouncedSave);
    mainWindow.on("move", debouncedSave);

    // ── Cache bust ────────────────────────────────────────────────────────
    const cacheBust = Date.now();
    mainWindow.webContents.session.clearCache().catch(() => {});
    mainWindow.loadURL(`${APP_URL}?v=${cacheBust}`);

    // ── System tray ───────────────────────────────────────────────────────
    createTray();


    // ── Windows: Jump Lists ───────────────────────────────────────────────
    if (process.platform === 'win32') {
      app.setJumpList([
        {
          name: 'Quick Actions',
          items: [
            { type: 'task', title: 'New Task', program: process.execPath, args: 'orleia://new-task', iconPath: path.join(__dirname, 'build', 'icon.png'), iconIndex: 0 },
            { type: 'task', title: 'New Note', program: process.execPath, args: 'orleia://new-note', iconPath: path.join(__dirname, 'build', 'icon.png'), iconIndex: 0 },
            { type: 'task', title: 'New Habit', program: process.execPath, args: 'orleia://new-habit', iconPath: path.join(__dirname, 'build', 'icon.png'), iconIndex: 0 },
          ]
        },
        {
          name: 'Recent',
          items: []
        }
      ]);
    }

    // ── Windows: Thumbnail Toolbar Buttons ─────────────────────────────────
    if (process.platform === 'win32' && mainWindow) {
      const iconPath = path.join(__dirname, 'build', 'icon.png');
      try {
        mainWindow.setThumbarButtons([
          {
            tooltip: 'New Task',
            icon: nativeImage.createFromPath(path.join(__dirname, 'build', 'icons', 'task.png')),
            click: () => { showMainWindow(); sendToRenderer('menu:new-task'); }
          },
          {
            tooltip: 'New Note',
            icon: nativeImage.createFromPath(path.join(__dirname, 'build', 'icons', 'note.png')),
            click: () => { showMainWindow(); sendToRenderer('menu:new-note'); }
          },
          {
            tooltip: 'Toggle Sidebar',
            icon: nativeImage.createFromPath(path.join(__dirname, 'build', 'icons', 'sidebar.png')),
            click: () => { showMainWindow(); sendToRenderer('menu:toggle-sidebar'); }
          }
        ]);
      } catch (e) {
        console.error('[Thumbar]', e.message);
      }
    }

    // ── Windows: Auto-start with Windows ──────────────────────────────────
    ipcMain.handle('auto-start:get', () => {
      return app.getLoginItemSettings().openAtLogin;
    });
    ipcMain.handle('auto-start:set', (_event, enabled) => {
      app.setLoginItemSettings({ openAtLogin: !!enabled, path: process.execPath });
      return true;
    });

    // ── macOS menu ────────────────────────────────────────────────────────
    buildMacMenu();

    // ── Global keyboard shortcuts ─────────────────────────────────────────
    registerAllShortcuts();

    // ── IPC: shortcuts config ─────────────────────────────────────────────
    ipcMain.handle("shortcuts:get", () => {
      return loadShortcutsConfig();
    });
    ipcMain.handle("shortcuts:set", (_event, shortcuts) => {
      saveShortcutsConfig(shortcuts);
      registerAllShortcuts();
      return true;
    });


    // ── Windows: Taskbar progress bar ─────────────────────────────────────
    ipcMain.handle('taskbar-progress', (_event, percent, mode) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (percent === null || percent === undefined) {
          mainWindow.setProgressBar(-1); // remove progress
        } else {
          mainWindow.setProgressBar(Math.min(1, Math.max(0, percent)), {
            mode: mode || 'normal' // normal, error, indeterminate, paused
          });
        }
      }
      return true;
    });


    // ── Windows: Share target (accept shared text from other apps) ────────
    ipcMain.handle('share-text', (_event, text) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        showMainWindow();
        mainWindow.webContents.send('shared-text', text);
        return true;
      }
      return false;
    });

    // ── Auto-updater ──────────────────────────────────────────────────────
    setupAutoUpdater();

    // ── IPC: pairing (existing) ───────────────────────────────────────────
    ipcMain.handle("pairing:start", async () => {
      const info = await startPairingServer({
        port: PAIRING_PORT,
        cacheDir: PAIRING_CACHE_DIR,
        version: app.getVersion(),
        onData: requestWorkspaceData,
        onAction: applyPhoneAction,
      });
      warmPairingCache();
      const host = lanAddress();
      return {
        url: `http://${host}:${info.port}/?token=${info.token}`,
        token: info.token,
        port: info.port,
        host,
        expiresAt: info.expiresAt,
      };
    });

    ipcMain.handle("pairing:stop", () => {
      stopPairingServer();
      return true;
    });

    ipcMain.on("pairing:data", (_event, json) => {
      if (pendingData) {
        clearTimeout(pendingData.timeout);
        if (json == null) pendingData.reject(new Error("workspace data unavailable"));
        else pendingData.resolve(json);
        pendingData = null;
      }
    });

    ipcMain.on("pairing:action-result", (_event, result) => {
      if (pendingAction) {
        clearTimeout(pendingAction.timeout);
        if (result && result.ok === true) pendingAction.resolve({ ok: true });
        else pendingAction.reject(new Error((result && result.error) || "action failed"));
        pendingAction = null;
      }
    });

    // ── IPC: native notifications from renderer ───────────────────────────
    ipcMain.on("native-notification", (_event, { title, body, actions }) => {
      if (!Notification.isSupported()) return;
      const notif = new Notification({ title, body, silent: false });
      if (actions && actions.length) {
        notif.on("action", (_e, index) => {
          sendToRenderer(`notification-action:${actions[index]?.id || index}`);
        });
      }
      notif.show();
    });

    // ── IPC: OS theme info ────────────────────────────────────────────────
    ipcMain.handle("get-system-theme", () => {
      return nativeTheme.shouldUseDarkColors ? "dark" : "light";
    });

    ipcMain.handle("get-app-version", () => {
      return app.getVersion();
    });

    // Listen for OS theme changes
    nativeTheme.on("updated", () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("system-theme-changed", {
          theme: nativeTheme.shouldUseDarkColors ? "dark" : "light",
        });
      }
    });

    // ── IPC: file drop from OS ────────────────────────────────────────────
    ipcMain.handle("read-dropped-file", async (_event, filePath) => {
      const fs = require("fs");
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const name = path.basename(filePath);
        return { ok: true, name, content };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    });

    // ── IPC: update actions ───────────────────────────────────────────────
    ipcMain.handle("check-for-updates", () => {
      return autoUpdater.checkForUpdates().catch(() => null);
    });

    // ── IPC: auth complete (from success page) ────────────────────────────────────────────────────────
    ipcMain.handle('auth-complete', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(`${APP_URL}?v=${Date.now()}`);
      }
      return true;
    });

    ipcMain.handle("install-update", () => {
      autoUpdater.quitAndInstall();
    });
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}

// ── Agent device workspace ────────────────────────────────────────────────
// One user-chosen folder; remembered across launches (path in userData).
// Text files only, path-locked, dotfiles/node_modules skipped, no exec.
// The renderer never touches Node - everything crosses IPC as JSON.

const fs = require("fs");
const fsp = fs.promises;
const WORKSPACE_FILE = path.join(app.getPath("userData"), "agent-workspace.json");

const WS_TEXT_EXT = new Set([
  "txt", "md", "markdown", "csv", "json", "yml", "yaml", "xml", "html", "htm",
  "css", "js", "mjs", "cjs", "ts", "tsx", "jsx", "py", "rb", "go", "rs", "java",
  "c", "h", "cpp", "hpp", "cs", "php", "sh", "bat", "sql", "ini", "toml",
  "log", "env", "gitignore", "srt", "vtt",
]);

function wsSavedPath() {
  try {
    const saved = JSON.parse(fs.readFileSync(WORKSPACE_FILE, "utf8"));
    return typeof saved?.path === "string" ? saved.path : null;
  } catch {
    return null;
  }
}

function wsIsText(name) {
  const ext = path.extname(name).slice(1).toLowerCase();
  return WS_TEXT_EXT.has(ext) || !name.includes(".");
}

// Path-lock: the resolved target must stay inside the workspace root.
function wsResolve(root, rel) {
  const target = path.resolve(root, rel || ".");
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error("path outside workspace");
  }
  return target;
}

ipcMain.handle("workspace:get", () => {
  const p = wsSavedPath();
  if (!p) return { path: null };
  try {
    fs.accessSync(p);
    return { path: p, name: path.basename(p) };
  } catch {
    return { path: null, stale: p };
  }
});

ipcMain.handle("workspace:pick", async () => {
  const res = await dialog.showOpenDialog({
    title: "Choose Agent's workspace folder",
    message: "Orleia (Agent) will be able to read and edit TEXT files inside this folder.",
    properties: ["openDirectory"],
    buttonLabel: "Grant access",
  });
  if (res.canceled || !res.filePaths.length) return { path: null };
  const p = res.filePaths[0];
  try {
    fs.writeFileSync(WORKSPACE_FILE, JSON.stringify({ path: p }));
  } catch { /* persistence failed - session-only */ }
  return { path: p, name: path.basename(p) };
});

ipcMain.handle("workspace:disconnect", () => {
  try {
    fs.unlinkSync(WORKSPACE_FILE);
  } catch { /* already gone */ }
  return { ok: true };
});

ipcMain.handle("workspace:list", async (_e, rel = "") => {
  const root = wsSavedPath();
  if (!root) return { error: "no workspace" };
  let base;
  try {
    base = wsResolve(root, rel);
  } catch (err) {
    return { error: err.message };
  }
  const entries = [];
  async function walk(dir, prefix, depth) {
    if (depth > 4 || entries.length >= 300) return;
    let items = [];
    try {
      items = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const it of items) {
      if (entries.length >= 300) return;
      if (it.name.startsWith(".") || it.name === "node_modules") continue;
      const p = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.isDirectory()) {
        entries.push({ path: p, isDir: true });
        await walk(path.join(dir, it.name), p, depth + 1);
      } else if (it.isFile()) {
        let size = 0;
        try {
          size = (await fsp.stat(path.join(dir, it.name))).size;
        } catch { /* unreadable - size 0 */ }
        entries.push({ path: p, isDir: false, size, text: wsIsText(it.name) });
      }
    }
  }
  await walk(base, "", 0);
  return { root: path.basename(root), entries };
});

ipcMain.handle("workspace:read", async (_e, rel) => {
  const root = wsSavedPath();
  if (!root) return { error: "no workspace" };
  try {
    const target = wsResolve(root, String(rel || ""));
    if (!wsIsText(path.basename(target))) return { error: "text files only" };
    const st = await fsp.stat(target);
    if (!st.isFile()) return { error: "not a file" };
    if (st.size > 200 * 1024) return { error: `file too large (${st.size} bytes)` };
    return { content: (await fsp.readFile(target, "utf8")).slice(0, 100_000) };
  } catch (err) {
    return { error: err.message || "read failed" };
  }
});

ipcMain.handle("workspace:write", async (_e, rel, content) => {
  const root = wsSavedPath();
  if (!root) return { error: "no workspace" };
  try {
    if (typeof content !== "string") return { error: "content must be text" };
    const target = wsResolve(root, String(rel || ""));
    if (!wsIsText(path.basename(target))) return { error: "text files only" };
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, content, "utf8");
    return { ok: true, bytes: Buffer.byteLength(content, "utf8") };
  } catch (err) {
    return { error: err.message || "write failed" };
  }
});

ipcMain.handle("workspace:remove", async (_e, rel) => {
  const root = wsSavedPath();
  if (!root) return { error: "no workspace" };
  try {
    const target = wsResolve(root, String(rel || ""));
    const st = await fsp.stat(target);
    if (st.isDirectory()) return { error: "only files can be deleted" };
    await fsp.unlink(target);
    return { ok: true };
  } catch (err) {
    return { error: err.message || "delete failed" };
  }
});
