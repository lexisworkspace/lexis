const fs = require('fs');
const content = `"use client";

import { useState, useEffect, lazy, Suspense, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Sun, Moon, Cloud } from "lucide-react";
import { storage } from "@/lib/storage";
import { setTaskbarProgress, isDesktop } from "@/lib/desktop-bridge";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { ensureWired, rebuildGraph, enrichConcepts } from "@/lib/graph/engine";
import { WIDGET_COMPONENTS } from "@/components/widgets/Widgets";
import { WidgetCatalog } from "@/components/widgets/WidgetCatalog";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import type { WidgetId } from "@/types";

const LandingPage = lazy(() => import("./landing/page"));

const DASH_SIDEBAR_KEY = "lexis-dash-sidebar-collapsed";

function useIsLandingDomain() {
  const [isLanding, setIsLanding] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      setIsLanding(host.includes("lexis-suite") || host.includes("lexis-landing"));
    }
  }, []);
  return isLanding;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const isLanding = useIsLandingDomain();
  const [data, setData] = useState(storage.getData());
  const [dashSidebarCollapsed, setDashSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DASH_SIDEBAR_KEY) === "1";
  });

  const toggleDashSidebar = () => {
    setDashSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(DASH_SIDEBAR_KEY, next ? "1" : "0");
      return next;
    });
  };

  useEffect(() => {
    if (!isDesktop()) return;
    const today = new Date().toISOString().slice(0, 10);
    const todayHabits = (data.habits || []).filter((h: any) => !h.archived);
    const completed = todayHabits.filter((h) => {
      const log = (data.habitLogs || []).find((l: any) => l.habitId === h.id && l.date === today);
      return (log?.count || 0) > 0;
    }).length;
    const total = todayHabits.length;
    if (total > 0) {
      setTaskbarProgress(completed / total);
    } else {
      setTaskbarProgress(null);
    }
  }, [data.habits, data.habitLogs]);

  const [greeting, setGreeting] = useState("Good morning");
  const [brainTick, setBrainTick] = useState(0);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [widgets, setWidgets] = useState<WidgetId[]>(
    () => (storage.getData().dashboardWidgets as WidgetId[]) || ["productivity", "stats", "tasks", "habits", "notes"]
  );
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => {
    if (catalogOpen) {
      document.documentElement.classList.add("widget-catalog-open");
    } else {
      document.documentElement.classList.remove("widget-catalog-open");
    }
    return () => document.documentElement.classList.remove("widget-catalog-open");
  }, [catalogOpen]);

  useEffect(() => {
    if (isLanding) return;
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t("dash.greetingMorning"));
    else if (hour < 17) setGreeting(t("dash.greetingAfternoon"));
    else setGreeting(t("dash.greetingEvening"));
  }, [isLanding]);

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setData({ ...storage.getData() });
      setWidgets((storage.getData().dashboardWidgets as WidgetId[]) || ["productivity", "stats", "tasks", "habits", "notes"]);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (isLanding) return;
    ensureWired();
    rebuildGraph(true);
    const timer = setTimeout(() => {
      enrichConcepts().then((added) => {
        if (added > 0) setBrainTick((x) => x + 1);
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, [isLanding]);

  if (isLanding) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <LandingPage />
      </Suspense>
    );
  }

  const toggleWidget = (id: WidgetId) => {
    setWidgets((prev) => {
      const next = prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id];
      const d = storage.getData();
      d.dashboardWidgets = next;
      storage.saveData();
      return next;
    });
  };

  const startLongPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "BUTTON" || tag === "A" || tag === "INPUT" || tag === "TEXTAREA") return;
    if ("touches" in e) {
      document.body.style.userSelect = "none";
      (document.body as HTMLElement).style.webkitUserSelect = "none";
    }
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setCatalogOpen(true);
    }, 1000);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    document.body.style.userSelect = "";
    (document.body as HTMLElement).style.webkitUserSelect = "";
  }, []);

  return (
    <div className="flex h-[calc(100vh-2rem)] -my-6 -mx-4 md:-mx-8">
      <DashboardSidebar collapsed={dashSidebarCollapsed} onToggle={toggleDashSidebar} />

      <div
        className="flex-1 overflow-y-auto"
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchCancel={cancelLongPress}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="space-y-6 px-4 py-6 md:px-8 md:py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">{greeting}!</h1>
                <p className="text-sm text-muted-foreground">{formatDate(new Date(), "EEEE, MMMM d")}</p>
              </div>
              <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary border border-border/60">
                {new Date().getHours() < 12 ? (
                  <Sun className="h-6 w-6 text-muted-foreground" />
                ) : new Date().getHours() < 17 ? (
                  <Cloud className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <Moon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
            </div>
          </motion.div>

          {widgets.map((id, index) => {
            const Widget = WIDGET_COMPONENTS[id];
            if (!Widget) return null;
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.04 }}
              >
                <Widget />
              </motion.div>
            );
          })}

          {widgets.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-muted-foreground text-sm">No widgets active. Tap + to add some.</p>
            </div>
          )}

          {catalogOpen && (
            <WidgetCatalog
              active={widgets}
              onToggle={toggleWidget}
              onClose={() => setCatalogOpen(false)}
            />
          )}

          <button
            onClick={() => setCatalogOpen(true)}
            style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 2147483647 }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105 active:scale-95"
            aria-label="Add widget"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
`;
fs.writeFileSync('src/app/page.tsx', content);
console.l
