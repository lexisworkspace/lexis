"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, Plus, Smartphone } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * Detects if the user is on iOS Safari (not already in standalone/PWA mode)
 * and shows a step-by-step "Add to Home Screen" guide.
 */
function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua);
  return isIOS && isSafari && !isStandalone;
}

/** Detect Chrome on Android (not already PWA) */
function isAndroidChrome(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isAndroid = /Android/.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  return isAndroid && !isStandalone;
}

const DISMISS_KEY = "orleia-pwa-prompt-dismissed";

export function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) return;

    // Wait 3 seconds before showing — don't interrupt onboarding
    const timer = setTimeout(() => {
      if (isIOSSafari()) {
        setPlatform("ios");
        setShow(true);
      } else if (isAndroidChrome()) {
        setPlatform("android");
        setShow(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "true");
  };

  if (!show || !platform) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm md:items-center"
        onClick={dismiss}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
        >
          {/* Header */}
          <div className="mb-5 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold">{t("pwa.install_orleia")}</h3>
                <p className="text-xs text-muted-foreground">{t("pwa.add_to_your_home_screen")}</p>
              </div>
            </div>
            <button onClick={dismiss} className="rounded-lg p-1 text-muted-foreground hover:bg-accent">
              <X className="h-4 w-4" />
            </button>
          </div>

          {platform === "ios" ? (
            <div className="space-y-3">
              {/* Step 1 */}
              <div className={`flex gap-3 rounded-xl p-3 transition-colors ${step >= 0 ? "bg-accent" : "opacity-40"}`}>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium">{t("pwa.tap_the_share_button")}</p>
                  <p className="text-xs text-muted-foreground">{t("pwa.the_square_icon_with_an_arrow_in_the_bot")}</p>
                </div>
                <Share className="ml-auto h-5 w-5 shrink-0 text-muted-foreground" />
              </div>

              {/* Step 2 */}
              <div className={`flex gap-3 rounded-xl p-3 transition-colors ${step >= 1 ? "bg-accent" : "opacity-40"}`}>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium">Tap &ldquo;Add to Home Screen&rdquo;</p>
                  <p className="text-xs text-muted-foreground">{t("pwa.scroll_down_in_the_share_menu")}</p>
                </div>
                <Plus className="ml-auto h-5 w-5 shrink-0 text-muted-foreground" />
              </div>

              {/* Step 3 */}
              <div className={`flex gap-3 rounded-xl p-3 transition-colors ${step >= 2 ? "bg-accent" : "opacity-40"}`}>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium">Tap &ldquo;Add&rdquo;</p>
                  <p className="text-xs text-muted-foreground">{t("pwa.orleia_will_appear_on_your_home_screen")}</p>
                </div>
              </div>

              {/* Tap to advance */}
              <button
                onClick={() => {
                  if (step < 2) setStep(step + 1);
                  else dismiss();
                }}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
              >
                {step < 2 ? "Got it, next step" : "Done!"}
              </button>
            </div>
          ) : (
            /* Android instructions */
            <div className="space-y-3">
              <div className="flex gap-3 rounded-xl bg-accent p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium">Tap the ⋮ menu button</p>
                  <p className="text-xs text-muted-foreground">{t("pwa.top_right_corner_of_chrome")}</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-xl bg-accent p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium">Tap &ldquo;Install app&rdquo; or &ldquo;Add to Home screen&rdquo;</p>
                  <p className="text-xs text-muted-foreground">{t("pwa.you_may_need_to_scroll_down")}</p>
                </div>
                <Plus className="ml-auto h-5 w-5 shrink-0 text-muted-foreground" />
              </div>
              <button
                onClick={dismiss}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
              >{t("pwa.got_it")}</button>
            </div>
          )}

          <button
            onClick={dismiss}
            className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Don&apos;t show again
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
