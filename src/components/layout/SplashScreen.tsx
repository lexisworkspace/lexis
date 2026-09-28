"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SPLASH_KEY = "orleia-splash-seen";

/** Returns true if this is a fresh page load (not in-app navigation) */
export function isFreshLoad(): boolean {
  if (typeof window === "undefined") return false;
  return !sessionStorage.getItem(SPLASH_KEY);
}

/** Mark that splash was shown this session */
export function markSplashSeen() {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SPLASH_KEY, "1");
  }
}

/**
 * Handoff point for the pre-hydration BootSplash (server-rendered, visible
 * from first paint). Dispatched from SplashScreen on mount — and from
 * ClientLayout on session reloads where the React splash doesn't mount.
 */
export const SPLASH_READY_EVENT = "orleia:splash-ready";

interface SplashScreenProps {
  onComplete: () => void;
  /**
   * True once the app behind the splash is ready to show. The splash holds
   * for a 1s minimum, then dismisses as soon as `ready` flips — it covers
   * loading instead of stacking on top of it.
   */
  ready?: boolean;
}

export function SplashScreen({ onComplete, ready = true }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [minDone, setMinDone] = useState(false);

  // BootSplash (pre-hydration HTML) removes itself the moment we mount —
  // same wordmark, same background: the swap is invisible.
  useEffect(() => {
    window.dispatchEvent(new Event(SPLASH_READY_EVENT));
  }, []);

  // Minimum brand beat: 1s, then the splash gets out of the way.
  useEffect(() => {
    const timer = setTimeout(() => setMinDone(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Dismiss only when BOTH the minimum has elapsed and the app is ready.
  // On fast loads that's ~1s total; on slow ones the wordmark simply holds
  // until there is something real to reveal behind it.
  useEffect(() => {
    if (!minDone || !ready) return;
    setVisible(false);
    const t = setTimeout(onComplete, 350); // let the fade finish
    return () => clearTimeout(t);
  }, [minDone, ready, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <motion.img
            src="/orleia-wordmark.png"
            alt="Orleia"
            className="h-12 w-auto sm:h-14 md:h-16 dark:invert"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
