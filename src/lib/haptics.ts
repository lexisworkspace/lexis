// ============================================================
// Haptics — tiny wrapper around the Vibration API (Android/Chromium).
// iOS Safari/PWA has no web vibration API, so calls no-op there;
// the app still gets its native feel from safe-area + status-bar work.
// Patterns are tuned to feel like UIImpactFeedbackGenerator taps.
// ============================================================

export const haptic = {
  /** Light tap — buttons, chips, toggles. */
  tap() {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(8);
      }
    } catch {
      /* ignore */
    }
  },
  /** Slightly firmer — successful actions, nav open/close. */
  tick() {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(12);
      }
    } catch {
      /* ignore */
    }
  },
  /** Double-pulse — destructive confirmations, section completes. */
  double() {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate([14, 40, 14]);
      }
    } catch {
      /* ignore */
    }
  },
};
