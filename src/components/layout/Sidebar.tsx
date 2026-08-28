"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  FileText,
  BookOpen,
  ListTodo,
  CheckCircle2,
  Settings,
  Sparkles,
  ChevronLeft,
  Coffee,
  Search,
  Menu,
  X,
  Wrench,
  Grid3x3,
  Flower2,
} from "lucide-react";

import { NoorMark } from "@/components/NoorMark";

import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { ReminderBell } from "./ReminderCenter";

import { storage } from "@/lib/storage";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/habits", label: "Habits", icon: CheckCircle2 },
  { href: "/journal", label: "Mindfulness", icon: Flower2 },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/noor", label: "Noor", icon: NoorMark },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const { t } = useI18n();

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
                    <item.icon className={cn("h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110", item.label === "Noor" && "invert dark:invert-0")} />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                      </>
                    )}

                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

                {/* Lexis Tools */}
        <div className="px-2 pb-2">
          <button onClick={() => setToolsOpen((v) => !v)} className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground/50 transition-all duration-200 hover:text-muted-foreground", collapsed && "justify-center px-2")}>
            <Wrench className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="flex-1 text-left">Tools</span>}
          </button>
          <AnimatePresence initial={false}>
            {toolsOpen && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }} className="space-y-0.5 overflow-hidden" role="list">
                {[{ href: "/notes", labelKey: "nav.notes", icon: FileText }, { href: "/documents", labelKey: "nav.documents", icon: BookOpen }, { href: "/grid", labelKey: "nav.grid", icon: Grid3x3 }].map((item) => { const isActive = pathname === item.href; return (<li key={item.href}><Link href={item.href} onClick={() => setMobileOpen(false)} className={cn("group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium", collapsed && "justify-center px-2", isActive ? "bg-primary-500/10 text-primary-500" : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-sidebar-hover")}><item.icon className="h-5 w-5 shrink-0" />{!collapsed && <span className="flex-1">{t(item.labelKey)}</span>}</Link></li>); })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom section */}
        <div className="border-t border-border p-3 space-y-1 overflow-hidden">
          <ReminderBell collapsed={collapsed} />
          <a href="https://buymeacoffee.com/lexis" target="_blank" rel="noopener noreferrer" className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] text-muted-foreground/60 hover:text-foreground hover:bg-sidebar-hover transition-all duration-200", collapsed && "justify-center px-2")}><Coffee className="h-3.5 w-3.5 shrink-0" />{!collapsed && <span>Support LEXIS</span>}</a>
          <Link href="/settings" onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition-all duration-200", collapsed && "justify-center px-2", pathname === "/settings" ? "bg-primary-500/10 text-primary-500" : "text-muted-foreground/60 hover:text-foreground hover:bg-sidebar-hover")}><Settings className="h-3.5 w-3.5 shrink-0" />{!collapsed && <span>{t("nav.settings")}</span>}</Link>
          <button onClick={() => setCollapsed(!collapsed)} className="hidden md:flex w-full items-center justify-center rounded-xl px-3 py-1.5 text-muted-foreground/40 hover:text-foreground transition-colors duration-200" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}><ChevronLeft className={cn("h-3.5 w-3.5 transition-transform duration-200", collapsed && "rotate-180")} /></button>
        </div>
      </aside>
    </>
  );
}
