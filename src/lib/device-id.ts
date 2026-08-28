"use client";

// Lexis device identity — each device gets a persistent UUID.
// Used for pairing consent and device listing in the ecosystem.
// Stored in localStorage, never leaves the device.

const DEVICE_ID_KEY = "lexis-device-id";
const DEVICE_NAME_KEY = "lexis-device-name";
const DEVICE_NAME_VERSION_KEY = "lexis-device-name-v";
const CURRENT_DEVICE_NAME_VERSION = 2; // bump to force re-detection

export function getDeviceId(): string {
  if (typeof window === "undefined") return "unknown";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    // Generate a UUID v4
    id = crypto.randomUUID?.() ?? 
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getDeviceName(): string {
  if (typeof window === "undefined") return "Unknown Device";

  // Check if we need to re-detect (cache version changed)
  const cachedVersion = parseInt(localStorage.getItem(DEVICE_NAME_VERSION_KEY) || "0", 10);
  let name = localStorage.getItem(DEVICE_NAME_KEY);
  if (name && cachedVersion >= CURRENT_DEVICE_NAME_VERSION) {
    return name;
  }

  // Re-detect device name
  const ua = navigator.userAgent;
  const platform = navigator.platform || "";
  const maxTouch = navigator.maxTouchPoints || 0;

  // Order matters: iPhone must be checked before iPad (both contain "iPhone" on some versions)
  // iPadOS 13+ reports as MacIntel with touch — check that BEFORE the Mac fallback
  if (/iPhone/.test(ua)) {
    name = "iPhone";
  } else if (/iPad/.test(ua) || (platform === "MacIntel" && maxTouch > 1)) {
    name = "iPad";
  } else if (/iPod/.test(ua)) {
    name = "iPod";
  } else if (/Android/.test(ua)) {
    name = /Mobile/.test(ua) ? "Android Phone" : "Android Tablet";
  } else if (/Win/.test(ua)) {
    name = "Windows PC";
  } else if (/Mac/.test(ua)) {
    name = "Mac";
  } else if (/Linux/.test(ua)) {
    name = "Linux PC";
  } else {
    name = "Web Browser";
  }

  localStorage.setItem(DEVICE_NAME_KEY, name);
  localStorage.setItem(DEVICE_NAME_VERSION_KEY, String(CURRENT_DEVICE_NAME_VERSION));
  return name;
}

export function setDeviceName(name: string): void {
  localStorage.setItem(DEVICE_NAME_KEY, name);
}

/** Info about this device for pairing requests. */
export interface DeviceInfo {
  id: string;
  name: string;
  joinedAt: number;
}

export function getDeviceInfo(): DeviceInfo {
  return {
    id: getDeviceId(),
    name: getDeviceName(),
    joinedAt: Date.now(),
  };
}
