"use client";

import { useState, useEffect } from "react";
import { ReminderCenter } from "./ReminderCenter";
import { Sidebar } from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { storage } from "@/lib/storage";

function isLandingDomain() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.includes("lexis-suite") || host.includes("lexis-landing") || host === "lexisapp.xyz" || host === "www.lexisapp.xyz";
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const landing = isLandingDomain();

  useEffect(() => {
    if (isLandingDomain()) return;
    storage.init()
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);

  if (landing) return <>{children}</>;

  if (!ready) {
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
    <div className="flex min-h-screen">
      <Sidebar />
      <ReminderCenter />
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
    </div>
  );
}
