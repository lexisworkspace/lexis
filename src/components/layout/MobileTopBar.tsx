"use client";

// ============================================================
// MobileTopBar — the floating mobile buttons (MATTE style).
// Hamburger pinned top-left on BOTH screens; search pill center;
// reminders + settings top-right on BOTH screens (they sit above
// the nav-screen overlay, mirroring the top bar exactly as they
// appear on the main screen).
// Pure event dispatchers / navigation.
// Safe-area aware: buttons sit below the notch / Dynamic Island.
// ============================================================

import { Menu, Bell, Settings, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";

export function MobileTopBar({
  onToggleSidebar,
  navOpen,
}: {
  onToggleSidebar: () => void;
  navOpen: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [reminderCount, setReminderCount] = useState(0);

  useEffect(() => {
    const onCount = (e: Event) => setReminderCount((e as CustomEvent<number>).detail || 0);
    window.addEventListener("orleia:reminders-count", onCount);
    return () => window.removeEventListener("orleia:reminders-count", onCount);
  }, []);

  return (
    <>
      {/* Hamburger — pinned above BOTH screens (z-70 > nav screen z-60) */}
      <button
        onClick={() => { haptic.tap(); onToggleSidebar(); }}
        className="orleia-glass-btn fixed top-[calc(0.75rem+env(safe-area-inset-top,0px))] left-4 z-[70] md:hidden"
        aria-label={navOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={navOpen}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search — long pill spanning the middle between hamburger and settings */}
      <button
        onClick={() => { haptic.tap(); window.dispatchEvent(new CustomEvent("orleia:open-search")); }}
        className="fixed top-[calc(0.75rem+env(safe-area-inset-top,0px))] left-16 right-[7rem] z-[70] flex h-10 items-center gap-2 rounded-full border border-border bg-secondary px-4 text-left transition-colors hover:bg-secondary md:hidden"
        aria-label={t("search.title")}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm text-muted-foreground">{t("search.title")}</span>
      </button>

      {/* Settings — pinned above BOTH screens, same spot as on the main screen */}
      <button
        onClick={() => { haptic.tap(); router.push("/settings"); }}
        className="orleia-glass-btn fixed top-[calc(0.75rem+env(safe-area-inset-top,0px))] right-16 z-[70] md:hidden"
        aria-label="Settings"
      >
        <Settings className="h-5 w-5" />
      </button>

      {/* Reminders bell — pinned above BOTH screens, same spot as on the main screen */}
      <button
        onClick={() => { haptic.tap(); window.dispatchEvent(new CustomEvent("orleia:toggle-reminders")); }}
        className="orleia-glass-btn fixed top-[calc(0.75rem+env(safe-area-inset-top,0px))] right-4 z-[70] md:hidden"
        aria-label="Reminders"
      >
        <Bell className="h-5 w-5" />
        {reminderCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {reminderCount > 9 ? "9+" : reminderCount}
          </span>
        )}
      </button>
    </>
  );
}
