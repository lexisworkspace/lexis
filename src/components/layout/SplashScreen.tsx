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

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // After the roll animation finishes (~1s for "ORLEIA"), hold briefly, then fade
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 600);
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
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
