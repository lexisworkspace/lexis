"use client";

// ============================================================
// NoorToast — in-app "Noor replied" card.
// Fires whenever a background Noor reply lands (ask-from-search,
// or a Noor send that finished after navigating away). Works
// with ZERO permissions, unlike system notifications. Tap to
// deep-link into the conversation.
//
// Visibility-aware: if the tab/app is hidden when the reply
// lands, the toast WAITS (no countdown) and gives you its full
// lifetime the moment you come back — so switching desktop tabs
// never makes you miss it.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

const LIFETIME_MS = 12_000;

export function NoorToast() {
  const router = useRouter();
  const [toast, setToast] = useState<{ preview: string; convId?: string } | null>(null);
  const toastRef = useRef<{ preview: string; convId?: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    };
    const startTimer = () => {
      clearTimer();
      if (!document.hidden) {
        timerRef.current = setTimeout(() => {
          setToast(null);
          toastRef.current = null;
        }, LIFETIME_MS);
      }
    };

    const onReply = (ev: Event) => {
      const d = (ev as CustomEvent<{ preview: string; convId?: string }>).detail;
      if (!d?.preview) return;
      toastRef.current = d;
      setToast(d);
      startTimer();
    };

    const onVisibility = () => {
      if (document.hidden) {
        clearTimer(); // hold the toast while the user is away
      } else if (toastRef.current) {
        startTimer(); // fresh lifetime when they return
      }
    };

    window.addEventListener("orleia:noor-toast", onReply);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("orleia:noor-toast", onReply);
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimer();
    };
  }, []);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-[110] mx-auto flex max-w-sm items-start gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-2xl md:right-6 md:left-auto md:mx-0"
          role="status"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
            <Sparkles className="h-4 w-4 text-primary-500" />
          </span>
          <button
            className="min-w-0 flex-1 text-left"
            onClick={() => {
              const c = toast.convId;
              setToast(null);
              toastRef.current = null;
              router.push(c ? `/noor?c=${c}` : "/noor");
            }}
          >
            <span className="block text-xs font-semibold text-foreground">Noor replied</span>
            <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-muted-foreground">
              {toast.preview}
            </span>
          </button>
          <button
            onClick={() => {
              setToast(null);
              toastRef.current = null;
            }}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg p-1 text-muted-foreground/60 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
