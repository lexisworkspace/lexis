"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { ReminderCenter } from "./ReminderCenter";
import { Sidebar } from "./Sidebar";
import { MobileTopBar } from "./MobileTopBar";
import { MobileNavScreen } from "./MobileNavScreen";
import { SplashScreen, isFreshLoad, markSplashSeen } from "./SplashScreen";
import { TutorialFlow } from "./TutorialFlow";
import { PetReactions } from "./PetReactions";
import { IntroFlow } from "./IntroFlow";
import { AgeGate } from "./AgeGate";
import { motion, MotionConfig } from "framer-motion";
import { storage } from "@/lib/storage";
import { haptic } from "@/lib/haptics";
import { useShortcuts } from "@/lib/useShortcuts";
import { GlobalSearch } from "./GlobalSearch";
import { ensureNoorBackground } from "@/lib/noor-background";
import { NoorToast } from "./NoorToast";
import { PlanIntro } from "./PlanIntro";
import { RoutePrefetcher } from "./RoutePrefetcher";
import { cn } from "@/lib/utils";

function isLandingDomain() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  /* The landing is any non-app host: orleia.app, www, orleia.app (legacy),
     and the preview deployments. app.* always gets the workspace. */
  return (
    host.includes("orleia-suite") ||
    host.includes("orleia-landing") ||
    host === "orleia.app" ||
    host === "www.orleia.app" ||
    host === "orleia.app" ||
    host === "orleia.app"
  );
}

const FULL_WIDTH_ROUTES = ["/noor", "/deck", "/calendar"];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [storageReady, setStorageReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [ageGateDone, setAgeGateDone] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [planIntroDone, setPlanIntroDone] = useState(true);
  const landing = isLandingDomain();
  const isFullWidth = FULL_WIDTH_ROUTES.some(r => pathname.startsWith(r));
  // Sidebar collapse state (from Sidebar's custom event) so the main
  // content recenters smoothly instead of hugging the collapsed rail.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    const onCollapse = (e: Event) => setSidebarCollapsed(Boolean((e as CustomEvent).detail));
    window.addEventListener("orleia:sidebar-collapsed", onCollapse);
    return () => window.removeEventListener("orleia:sidebar-collapsed", onCollapse);
  }, []);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [searchOpen, setSearchOpen] = useState(false);

  // Global keyboard shortcuts (Ctrl+K search, new note/task/habit, sidebar, settings)
  useShortcuts();

  useEffect(() => {
    ensureNoorBackground();
    const open = () => setSearchOpen(true);
    window.addEventListener("orleia:open-search", open);
    return () => window.removeEventListener("orleia:open-search", open);
  }, []);

  useEffect(() => {
    if (isLandingDomain()) return;
    setShowSplash(isFreshLoad());
    try {
      setPlanIntroDone(window.localStorage.getItem("orleia.planIntroSeen.v1") === "1");
    } catch {
      setPlanIntroDone(true);
    }
    storage.init()
      .then(() => { setStorageReady(true); setNeedsOnboarding(!storage.isOnboardingCompleted()); setAgeGateDone(storage.isAgeConfirmed()); })
      .catch(() => { setStorageReady(true); setNeedsOnboarding(true); setAgeGateDone(storage.isAgeConfirmed()); });
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<boolean | undefined>;
      if (typeof ev.detail === "boolean") setMobileNavOpen(ev.detail);
      else setMobileNavOpen(o => !o);
    };
    window.addEventListener("orleia:toggle-sidebar", handler);
    return () => window.removeEventListener("orleia:toggle-sidebar", handler);
  }, []);

  const toggleMobileNav = useCallback(() => {
    setMobileNavOpen(o => !o);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 2) {
      haptic.tick();
      window.dispatchEvent(new CustomEvent("orleia:toggle-sidebar", { detail: dx > 0 }));
    }
  }, []);

  const handleSplashComplete = useCallback(() => {
    markSplashSeen();
    setSplashDone(true);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setNeedsOnboarding(false);
    // "Pick your look" flow ends with the tutorial (if the flag was set).
    if (localStorage.getItem("orleia-tutorial-pending") === "true") {
      localStorage.removeItem("orleia-tutorial-pending");
      setShowTutorial(true);
      return;
    }
  }, []);

  /* Status-bar tint follows the APP theme (not just the OS): when the
     user toggles light/dark inside Orleia, the mobile OS bar follows. */
  useEffect(() => {
    const update = () => {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches &&
          !document.documentElement.classList.contains("light"));
      const color = isDark ? "#0a0a0a" : "#fafafa";
      document
        .querySelectorAll('meta[name="theme-color"]')
        .forEach((m) => m.setAttribute("content", color));
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener?.("change", update);
    return () => {
      observer.disconnect();
      mq.removeEventListener?.("change", update);
    };
  }, []);

  /* MotionConfig makes every Framer Motion animation across the app respect
     the reduced-motion accessibility toggle (they're JS-driven and bypass CSS). */
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const update = () =>
      setReducedMotion(
        document.documentElement.getAttribute("data-reduced-motion") === "true"
      );
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-reduced-motion"],
    });
    return () => observer.disconnect();
  }, []);

  if (landing) return <>{children}</>;

  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "never"}>
<>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <NoorToast />
      <PetReactions />
      <RoutePrefetcher />
      {showSplash && !splashDone && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}

      {storageReady && !ageGateDone && <AgeGate onConfirmed={() => setAgeGateDone(true)} />}

      {/* One-time full-screen plan intro — after onboarding/age gate, before
          the app renders. It covers everything; closing reveals the app. */}
      {storageReady && ageGateDone && !needsOnboarding && !planIntroDone && (
        <PlanIntroKeyed />
      )}

      {storageReady && needsOnboarding && ageGateDone && (
        <IntroFlow onComplete={handleOnboardingComplete} />
      )}

      {storageReady && showTutorial && (
        <TutorialFlow onComplete={() => setShowTutorial(false)} />
      )}

      {storageReady && !needsOnboarding && (!showSplash || splashDone) && (
        <>
          {/* Second screen: full-page nav, OUTSIDE the shell so nothing can overlap it */}
          <MobileNavScreen open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

          {/* Floating buttons: rendered outside the shell so the hamburger
              stays pinned in place on BOTH screens. */}
          <MobileTopBar onToggleSidebar={toggleMobileNav} navOpen={mobileNavOpen} />

          <div className={`orleia-app-shell flex min-h-screen ${isFullWidth ? "max-md:h-dvh max-md:min-h-0 max-md:overflow-hidden" : ""}`}>
            <Sidebar />
            <ReminderCenter />
            <main id="main-content" className={`flex-1 ${isFullWidth ? "" : "pt-[calc(4rem+env(safe-area-inset-top,0px))] md:pt-0"} md:transition-[padding] md:duration-300 md:ease-in-out ${sidebarCollapsed ? "md:pl-[72px]" : "md:pl-[260px]"}`} tabIndex={-1}
              onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              {/* Keyed remount with enter-only fade. Deliberately NO
                  AnimatePresence: with App Router children it is the source
                  of both stacked-page and black-screen hangs. React unmounts
                  the old page synchronously on key change — one page, always. */}
              <motion.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={isFullWidth ? "" : "mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8"}
              >
                {children}
              </motion.div>
            </main>
          </div>
        </>
      )}
    </>
    </MotionConfig>
  );
}
/** Remount-safe wrapper: PlanIntro's own X/Escape closes it and flips the
    localStorage flag; when that happens we re-read it so the app renders. */
function PlanIntroKeyed() {
  const [, force] = useState(0);
  useEffect(() => {
    const onStorage = () => force((n) => n + 1);
    // PlanIntro writes the flag before unmounting; re-check on any change.
    const iv = setInterval(() => {
      try {
        if (window.localStorage.getItem('orleia.planIntroSeen.v1') === '1') force((n) => n + 1);
      } catch { /* ignore */ }
    }, 500);
    return () => clearInterval(iv);
  }, []);
  try {
    if (window.localStorage.getItem('orleia.planIntroSeen.v1') === '1') return null;
  } catch { return null; }
  return <PlanIntro />;
}

