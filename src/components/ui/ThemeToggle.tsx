"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Theme } from "@/types";
import { storage } from "@/lib/storage";

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = storage.getData().theme.theme;
    setThemeState(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    const isDark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", isDark);
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    storage.updateTheme({ theme: t });
    applyTheme(t);
  };

  if (!mounted) return null;

  const themes: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
            theme === value
              ? "bg-primary-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
