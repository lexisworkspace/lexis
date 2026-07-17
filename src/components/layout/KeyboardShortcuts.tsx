"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const shortcuts: { key: string; href: string; label: string }[] = [
  { key: "1", href: "/", label: "Dashboard" },
  { key: "2", href: "/habits", label: "Habits" },
  { key: "3", href: "/notes", label: "Notes" },
  { key: "4", href: "/journal", label: "Journal" },
  { key: "5", href: "/tasks", label: "Tasks" },
  { key: "6", href: "/analytics", label: "Analytics" },
  { key: "7", href: "/assistant", label: "AI Assistant" },
];

export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // cmd+number or ctrl+number
      if ((e.metaKey || e.ctrlKey) && /^[1-7]$/.test(e.key)) {
        e.preventDefault();
        const shortcut = shortcuts[parseInt(e.key) - 1];
        if (shortcut) {
          router.push(shortcut.href);
        }
      }

      // cmd+k or ctrl+k - focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Could open a command palette
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  return null;
}
