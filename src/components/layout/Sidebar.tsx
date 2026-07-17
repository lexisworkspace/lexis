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
  Menu,
  X,
  Sparkles,
  ChevronLeft,
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
  { href: "/assistant", label: "AI Assistant", icon: Bot, shortcut: "⌘7" },
  { href: "/settings", label: "Settings", icon: Settings, shortcut: "⌘8" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const data = storage.getData();
  const suggestions = data.aiSuggestions.filter((s) => !s.read).length;

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary-subtle text-white shadow-lg shadow-zinc-800/50 md:hidden"
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
      >
        {/* Logo */}
        <div className={cn("flex items-center gap-3 border-b border-border px-4 py-4", collapsed && "justify-center px-2")}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-lg shadow-orange-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-base font-bold tracking-tight">LEXIS</h1>
              <p className="text-[10px] text-muted-foreground">AI Productivity Suite</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      collapsed && "justify-center px-2",
                      isActive
                        ? "bg-primary-500/10 text-primary-500"
                        : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary-500")} />
                    {!collapsed && (
                      <>
                        <span>{item.label}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground/50">{item.shortcut}</span>
                      </>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-indicator"
                        className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary-500"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className={cn("border-t border-border p-3 space-y-3", collapsed && "px-2")}>
          <Link
            href="/assistant"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
              collapsed && "justify-center px-2",
              pathname === "/assistant"
                ? "bg-primary-500/10 text-primary-500"
                : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
            )}
          >
            <Bot className="h-4 w-4" />
            {!collapsed && (
              <>
                <span>AI Assistant</span>
                {suggestions > 0 && (                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-zinc-400 text-[10px] font-bold text-zinc-950">
                    {suggestions}
                  </span>
                )}
              </>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex w-full items-center justify-center rounded-xl px-3 py-2 text-muted-foreground hover:bg-sidebar-hover transition-colors"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
      </aside>
    </>
  );
}
