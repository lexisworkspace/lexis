"use client";

// ============================================================
// Noor Agent device access - File System Access API.
//
// The user explicitly grants ONE folder ("workspace"). Inside it Agent
// can list, read, write and delete TEXT files. Nothing outside the
// granted folder is reachable - the browser sandbox enforces this
// harder than any code could. No binaries are written, no executables,
// nothing outside the folder, ever. Re-granting after a reload is a
// browser security rule (same pattern as Figma/VS Code web).
// ============================================================

const STORAGE_KEY = "orleia-agent-device-dir";
const MAX_FILES = 40;
const MAX_DEPTH = 4;
const MAX_TOTAL_CHARS = 160_000;
const TEXT_EXT = new Set([
  "txt", "md", "markdown", "csv", "json", "yml", "yaml", "xml", "html", "htm",
  "css", "js", "mjs", "cjs", "ts", "tsx", "jsx", "py", "rb", "go", "rs", "java",
  "c", "h", "cpp", "hpp", "cs", "php", "sh", "bat", "sql", "ini", "toml",
  "log", "env", "gitignore", "srt", "vtt",
]);

/* eslint-disable @typescript-eslint/no-explicit-any */
type DirHandle = any;

// Electron desktop bridge (native picker + permanent memory). Present only
// inside the Orleia desktop app; plain web falls back to File System Access.
interface ElectronWorkspace {
  get: () => Promise<{ path: string | null; name?: string; stale?: string }>;
  pick: () => Promise<{ path: string | null; name?: string }>;
  disconnect: () => Promise<{ ok?: boolean }>;
  list: (rel?: string) => Promise<{ root?: string; entries?: { path: string; isDir: boolean; size?: number; text?: boolean }[]; error?: string }>;
  read: (rel: string) => Promise<{ content?: string; error?: string }>;
  write: (rel: string, content: string) => Promise<{ ok?: boolean; bytes?: number; error?: string }>;
  remove: (rel: string) => Promise<{ ok?: boolean; error?: string }>;
}
function wsElectron(): ElectronWorkspace | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { orleiaWorkspace?: ElectronWorkspace };
  return w.orleiaWorkspace ?? null;
}

export function isDeviceAccessSupported(): boolean {
  if (wsElectron()) return true;
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export function getGrantedDirName(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setGrantedDirName(name: string | null) {
  try {
    if (name) localStorage.setItem(STORAGE_KEY, name);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

/** In-memory handle for the current session. Restored from IndexedDB when
 * the browser still honors the grant (Chrome persists the permission for
 * installed PWAs; otherwise one tap re-arms it). */
let currentHandle: DirHandle | null = null;

// ---- IndexedDB handle persistence (web only) ------------------------------
const IDB_NAME = "orleia-agent-fs";
const IDB_STORE = "handles";

function idbOpen(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function idbSetHandle(handle: DirHandle | null): Promise<void> {
  const db = await idbOpen();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const st = tx.objectStore(IDB_STORE);
    if (handle) st.put(handle, "workspace");
    else st.delete("workspace");
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}

/** Restore the persisted handle (if any) into the session. Silent on failure. */
async function restoreHandle(): Promise<DirHandle | null> {
  if (currentHandle) return currentHandle;
  const db = await idbOpen();
  if (!db) return null;
  const handle = await new Promise<DirHandle | null>((resolve) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get("workspace");
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => resolve(null);
  });
  db.close();
  if (!handle) return null;
  try {
    // queryPermission: "granted" means the browser still honors the grant
    // (typical for installed PWAs); "prompt" needs one user gesture, which
    // the reconnect row provides.
    const q = await handle.queryPermission?.({ mode: "readwrite" });
    if (q === "granted") {
      currentHandle = handle;
      return handle;
    }
  } catch {
    /* handle unusable - treat as absent */
  }
  return null;
}

/**
 * Open the folder picker. MUST be called from a user gesture (a click).
 * Returns the directory name, or null if cancelled/unsupported.
 */
export async function pickWorkspaceFolder(): Promise<string | null> {
  const el = wsElectron();
  if (el) {
    // Desktop: native OS dialog, and the main process remembers the path
    // permanently - no re-granting after restarts.
    const res = await el.pick();
    if (res?.path) {
      setGrantedDirName(res.name || res.path);
      return res.name || res.path;
    }
    return null;
  }
  if (!isDeviceAccessSupported()) return null;
  try {
    const handle = await (window as any).showDirectoryPicker({ id: "orleia-workspace", mode: "readwrite" });
    currentHandle = handle;
    setGrantedDirName(handle.name);
    await idbSetHandle(handle);
    return handle.name as string;
  } catch {
    return null; // user cancelled
  }
}

export function disconnectWorkspace() {
  currentHandle = null;
  setGrantedDirName(null);
  void idbSetHandle(null);
  const el = wsElectron();
  if (el) void el.disconnect();
}

/** True when the saved grant is actually usable right now (handle live or
 * desktop bridge connected). The UI row uses this to tell the truth. */
export async function isWorkspaceActive(): Promise<boolean> {
  const el = wsElectron();
  if (el) {
    const got = await el.get();
    return Boolean(got.path);
  }
  return (await restoreHandle()) !== null;
}

/** One-gesture re-arm of a saved grant the browser put back behind a prompt. */
export async function rearmWorkspace(): Promise<boolean> {
  const db = await idbOpen();
  if (!db) return false;
  const handle = await new Promise<DirHandle | null>((resolve) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get("workspace");
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => resolve(null);
  });
  db.close();
  if (!handle) return false;
  try {
    const q = await handle.queryPermission?.({ mode: "readwrite" });
    if (q !== "granted") {
      const r = await handle.requestPermission?.({ mode: "readwrite" });
      if (r !== "granted") return false;
    }
    currentHandle = handle;
    return true;
  } catch {
    return false;
  }
}

/** The live handle, if the folder is connected this session. */
export function getWorkspaceHandle(): DirHandle | null {
  return currentHandle;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function isTextFile(name: string): boolean {
  return TEXT_EXT.has(extOf(name)) || !name.includes(".");
}

async function* walk(
  dir: DirHandle,
  prefix: string,
  depth: number
): AsyncGenerator<{ path: string; handle: any; file: boolean }> {
  if (depth > MAX_DEPTH) return;
  for await (const entry of dir.values()) {
    const name = entry.name as string;
    if (name.startsWith(".") || name === "node_modules") continue;
    const path = prefix ? `${prefix}/${name}` : name;
    if (entry.kind === "file") yield { path, handle: entry, file: true };
    else if (entry.kind === "directory") {
      yield { path, handle: entry, file: false };
      yield* walk(entry, path, depth + 1);
    }
  }
}

/** Inventory of the granted folder (names + sizes only - no content). */
export async function describeWorkspace(): Promise<string | null> {
  const el = wsElectron();
  if (el) {
    const got = await el.get();
    if (!got.path) return null;
    const lst = await el.list("");
    if (lst.error || !lst.entries) return null;
    const lines: string[] = [];
    let files = 0;
    let dirs = 0;
    for (const e of lst.entries) {
      if (e.isDir) {
        dirs++;
        if (dirs <= MAX_FILES) lines.push(`- ${e.path}/ (folder)`);
      } else {
        files++;
        if (files <= MAX_FILES)
          lines.push(`- ${e.path}${e.text === false ? " (binary - skip)" : ""} (${e.size ?? 0} bytes)`);
      }
    }
    if (!files && !dirs) return `The granted workspace folder "${got.name || got.path}" is empty.`;
    const overflow: string[] = [];
    if (files > MAX_FILES) overflow.push(`...and ${files - MAX_FILES} more files`);
    if (dirs > MAX_FILES) overflow.push(`...and ${dirs - MAX_FILES} more folders`);
    const more = overflow.length ? `\n- ${overflow.join(", ")}` : "";
    return `The user granted you a workspace folder on their device: "${got.name || got.path}". Contents (entries ending with / are folders):\n${lines.join("\n")}${more}\nYou can read, write, list and delete TEXT files inside it with ORLEIA_TOOL workspace_* calls. To enter a subfolder, use paths like "subfolder/file.txt".`;
  }
  await restoreHandle();
  if (!currentHandle) return null;
  const lines: string[] = [];
  let files = 0;
  let dirs = 0;
  try {
    for await (const it of walk(currentHandle, "", 0)) {
      if (!it.file) {
        // Folders are listed too, so Agent can navigate into subfolders
        // by name when the user asks ("find the X folder and ...").
        dirs++;
        if (dirs <= MAX_FILES) lines.push(`- ${it.path}/ (folder)`);
        continue;
      }
      files++;
      if (files <= MAX_FILES) {
        let size = 0;
        try {
          size = (await it.handle.getFile()).size;
        } catch {
          /* unreadable - skip size */
        }
        lines.push(`- ${it.path} (${size} bytes)`);
      }
    }
  } catch {
    return null;
  }
  if (!files && !dirs)
    return `The granted workspace folder "${currentHandle.name}" is empty.`;
  const overflow: string[] = [];
  if (files > MAX_FILES) overflow.push(`...and ${files - MAX_FILES} more files`);
  if (dirs > MAX_FILES) overflow.push(`...and ${dirs - MAX_FILES} more folders`);
  const more = overflow.length ? `\n- ${overflow.join(", ")}` : "";
  return `The user granted you a workspace folder on their device: "${currentHandle.name}". Contents (entries ending with / are folders):
${lines.join("\n")}${more}
You can read, write, list and delete TEXT files inside it with ORLEIA_TOOL workspace_* calls. To enter a subfolder, use paths like "subfolder/file.txt".`;
}

/** Read one text file from the workspace. */
export async function readWorkspaceFile(path: string): Promise<string> {
  const el = wsElectron();
  if (el) {
    const r = await el.read(path);
    if (r.error || typeof r.content !== "string") return `ERROR: ${r.error || "read failed"}.`;
    return `CONTENT of ${path}:\n${r.content.slice(0, 8_000)}${r.content.length > 8_000 ? "\n...(truncated)" : ""}`;
  }
  if (!currentHandle) return "ERROR: workspace folder not connected this session.";
  try {
    const parts = path.split("/").filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) return "ERROR: empty path.";
    let dir: any = currentHandle;
    for (const seg of parts) dir = await dir.getDirectoryHandle(seg);
    const fh = await dir.getFileHandle(fileName);
    const file = await fh.getFile();
    if (file.size > 200_000) return `ERROR: file too large to read (${file.size} bytes).`;
    const text = await file.text();
    return `CONTENT of ${path}:\n${text.slice(0, 8_000)}${text.length > 8_000 ? "\n...(truncated)" : ""}`;
  } catch {
    return `ERROR: could not read ${path}.`;
  }
}

/** Read up to MAX_FILES text files - the "understand my folder" bulk op. */
export async function readWorkspaceBulk(): Promise<string> {
  const el = wsElectron();
  if (el) {
    const lst = await el.list("");
    if (lst.error || !lst.entries) return "ERROR: could not list the workspace folder.";
    const out: string[] = [];
    let total = 0;
    let n = 0;
    for (const e of lst.entries) {
      if (n >= MAX_FILES) break;
      if (e.isDir || e.text === false) continue;
      const r = await el.read(e.path);
      if (r.error || typeof r.content !== "string") continue;
      total += r.content.length;
      if (total > MAX_TOTAL_CHARS) {
        out.push(`- ${e.path}: skipped (size budget reached)`);
        continue;
      }
      out.push(`[${e.path}]\n${r.content.slice(0, 2_500)}`);
      n++;
    }
    if (!out.length) return "No readable text files in the workspace.";
    return `WORKSPACE CONTENTS (${n} files):\n\n` + out.join("\n\n");
  }
  if (!currentHandle) return "ERROR: workspace folder not connected this session.";
  const out: string[] = [];
  let total = 0;
  let n = 0;
  try {
    for await (const it of walk(currentHandle, "", 0)) {
      if (!it.file || n >= MAX_FILES) continue;
      if (!isTextFile(it.path.split("/").pop() || "")) continue;
      try {
        const file = await it.handle.getFile();
        const text = await file.text();
        total += text.length;
        if (total > MAX_TOTAL_CHARS) {
          out.push(`- ${it.path}: skipped (size budget reached)`);
          continue;
        }
        out.push(`[${it.path}]\n${text.slice(0, 2_500)}`);
        n++;
      } catch {
        /* unreadable - skip */
      }
    }
  } catch {
    return "ERROR: could not walk the workspace folder.";
  }
  if (!out.length) return "No readable text files in the workspace.";
  return `WORKSPACE CONTENTS (${n} files):\n\n` + out.join("\n\n");
}

/** Write (create or overwrite) a text file inside the workspace. */
export async function writeWorkspaceFile(path: string, content: string): Promise<string> {
  const el = wsElectron();
  if (el) {
    const r = await el.write(path, content);
    if (r.error) return `ERROR: ${r.error}.`;
    return `OK: wrote ${path} (${r.bytes ?? content.length} bytes).`;
  }
  if (!currentHandle) return "ERROR: workspace folder not connected this session.";
  try {
    const parts = path.split("/").filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) return "ERROR: empty path.";
    if (!isTextFile(fileName)) return "ERROR: only text files can be written (no binaries).";
    let dir: any = currentHandle;
    for (const seg of parts) dir = await dir.getDirectoryHandle(seg, { create: true });
    const fh = await dir.getFileHandle(fileName, { create: true });
    const w = await fh.createWritable();
    await w.write(content);
    await w.close();
    return `OK: wrote ${path} (${content.length} chars).`;
  } catch {
    return `ERROR: could not write ${path}.`;
  }
}

/** Delete one file inside the workspace. */
export async function deleteWorkspaceFile(path: string): Promise<string> {
  const el = wsElectron();
  if (el) {
    const r = await el.remove(path);
    if (r.error) return `ERROR: ${r.error}.`;
    return `OK: deleted ${path}.`;
  }
  if (!currentHandle) return "ERROR: workspace folder not connected this session.";
  try {
    const parts = path.split("/").filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) return "ERROR: empty path.";
    let dir: any = currentHandle;
    for (const seg of parts) dir = await dir.getDirectoryHandle(seg);
    await dir.removeEntry(fileName);
    return `OK: deleted ${path}.`;
  } catch {
    return `ERROR: could not delete ${path}.`;
  }
}
