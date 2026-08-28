"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WidgetId, WidgetDef } from "@/types";

export const WIDGET_CATALOG: WidgetDef[] = [
  { id: "productivity", name: "Productivity Score", description: "Your daily score with a progress ring", icon: "◎", default: true },
  { id: "stats", name: "Quick Stats", description: "Habits, tasks, journal streaks at a glance", icon: "▦", default: true },
  { id: "tasks", name: "Today's Tasks", description: "Your task list for today", icon: "☑", default: true },
  { id: "habits", name: "Today's Habits", description: "Quick-log your daily habits", icon: "✓", default: true },
  { id: "notes", name: "Recent Notes", description: "Latest documents and memos", icon: "◇", default: true },
  { id: "streak", name: "Weekly Activity", description: "A 7-day heatmap of your activity", icon: "▣", default: false },
  { id: "quote", name: "Daily Quote", description: "A motivational quote that changes daily", icon: "❝", default: false },
  { id: "quick-note", name: "Quick Note", description: "Capture a thought without leaving the dashboard", icon: "✎", default: false },
  { id: "pomodoro", name: "Focus Timer", description: "25-minute focus session with breaks", icon: "◷", default: false },
  { id: "mood", name: "Mood Check-in", description: "Log how you're feeling right now", icon: "☺", default: false },
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
  const [search, setSearch] = useState("");

  const filtered = WIDGET_CATALOG.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.description.toLowerCase().includes(search.toLowerCase())
  );

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483646,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      className="bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "28rem", width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
        className="rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold">Widget Catalog</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {active.length} active · Tap to add or remove
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search widgets..."
            className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary-500/40"
            autoFocus
          />
        </div>

        {/* Widget list */}
        <div className="px-6 py-4 flex-1 overflow-y-auto space-y-2" style={{ minHeight: 0 }}>
          {filtered.map((w) => {
            const isActive = active.includes(w.id);
            return (
              <button
                key={w.id}
                onClick={() => onToggle(w.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                  isActive
                    ? "border-primary-500/30 bg-primary-500/5"
                    : "border-border bg-secondary/20 hover:border-muted-foreground/30"
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg">
                  {w.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{w.name}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {w.description}
                  </span>
                </span>
                {isActive ? (
                  <Check className="h-4 w-4 shrink-0 text-primary-500" />
                ) : (
                  <Plus className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
