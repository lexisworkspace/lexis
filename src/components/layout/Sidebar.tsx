"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CheckCircle2,
  FileText,
  BookOpen,
  ListTodo,
  BarChart3,
  Bot,
  Settings,
  Sparkles,
  Menu,
  X,
  Coffee,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { storage } from "@/lib/storage";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, shortcut: "⌘1" },
  { href: "/habits", label: "Habits", icon: CheckCircle2, shortcut: "⌘2" },
  { href: "/notes", label: "Notes", icon: FileText, shortcut: "⌘3" },
  { href: "/journal", label: "Journal", icon: BookOpen, shortcut: "⌘4" },
  { href: "/tasks", label: "Tasks", icon: ListTodo, shortcut: "⌘5" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, shortcut: "⌘6" },
  { href: "/assistant", label: "Lexis AI", icon: Bot, shortcut: "⌘7" },
  { href: "/settings", label: "Settings", icon: Settings, shortcut: "⌘8" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const data = storage.getData();
  const suggestions = data.aiSuggestions.filter((s) => !s.read).length;
  const journalStreak = storage.getJournalStreak().current;

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100]
                   focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        Skip to main content
      </a>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg md:hidden active:scale-[0.95] transition-all duration-200"
        aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full flex-col border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "w-[72px]" : "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className={cn("flex items-center gap-3 border-b border-border px-4 py-4", collapsed && "justify-center px-2")}>
          <img
            src="/lexis-logo.png"
            alt="LEXIS"
            className="h-9 w-9 rounded-xl object-contain"
          />
          {!collapsed && (
            <div>
              <h1 className="text-base font-bold tracking-tight">LEXIS</h1>
              <p className="text-[10px] text-muted-foreground">AI Productivity Suite</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1" role="list">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href} role="listitem">
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      collapsed && "justify-center px-2",
                      isActive
                        ? "bg-primary-500/10 text-primary-500"
                        : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-sidebar-hover"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon className={cn("h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110")} />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        <span className="text-[10px] text-muted-foreground/30">{item.shortcut}</span>
                      </>
                    )}

                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className={cn("border-t border-border p-3 space-y-1", collapsed && "px-2")}>
          {!collapsed && (
            <a
              href="https://buymeacoffee.com/lexis"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground/60 hover:text-foreground hover:bg-sidebar-hover transition-all duration-200"
            >
              <Coffee className="h-3.5 w-3.5" />
              <span>Support LEXIS</span>
            </a>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex w-full items-center justify-center rounded-xl px-3 py-1.5 text-muted-foreground/40 hover:text-foreground transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform duration-200", collapsed && "rotate-180")} />
          </button>
        </div>
      </aside>
    </>
  );
}
