// Lexis Desktop Bridge — detects Electron and exposes native OS features.
// All calls are no-ops in the browser (graceful degradation).

declare global {
  interface Window {
    lexisDesktop?: {
      pairing: {
        available: boolean;
        start: () => Promise<{ url: string; token: string; port: number; host: string; expiresAt: number }>;
        stop: () => Promise<boolean>;
        onDataRequest: (provider: () => string) => void;
        onPairAction: (handler: (action: unknown) => Promise<{ ok: boolean; error?: string }>) => void;
      };
      notify: (title: string, body: string, actions?: Array<{ id: string; label: string }>) => void;
      getSystemTheme: () => Promise<"dark" | "light">;
      onThemeChanged: (callback: (theme: "dark" | "light") => void) => void;
      getVersion: () => Promise<string>;
      onDeepLink: (callback: (url: string) => void) => void;
      readFile: (filePath: string) => Promise<{ ok: boolean; name?: string; content?: string; error?: string }>;
      onMenuAction: (channel: string, callback: () => void) => void;
      onUpdateAvailable: (callback: (info: { version: string; releaseNotes: string }) => void) => void;
      checkForUpdates: () => Promise<unknown>;
      installUpdate: () => void;
      getShortcuts: () => Promise<Record<string, string>>;
      setTaskbarProgress: (percent: number | null, mode?: string) => Promise<boolean>;
      getAutoStart: () => Promise<boolean>;
      setAutoStart: (enabled: boolean) => Promise<boolean>;
      onFileOpened: (callback: (data: { name: string; content: string; path: string }) => void) => void;
      onNewHabit: (callback: () => void) => void;
      shareText: (text: string) => Promise<boolean>;
      onSharedText: (callback: (text: string) => void) => void;
      setShortcuts: (shortcuts: Record<string, string>) => Promise<boolean>;
      authComplete: () => Promise<boolean>;
    };
  }
}

const isElectron = typeof window !== "undefined" && !!window.lexisDesktop;

/** Send a native OS notification (Electron) or fall back to browser Notification. */
export function nativeNotify(title: string, body: string, onClick?: () => void): void {
  if (isElectron && window.lexisDesktop) {
    window.lexisDesktop.notify(title, body);
    return;
  }
  // Browser fallback
  if ("Notification" in window && Notification.permission === "granted") {
    const n = new Notification(title, { body, icon: "/lexis-logo.png" });
    if (onClick) n.onclick = () => { window.focus(); onClick(); };
  }
}

/** Get the current OS theme (dark/light). Returns null in browser. */
export async function getOSTheme(): Promise<"dark" | "light" | null> {
  if (isElectron && window.lexisDesktop) {
    return window.lexisDesktop.getSystemTheme();
  }
  return null;
}

/** Listen for OS theme changes (Electron only). Returns unsubscribe. */
export function onOSThemeChange(callback: (theme: "dark" | "light") => void): () => void {
  if (isElectron && window.lexisDesktop) {
    window.lexisDesktop.onThemeChanged(callback);
    return () => {}; // Electron listeners are cleaned up on app quit
  }
  return () => {};
}

/** Get the desktop app version. Returns null in browser. */
export async function getDesktopVersion(): Promise<string | null> {
  if (isElectron && window.lexisDesktop) {
    return window.lexisDesktop.getVersion();
  }
  return null;
}

/** Listen for deep links (lexis://protocol). */
export function onDeepLink(callback: (url: string) => void): () => void {
  if (isElectron && window.lexisDesktop) {
    window.lexisDesktop.onDeepLink(callback);
    return () => {};
  }
  return () => {};
}

/** Listen for menu actions from macOS menu bar. */
export function onMenuAction(channel: string, callback: () => void): () => void {
  if (isElectron && window.lexisDesktop) {
    window.lexisDesktop.onMenuAction(channel, callback);
    return () => {};
  }
  return () => {};
}

/** Listen for update notifications from auto-updater. */
export function onUpdateAvailable(callback: (info: { version: string; releaseNotes: string }) => void): () => void {
  if (isElectron && window.lexisDesktop) {
    window.lexisDesktop.onUpdateAvailable(callback);
    return () => {};
  }
  return () => {};
}

/** Trigger an update install (Electron only). */
export function installUpdate(): void {
  if (isElectron && window.lexisDesktop) {
    window.lexisDesktop.installUpdate();
  }
}

/** Read a file dropped from the OS file manager. */
export async function readDroppedFile(filePath: string): Promise<{ ok: boolean; name?: string; content?: string }> {
  if (isElectron && window.lexisDesktop) {
    return window.lexisDesktop.readFile(filePath);
  }
  return { ok: false };
}

/** Get configured keyboard shortcuts (Electron only). */
export async function getShortcuts(): Promise<Record<string, string> | null> {
  if (isElectron && window.lexisDesktop) {
    return window.lexisDesktop.getShortcuts();
  }
  return null;
}

/** Set keyboard shortcuts (Electron only). */
export async function setShortcuts(shortcuts: Record<string, string>): Promise<boolean> {
  if (isElectron && window.lexisDesktop) {
    return window.lexisDesktop.setShortcuts(shortcuts);
  }
  return false;
}

/** Check if running inside Electron. */
export function isDesktop(): boolean {
  return isElectron;
}

/** Tell Electron that auth is complete — reloads the window to the workspace. */
export async function authComplete(): Promise<boolean> {
  if (isElectron && window.lexisDesktop) {
    return window.lexisDesktop.authComplete();
  }
  return false;
}


/** Get auto-start setting (desktop only). */
export async function getAutoStart(): Promise<boolean> {
  if (isElectron && window.lexisDesktop) {
    return window.lexisDesktop.getAutoStart();
  }
  return false;
}

/** Set auto-start with OS (desktop only). */
export async function setAutoStart(enabled: boolean): Promise<boolean> {
  if (isElectron && window.lexisDesktop) {
    return window.lexisDesktop.setAutoStart(enabled);
  }
  return false;
}

/** Listen for files opened from OS (double-click .md/.csv). */
export function onFileOpened(callback: (data: { name: string; content: string; path: string }) => void): () => void {
  if (isElectron && window.lexisDesktop) {
    window.lexisDesktop.onFileOpened(callback);
    return () => {};
  }
  return () => {};
}

/** Listen for new-habit action from jump list / thumbnail toolbar. */
export function onNewHabit(callback: () => void): () => void {
  if (isElectron && window.lexisDesktop) {
    window.lexisDesktop.onNewHabit(callback);
    return () => {};
  }
  return () => {};
}


/** Set taskbar progress bar (Windows only). Pass null to remove. */
export async function setTaskbarProgress(percent: number | null, mode?: string): Promise<boolean> {
  if (isElectron && window.lexisDesktop) {
    return window.lexisDesktop.setTaskbarProgress(percent, mode);
  }
  return false;
}


/** Share text to Lexis from another app (desktop only). */
export async function shareText(text: string): Promise<boolean> {
  if (isElectron && window.lexisDesktop) {
    return window.lexisDesktop.shareText(text);
  }
  return false;
}

/** Listen for shared text from other apps. */
export function onSharedText(callback: (text: string) => void): () => void {
  if (isElectron && window.lexisDesktop) {
    window.lexisDesktop.onSharedText(callback);
    return () => {};
  }
  return () => {};
}
