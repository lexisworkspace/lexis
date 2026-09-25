"use client";

// Orleia biometric unlock — WebAuthn-based fingerprint/face unlock.
// Works alongside the existing password gate. Purely local —
// the credential never leaves the device.
//
// Flow:
//   1. User enables biometric in Settings → registers a WebAuthn credential
//   2. On next unlock, user can choose "Use fingerprint/face"
//   3. WebAuthn verifies → unlocks the workspace

const PASSKEY_CREDENTIAL_KEY = "orleia-passkey-credential";
const PASSKEY_ENABLED_KEY = "orleia-passkey-enabled";

// ── Check if biometrics are available ──

export async function isBiometricsAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!window.PublicKeyCredential) return false;

  try {
    // Check if platform authenticator is available (fingerprint/face)
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

export function isBiometricsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PASSKEY_ENABLED_KEY) === "true";
}

export function setBiometricsEnabled(enabled: boolean): void {
  localStorage.setItem(PASSKEY_ENABLED_KEY, enabled ? "true" : "false");
}

// ── Register a passkey credential ──

export async function registerBiometric(): Promise<{ ok: boolean; error?: string }> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Orleia", id: window.location.hostname },
        user: {
          id: userId,
          name: "orleia-user",
          displayName: "Orleia User",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },   // ES256
          { alg: -257, type: "public-key" },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60_000,
      },
    }) as PublicKeyCredential | null;

    if (!credential) {
      return { ok: false, error: "Biometric registration cancelled" };
    }

    // Store the credential ID for future authentication
    const credentialId = btoa(
      String.fromCharCode(...new Uint8Array(credential.rawId))
    );
    localStorage.setItem(PASSKEY_CREDENTIAL_KEY, credentialId);
    setBiometricsEnabled(true);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Registration failed: ${err}` };
  }
}

// ── Authenticate with biometrics ──

export async function authenticateBiometric(): Promise<{ ok: boolean; error?: string }> {
  try {
    const credentialId = localStorage.getItem(PASSKEY_CREDENTIAL_KEY);
    if (!credentialId) {
      return { ok: false, error: "No biometric registered" };
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const rawId = Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: rawId,
            type: "public-key",
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60_000,
      },
    }) as PublicKeyCredential | null;

    if (!assertion) {
      return { ok: false, error: "Biometric authentication cancelled" };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Authentication failed: ${err}` };
  }
}

// ── Remove biometric credential ──

export function removeBiometric(): void {
  localStorage.removeItem(PASSKEY_CREDENTIAL_KEY);
  setBiometricsEnabled(false);
}
