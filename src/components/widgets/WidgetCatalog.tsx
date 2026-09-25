"use client";

// ============================================================
// WidgetCatalog — iOS home-screen style widget editor.
//
// Mobile: bottom sheet that slides up like the iOS home-screen
// widget gallery. Drag-to-dismiss works ONLY from the grabber/header
// zone — the preview grid scrolls freely underneath. The dashboard
// stays visible and dimmed ABOVE the sheet; tap it to leave.
// Desktop/tablet: centered modal with a soft pop.
//
// Preview cards (no borders, name floats centered underneath):
//   wide  -> full-width, nearly 1:1
//   large -> full-width, ~2 rows tall (multi-square widgets)
// ============================================================

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Plus, Minus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { WIDGET_COMPONENTS } from "@/components/widgets/Widgets";
import type { WidgetId, WidgetDef } from "@/types";

export const WIDGET_CATALOG: WidgetDef[] = [
  { id: "productivity", name: "Productivity Score", description: "Your daily score with a progress ring", icon: "◎", default: true, size: "wide" },
  { id: "stats", name: "Quick Stats", description: "Habits, tasks, journal streaks at a glance", icon: "▦", default: true, size: "large" },
  { id: "tasks", name: "Today's Tasks", description: "Your task list for today", icon: "☑", default: true, size: "wide" },
  { id: "habits", name: "Today's Habits", description: "Quick-log your daily habits", icon: "✓", default: true, size: "wide" },
  { id: "notes", name: "Recent Notes", description: "Latest documents and memos", icon: "◇", default: true, size: "wide" },
  { id: "streak", name: "Weekly Activity", description: "A 7-day heatmap of your activity", icon: "▣", default: false, size: "wide" },
  { id: "quote", name: "Daily Quote", description: "A motivational quote that changes daily", icon: "❝", default: false, size: "wide" },
  { id: "quick-note", name: "Quick Note", description: "Capture a thought without leaving the dashboard", icon: "✎", default: false, size: "wide" },
  { id: "wrapped", name: "Weekly Wrapped", description: "Your week at a glance - screenshot and share", icon: "✨", default: true, size: "large" },
  { id: "pomodoro", name: "Focus Timer", description: "25-minute focus session with breaks", icon: "◷", default: false, size: "wide" },
  { id: "mood", name: "Mood Check-in", description: "Log how you're feeling right now", icon: "☺", default: false, size: "wide" },
  { id: "pet", name: "Your Pet", description: "Your companion greets you and tracks its meals", icon: "❤", default: true, size: "wide" },
];

export function WidgetCatalog({
  active,
  onToggle,
  onClose,
}: {
  active: WidgetId[];
  onToggle: (id: WidgetId) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [exiting, setExiting] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);

  /* Slide-down exit: plays the animation once, then unmounts. */
  const dismiss = useCallback(() => {
    setExiting((x) => {
      if (x) return x;
      window.setTimeout(onClose, 290);
      return true;
    });
  }, [onClose]);

  const filtered = WIDGET_CATALOG.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.description.toLowerCase().includes(search.toLowerCase())
  );

  /* Drag-to-dismiss: bound to the grabber/header zone ONLY. The preview
     grid below scrolls independently — touching it can never move or
     dismiss the sheet. */
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragStart.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStart.current == null || !sheetRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - dragStart.current);
    sheetRef.current.style.transition = "none";
    sheetRef.current.style.transform = `translateY(${dy}px)`;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (dragStart.current == null || !sheetRef.current) return;
    const dy = e.changedTouches[0].clientY - dragStart.current;
    dragStart.current = null;
    const el = sheetRef.current;
    if (dy > 80) {
      el.style.transition = "transform .28s cubic-bezier(.32,.72,0,1)";
      el.style.transform = "translateY(110%)";
      window.setTimeout(onClose, 260);
    } else {
      el.style.transition = "transform .34s cubic-bezier(.32,.72,0,1)";
      el.style.transform = "translateY(0)";
    }
  }, [onClose]);

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483646,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      className={cn(
        "bg-black/40 backdrop-blur-[2px] lg:items-center lg:bg-black/50 lg:backdrop-blur-sm",
        exiting ? "orleia-backdrop-out" : "orleia-sheet-backdrop"
      )}
      onClick={dismiss}
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%" }}
        className={cn(
          "flex max-h-[86dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl md:max-w-[36rem] lg:max-w-3xl lg:max-h-[85vh] lg:rounded-3xl",
          exiting ? "orleia-sheet-out" : "orleia-sheet"
        )}
      >
        {/* Grabber + header = the drag zone. Swipe down here to leave. */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="shrink-0 touch-none lg:touch-auto"
        >
          <div className="pt-2.5 lg:hidden">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-foreground/25" />
          </div>
          <div className="flex items-center justify-between px-5 py-3.5 lg:px-6 lg:py-4 lg:border-b lg:border-border">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">{t("widgetcatalog.title")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {active.length} {t("widgetcatalog.active")}
              </p>
            </div>
            <button
              onClick={dismiss}
              className="shrink-0 rounded-full px-2 py-1 text-sm font-semibold text-primary-500 transition-opacity hover:opacity-70"
            >
              {t("widgetcatalog.done")}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 pt-1 shrink-0 lg:px-6 lg:pt-0">
          <div className="flex items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("widgetcatalog.search")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        {/* Full-width preview cards. Nearly 1:1; Quick Stats is the
            large (2-row) card. Borderless — the name floats centered
            underneath in small font. */}
        <div
          className="flex-1 overflow-y-auto px-5 pt-4"
          style={{
            minHeight: 0,
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="flex flex-col gap-4">
            {filtered.map((w) => {
              const isActive = active.includes(w.id);
              const Preview = WIDGET_COMPONENTS[w.id];
              const large = (w.size ?? "wide") === "large";
              return (
                <div key={w.id} className="flex flex-col">
<div
                    role="button"
                    tabIndex={0}
                    onClick={() => { haptic.tap(); onToggle(w.id); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(w.id); } }}
                    className={cn(
                      "relative w-full overflow-hidden rounded-3xl outline-none transition-all focus-visible:ring-2 focus-visible:ring-primary-500/40 active:scale-[0.98]",
                      large ? "min-h-[16rem] max-h-[26rem]" : "min-h-28 max-h-64",
                      isActive ? "bg-primary-500/5" : "bg-secondary/25 hover:bg-secondary/35"
                    )}
                    aria-pressed={isActive}
                  >
                    {/* Live preview — the real widget at natural phone-dashboard
                        scale. The card HUGS its content (no fixed aspect, no
                        grey filler); anything past the clamp fades out. */}
                    <div aria-hidden className="pointer-events-none relative w-full p-2">
                      {Preview ? <Preview /> : (
                        <div className="flex h-20 items-center justify-center text-2xl">{w.icon}</div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card/90 to-transparent" />
                    </div>
                    {/* iOS ⊕ / ⊖ toggle badge */}
                    {isActive ? (
                      <span aria-hidden className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-red-500/90 text-white shadow">
                        <Minus className="h-4 w-4" />
                      </span>
                    ) : (
                      <span aria-hidden className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-foreground/25 bg-background/80 text-foreground/60 shadow">
                        <Plus className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  {/* Name — floating, centered, small */}
                  <span className="mt-1.5 text-center text-xs font-medium text-muted-foreground">
                    {w.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
