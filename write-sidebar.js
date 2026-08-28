const fs = require('fs');
const content = `"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  CheckCircle2,
  ListTodo,
  Settings,
  ChevronLeft,
  Coffee,
  Search,
  Wrench,
  Grid3x3,
  FileText,
  BookOpen,
  Flower2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { NoorMark } from "@/components/NoorMark";
import { storage } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";
import { ReminderBell } from "./ReminderCenter";

const navItems = [
  { href: "/", labelKey: "nav.dashboard", icon: Home },
  { href: "/tasks", labelKey: "nav.tasks", icon: ListTodo },
  { href: "/noor", labelKey: "nav.noor", icon: NoorMark },
];

const toolItems = [
  { href: "/notes", labelKey: "nav.notes", icon: FileText },
  { href: "/documents", labelKey: "nav.documents", icon: BookOpen },
  { href: "/grid", labelKey: "nav.grid", icon: Grid3x3 },
];

export function Sidebar({
  collapsed = false,
  onToggleCollapsed,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
} = {}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const { t } = useI18n();

  const data = storage.getData();
  const suggestions = data.aiSuggestions.filter((s) => !s.read).length;
  const journalStreak = storage.getJournalStreak().current;

  useEffect(() => {
    const onOpen = () => setMobileOpen(true);
    window.addEventListener("lexis:open-drawer", onOpen);
    return () => window.removeEventListener("lexis:open-drawer", onOpen);
  }, []);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100]
                   focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        Skip to main content
      </a>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full flex-col border-r border-border bg-sidebar overflow-hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{ width: collapsed ? 72 : 260, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center gap-3 border-b border-border px-4 py-4",
          collapsed && "justify-center px-2"
        )}>
          <img
            src="/lexis-logo.png"
            alt="LEXIS"
            className="h-11 w-11 rounded-xl object-contain shrink-0"
          />
          {!collapsed && <h1 className="text-sm font-bold tracking-tight whitespace-nowrap">LEXIS</h1>}
        </div>

        {/* Global search */}
        <div className="px-2 pt-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("lexis:open-search"))}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl border border-border/70 bg-secondary/40 px-2.5 py-2 text-xs text-muted-foreground transition-all duration-200 hover:border-primary-500/40 hover:text-foreground",
              collapsed && "justify-center px-0 border-transparent"
            )}
            aria-label="Search"
          >
            <Search className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="flex-1 text-left">Search</span>}
          </button>
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
                      "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium",
                      collapsed && "justify-center px-2",
                      isActive
                        ? "bg-primary-500/10 text-primary-500"
                        : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-sidebar-hover"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon className={cn(
                      "shrink-0 transition-transform duration-200 group-hover:scale-110",
                      item.labelKey === "nav.noor" ? "h-7 w-7 invert dark:invert-0" : "h-5 w-5"
                    )} />
                    {!collapsed && <span className="flex-1">{t(item.labelKey)}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Lexis Tools */}
        <div className="px-2 pb-2">
          <button
            onClick={() => setToolsOpen((v) => !v)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground/50 transition-all duration-200 hover:text-muted-foreground",
              collapsed && "justify-center px-2"
            )}
          >
            <Wrench className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="flex-1 text-left">Tools</span>}
          </button>
          <AnimatePresence initial={false}>
            {toolsOpen && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="space-y-0.5 overflow-hidden"
                role="list"
              >
                {toolItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href} role="listitem">
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium",
                          collapsed && "justify-center px-2",
                          isActive
                            ? "bg-primary-500/10 text-primary-500"
                            : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-sidebar-hover"
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                        {!collapsed && <span className="flex-1">{t(item.labelKey)}</span>}
                      </Link>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom section */}
        <div className="border-t border-border p-3 space-y-1 overflow-hidden">
          <ReminderBell collapsed={collapsed} />
          <a
            href="https://buymeacoffee.com/lexis"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] text-muted-foreground/60 hover:text-foreground hover:bg-si
