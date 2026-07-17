"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Onboarding } from "./Onboarding";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { motion, AnimatePresence } from "framer-motion";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    try {
      const data = localStorage.getItem("lexis-data");
      if (data) {
        const parsed = JSON.parse(data);
        if (!parsed.onboardingCompleted) {
          setShowOnboarding(true);
        }
      } else {
        setShowOnboarding(true);
      }
    } catch {
      setShowOnboarding(true);
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <>
      <KeyboardShortcuts />
      <AnimatePresence mode="wait">
        {showOnboarding ? (
          <Onboarding onComplete={() => setShowOnboarding(false)} />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex min-h-screen"
          >
            <Sidebar />
            <main className="flex-1 md:pl-[260px]">
              <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
