"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Check, Monitor, Smartphone, Tablet } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { storage } from "@/lib/storage";

export default function AuthSuccessPage() {
  const [status, setStatus] = useState<"processing" | "done">("processing");

  useEffect(() => {
    // Set auth flags
    localStorage.setItem("orleia-auth-done", "1");
    localStorage.removeItem("orleia-oauth-pending");
    localStorage.removeItem("orleia-onboarding-step");

    // Mark onboarding as done through storage (writes to BOTH localStorage AND IndexedDB)
    storage.init().then(() => {
      storage.completeOnboarding();
    });
    try {
      const raw = localStorage.getItem("orleia-data");
      const data = raw ? JSON.parse(raw) : {};
      data.onboardingCompleted = true;
      localStorage.setItem("orleia-data", JSON.stringify(data));
    } catch {
      localStorage.setItem("orleia-data", JSON.stringify({ onboardingCompleted: true }));
    }

    // Wait for Supabase session to settle, then show done
    const sb = getSupabase();
    const showDone = () => setStatus("done");

    if (sb) {
      sb.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          showDone();
          // Auto-redirect on web/mobile after a short delay
          if (!isElectron) {
            setTimeout(() => {
              window.location.replace("https://app.orleia.app");
            }, 2500);
          }
        } else {
          setTimeout(() => {
            showDone();
            if (!isElectron) {
              setTimeout(() => {
                window.location.replace("https://app.orleia.app");
              }, 2000);
            }
          }, 2000);
        }
      });
    } else {
      showDone();
      if (!isElectron) {
        setTimeout(() => {
          window.location.replace("https://app.orleia.app");
        }, 2500);
      }
    }
  }, []);

  const isElectron = typeof window !== "undefined" && !!window.orleiaDesktop;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm text-center space-y-6"
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
          className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center"
        >
          {status === "done" ? (
            <Check className="h-8 w-8 text-green-500" />
          ) : (
            <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
          )}
        </motion.div>

        {/* Title */}
        <div className="space-y-2">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-instrument), system-ui, sans-serif" }}
          >
            You're all set!
          </h1>
          <p className="text-muted-foreground text-sm">
            Signed in successfully.
          </p>
        </div>

        {/* Desktop: return to app instruction */}
        {status === "done" && isElectron && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-2"
          >
            <p className="text-sm font-medium">Return to Orleia Desktop</p>
            <p className="text-xs text-muted-foreground">
              Close this tab and go back to the Orleia app on your desktop. Your session is ready.
            </p>
          </motion.div>
        )}

        {/* Web/mobile: auto-redirect back to workspace */}
        {status === "done" && !isElectron && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Returning to Orleia...
            </div>
          </motion.div>
        )}

        {/* Device compatibility badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-4 text-xs text-muted-foreground/50 pt-2"
        >
          <span className="flex items-center gap-1"><Monitor className="h-3 w-3" /> Desktop</span>
          <span className="flex items-center gap-1"><Tablet className="h-3 w-3" /> Tablet</span>
          <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> Mobile</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
