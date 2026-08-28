"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Sun,
  Moon,
  Cloud,
} from "lucide-react";
import { storage } from "@/lib/storage";
import { cn, formatDate, getToday } from "@/lib/utils";
import { WIDGET_COMPONENTS } from "@/components/widgets/Widgets";
import { WidgetCatalog } from "@/components/widgets/WidgetCatalog";
import type { WidgetId } from "@/types";
import Link from "next/link";

const LandingPage = lazy(() => import("./landing/page"));

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
  const isLanding = useIsLandingDomain();
  if (isLanding) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <LandingPage />
      </Suspense>
    );
  }

  const [data, setData] = useState(storage.getData());
  const [greeting, setGreeting] = useState("Good morning");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [widgets, setWidgets] = useState<WidgetId[]>(
    () => (storage.getData().dashboardWidgets as WidgetId[]) || ["stats", "tasks", "habits", "notes"]
  );

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setData({ ...storage.getData() });
      setWidgets((storage.getData().dashboardWidgets as WidgetId[]) || ["stats", "tasks", "habits", "notes"]);
    });
    return unsub;
  }, []);

  const toggleWidget = (id: WidgetId) => {
    setWidgets((prev) => {
      const next = prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id];
      const d = storage.getData();
      d.dashboardWidgets = next;
      storage.saveData();
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">{greeting}!</h1>
            <p className="text-sm text-muted-foreground">
              {formatDate(new Date(), "EEEE, MMMM d")}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/10">
            {new Date().getHours() < 12 ? (
              <Sun className="h-6 w-6 text-primary-500" />
            ) : new Date().getHours() < 17 ? (
              <Cloud className="h-6 w-6 text-primary-500" />
            ) : (
              <Moon className="h-6 w-6 text-primary-500" />
            )}
          </div>
        </div>
      </motion.div>

      {/* Dynamic Widget Layout */}
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

      {/* Empty state */}
      {widgets.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-muted-foreground text-sm">No widgets active. Tap + to add some.</p>
        </div>
      )}

      {/* Widget Catalog Modal */}
      {catalogOpen && (
        <WidgetCatalog
          active={widgets}
          onToggle={toggleWidget}
          onClose={() => setCatalogOpen(false)}
        />
      )}

      {/* FAB: add widget */}
      <button
        onClick={() => setCatalogOpen(true)}
        style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 2147483647 }}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Add widget"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}
