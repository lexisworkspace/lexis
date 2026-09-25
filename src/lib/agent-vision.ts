// ============================================================
// Agent vision - live screen awareness for Agent mode.
//
// Agent can see what the user sees: a frame of the Orleia app
// (html2canvas, local-only) plus a snapshot of the device
// environment (OS, browser, viewport, theme, language, battery).
// Both are injected into the Agent request so "what am I looking
// at?" and "what device am I on?" just work.
//
// PRIVACY: everything happens on-device. The frame is captured
// from the DOM by the browser itself and goes only to Orleia's
// own /api/vision endpoint. No third party, nothing stored.
// ============================================================

export interface EnvironmentSnapshot {
  os: string;
  browser: string;
  viewport: string;
  screen: string;
  devicePixelRatio: number;
  language: string;
  timezone: string;
  online: boolean;
  theme: string;
  accent: string;
  battery: string | null;
  hardwareConcurrency: number | null;
  touch: boolean;
  installedPwa: boolean;
}

function detectOs(ua: string): string {
  if (/Windows NT 10/.test(ua)) return "Windows 10/11";
  if (/Windows/.test(ua)) return "Windows";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS/iPadOS";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Linux/.test(ua)) return "Linux";
  return "unknown";
}

function detectBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "unknown";
}

/** Snapshot of the device environment (synchronous, all local). */
export function captureEnvironment(): EnvironmentSnapshot | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") return null;
  try {
    const nav = navigator as Navigator & { standalone?: boolean };
    const theme =
      document.documentElement.classList.contains("dark") ||
      document.documentElement.dataset.theme === "dark"
        ? "dark"
        : "light";
    const accent =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--primary-500")
        .trim() || "";
    return {
      os: detectOs(nav.userAgent || ""),
      browser: detectBrowser(nav.userAgent || ""),
      viewport: window.innerWidth + "x" + window.innerHeight,
      screen: screen.width + "x" + screen.height,
      devicePixelRatio: window.devicePixelRatio || 1,
      language: nav.language || "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      online: nav.onLine !== false,
      theme,
      accent,
      battery: null,
      hardwareConcurrency: nav.hardwareConcurrency ?? null,
      touch: "ontouchstart" in window || (nav.maxTouchPoints || 0) > 0,
      installedPwa:
        window.matchMedia("(display-mode: standalone)").matches ||
        nav.standalone === true,
    };
  } catch {
    return null;
  }
}

/** Environment + battery (async where supported). */
export async function captureEnvironmentFull(): Promise<EnvironmentSnapshot | null> {
  const env = captureEnvironment();
  if (!env) return null;
  try {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number; charging: boolean }>;
    };
    if (nav.getBattery) {
      const b = await nav.getBattery();
      env.battery = Math.round(b.level * 100) + "%" + (b.charging ? " charging" : "");
    }
  } catch {
    /* unsupported - fine */
  }
  return env;
}

/**
 * Capture a frame of the Orleia app itself (the visible DOM), scaled
 * down and JPEG-compressed. Returns a data URL or null.
 */
export async function captureAppFrame(maxWidth = 1280, quality = 0.72): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const mod = (await import("html2canvas")) as unknown as {
      default?: (
        element: HTMLElement,
        options?: Record<string, unknown>
      ) => Promise<HTMLCanvasElement>;
    };
    const html2canvas = mod.default ?? (mod as unknown as (
      element: HTMLElement,
      options?: Record<string, unknown>
    ) => Promise<HTMLCanvasElement>);
    const canvas = await html2canvas(document.body, {
      backgroundColor: null,
      scale: Math.min(maxWidth / Math.max(window.innerWidth, 1), 1),
      logging: false,
      useCORS: true,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      x: window.scrollX,
      y: window.scrollY,
    });
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return null;
  }
}

/** Human-readable environment block for the AI system context. */
export function describeEnvironment(env: EnvironmentSnapshot): string {
  const parts = [
    "OS: " + env.os,
    "Browser: " + env.browser,
    "Viewport: " + env.viewport + " (screen " + env.screen + ", DPR " + env.devicePixelRatio + ")",
    "Language: " + env.language + " | Timezone: " + env.timezone,
    "Theme: " + env.theme + (env.accent ? " | Accent: " + env.accent : ""),
    "Connectivity: " + (env.online ? "online" : "offline"),
    env.battery ? "Battery: " + env.battery : "",
    env.hardwareConcurrency ? "CPU cores: " + env.hardwareConcurrency : "",
    env.touch ? "Touch input" : "Pointer input",
    env.installedPwa ? "Installed as app (standalone)" : "Running in browser tab",
  ].filter(Boolean);
  return parts.join(" | ");
}

/**
 * Full Agent context: environment block + described app frame.
 * Returns '' when screen awareness is unavailable/disabled.
 */
export async function buildAgentVisionContext(): Promise<string> {
  const env = await captureEnvironmentFull();
  if (!env) return "";
  let block =
    "\n\nDEVICE ENVIRONMENT (live, captured just now - the user may ask about it):\n" +
    describeEnvironment(env);

  try {
    const frame = await captureAppFrame();
    if (frame) {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: frame,
          hint: "the user's Orleia app screen right now",
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { description?: string };
        const desc = (data.description || "").trim();
        if (desc) {
          block +=
            "\n\nCURRENT SCREEN (what the user is looking at in Orleia right now):\n" + desc;
        }
      }
    }
  } catch {
    /* screen capture unavailable - environment alone is fine */
  }
  return block;
}
