// ============================================================
// Device identity — anonymous, stable, local.
// One UUID per browser/install, generated on first use. Sent with
// /api/chat so the server can enforce the Noor cap per device.
// No accounts, no emails, no personal data.
// ============================================================

const KEY = "orleia-device-id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(KEY);
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Private-mode edge cases: ephemeral per-session id (still functional,
    // cap just resets when the tab closes).
    return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "anon";
  }
}
