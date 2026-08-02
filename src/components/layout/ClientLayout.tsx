"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Onboarding } from "./Onboarding";
import { PasswordGate, isPasswordSet } from "./PasswordGate";
import { TutorialGuide } from "./TutorialGuide";
import { motion, AnimatePresence } from "framer-motion";
import { storage } from "@/lib/storage";

type AppState = "loading" | "onboarding" | "tutorial" | "password-setup" | "password-unlock" | "ready";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [appState, setAppState] = useState<AppState>("loading");

  useEffect(() => {
    storage.init().then(() => {
      try {
        const data = localStorage.getItem("lexis-data");
        if (!data) {
          // Fresh user — no data at all
          setAppState("onboarding");
          return;
        }

        const parsed = JSON.parse(data);
        if (!parsed.onboardingCompleted) {
          // Onboarding not done yet
          setAppState("onboarding");
          return;
        }

        // Onboarding done — check if password is set
        if (isPasswordSet()) {
          setAppState("password-unlock");
        } else {
          // No password set — prompt to set one (with skip option)
          setAppState("password-setup");
        }
      } catch {
        // Corrupted data — start fresh
        setAppState("onboarding");
      }
    });
  }, []);

  // Handle onboarding completion → always go to password setup
  const handleOnboardingComplete = () => {
    setAppState("password-setup");
  };

  // Handle password setup completion (set or skipped) → show tutorial if pending, else ready
  const handlePasswordSetupComplete = () => {
    const tutorialPending = localStorage.getItem("lexis-tutorial-pending") === "true";
    if (tutorialPending) {
      setAppState("tutorial");
    } else {
      setAppState("ready");
    }
  };

  // Handle tutorial completion → enter app
  const handleTutorialComplete = () => {
    localStorage.removeItem("lexis-tutorial-pending");
    setAppState("ready");
  };

  // Handle password unlock → enter app
  const handlePasswordUnlock = () => {
    setAppState("ready");
  };

  // Loading state
  if (appState === "loading") {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-muted animate-pulse" />
          <div className="h-2 w-16 rounded bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <>      <AnimatePresence mode="wait">
        {appState === "onboarding" && (
          <Onboarding key="onboarding" onComplete={handleOnboardingComplete} />
        )}

        {appState === "tutorial" && (
          <TutorialGuide key="tutorial" onComplete={handleTutorialComplete} />
        )}

        {appState === "password-setup" && (
          <PasswordGate
            key="password-setup"
            mode="setup"
            onUnlock={handlePasswordSetupComplete}
            showSkip
          />
        )}

        {appState === "password-unlock" && (
          <PasswordGate
            key="password-unlock"
            mode="unlock"
            onUnlock={handlePasswordUnlock}
          />
        )}

        {appState === "ready" && (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex min-h-screen"
          >
            <Sidebar />
            <main id="main-content" className="flex-1 md:pl-[260px]" tabIndex={-1}>
              <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={typeof window !== "undefined" ? window.location.pathname : ""}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
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
