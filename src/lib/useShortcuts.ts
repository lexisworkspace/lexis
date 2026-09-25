"use client";

import { useEffect } from "react";

/**
 * Web keyboard shortcuts for Orleia.
 *
 * Global (any page):
 *  - Ctrl/Cmd + K         -> open global search (dispatches orleia:open-search)
 *  - Ctrl/Cmd + Shift + N -> new note (dispatches orleia:new-note; documents page listens)
 *  - Ctrl/Cmd + Shift + T -> new task (dispatches orleia:new-task; tasks page listens)
 *  - Ctrl/Cmd + Shift + H -> new habit (dispatches orleia:new-habit; habits page listens)
 *  - Ctrl/Cmd + B         -> toggle sidebar (dispatches orleia:toggle-sidebar)
 *  - Ctrl/Cmd + ,         -> open settings
 *  - Ctrl/Cmd + Shift + A -> open Noor (assistant)
 *
 * Never fires while typing in inputs/textareas/contenteditable, and never
 * intercepts browser combos (plain Ctrl+T/N/W are left alone).
 */
export function useShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const typing =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;

      const key = e.key.toLowerCase();

      // Ctrl+K works even while typing (standard search behaviour)
      if (key === "k" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("orleia:open-search"));
        return;
      }

      if (typing) return;

      if (e.shiftKey && !e.altKey) {
        switch (key) {
          case "n":
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("orleia:new-note"));
            return;
          case "t":
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("orleia:new-task"));
            return;
          case "h":
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("orleia:new-habit"));
            return;
          case "a":
            e.preventDefault();
            window.location.href = "/noor";
            return;
        }
        return;
      }

      // Non-shift combos
      if (key === "b") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("orleia:toggle-sidebar"));
      } else if (key === ",") {
        e.preventDefault();
        window.location.href = "/settings";
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
