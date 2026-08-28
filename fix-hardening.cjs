const fs = require("fs");

function patch(file, fn) {
  const c = fs.readFileSync(file, "utf8");
  const nl = c.includes("\r\n") ? "\r\n" : "\n";
  const norm = c.split(/\r?\n/).join("\n");
  const out = fn(norm);
  if (out === norm) {
    console.log("NO-CHANGE", file);
    return;
  }
  fs.writeFileSync(file, out.split("\n").join(nl));
  console.log("PATCHED", file);
}

// ============ 1. PasswordGate.tsx -> PBKDF2-SHA256 ============
patch("src/components/layout/PasswordGate.tsx", (c) => {
  // Insert PBKDF2 helpers after sha256Hex.
  const shaOld = `async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}`;
  const shaNew = shaOld + `

// PBKDF2-SHA256 with a random per-install salt - key-stretched so a stolen
// hash can't be brute-forced offline. Format: pbkdf2$<iterations>$<salt>$<hash>
const PBKDF2_ITERATIONS = 120_000;

async function pbkdf2Hash(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const toB64 = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
const fromB64 = (b64: string) =>
  new Uint8Array(Array.from(atob(b64), (ch) => ch.charCodeAt(0)));`;
  if (!c.includes(shaOld)) throw new Error("sha256Hex anchor not found");
  c = c.replace(shaOld, shaNew);

  // Replace hashPassword.
  const hpOld = `async function hashPassword(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    return sha256Hex(input);
  }
  return fallbackHash(input);
}`;
  const hpNew = `async function hashPassword(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await pbkdf2Hash(input, salt, PBKDF2_ITERATIONS);
    return \`pbkdf2$\${PBKDF2_ITERATIONS}$\${toB64(salt)}$\${hash}\`;
  }
  // crypto.subtle unavailable (plain-http LAN testing) - non-stretched fallback.
  return \`fallback$\${fallbackHash(input)}\`;
}`;
  if (!c.includes(hpOld)) throw new Error("hashPassword anchor not found");
  c = c.replace(hpOld, hpNew);

  // Replace verifyPassword with multi-format verification + in-place upgrade.
  const vpOld = `export async function verifyPassword(password: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(PASSWORD_KEY);
    if (!stored) return false;
    const hash = await hashPassword(password);
    if (stored === hash) return true;
    // Legacy plaintext stored before hashing - verify, then upgrade in place.
    if (!isHash(stored) && stored === password) {
      await storePassword(password);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}`;
  const vpNew = `export async function verifyPassword(password: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(PASSWORD_KEY);
    if (!stored) return false;
    // Modern PBKDF2 format: pbkdf2$<iterations>$<salt>$<hash>
    if (stored.startsWith("pbkdf2$")) {
      const parts = stored.split("$");
      if (parts.length !== 4) return false;
      const iterations = parseInt(parts[1], 10) || PBKDF2_ITERATIONS;
      const hash = await pbkdf2Hash(password, fromB64(parts[2]), iterations);
      return hash === parts[3];
    }
    // Non-stretched fallback (only used when crypto.subtle is unavailable).
    if (stored.startsWith("fallback$")) {
      return stored === \`fallback$\${fallbackHash(password)}\`;
    }
    // Legacy SHA-256 hex hash or plaintext - verify, then upgrade in place.
    const hash = await sha256Hex(password);
    if (stored === hash || (!isHash(stored) && stored === password)) {
      await storePassword(password);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}`;
  if (!c.includes(vpOld)) throw new Error("verifyPassword anchor not found");
  c = c.replace(vpOld, vpNew);
  return c;
});

// ============ 2. next.config.mjs -> CSP upgrade-insecure-requests ============
patch("next.config.mjs", (c) => {
  const oldCsp = `value:
              "default-src 'self'; " +`;
  const newCsp = `value:
              "upgrade-insecure-requests; default-src 'self'; " +`;
  if (!c.includes(oldCsp)) throw new Error("CSP anchor not found");
  return c.replace(oldCsp, newCsp);
});

// ============ 3. Rate limits on expensive endpoints ============
patch("src/app/api/transcribe/route.ts", (c) => {
  const old = `guardApi(req, { perMinute: 20, perDay: 300 })`;
  const neu = `guardApi(req, { perMinute: 10, perDay: 100 })`;
  if (!c.includes(old)) throw new Error("transcribe guard anchor not found");
  return c.replace(old, neu);
});

patch("src/app/api/tts/route.ts", (c) => {
  const old = `guardApi(req, { perMinute: 60, perDay: 800 })`;
  const neu = `guardApi(req, { perMinute: 20, perDay: 300 })`;
  if (!c.includes(old)) throw new Error("tts guard anchor not found");
  return c.replace(old, neu);
});

patch("src/app/api/brain/route.ts", (c) => {
  const old = `guardApi(req, { perMinute: 30, perDay: 2000 })`;
  const neu = `guardApi(req, { perMinute: 20, perDay: 500 })`;
  if (!c.includes(old)) throw new Error("brain guard anchor not found");
  return c.replace(old, neu);
});

console.log("DONE");
