"use client";

// ============================================================
// Long-press (touch) + right-click context menu primitive.
// Apple-style: press and hold a list row to reveal quick actions.
// Holds 450ms, fires haptic tick, survives small finger drift
// (cancels on scroll). The caller renders the menu UI.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/haptics";

const HOLD_MS = 450;

export interface MenuState {
  x: number;
  y: number;
  id: string;
}

/**
 * Attach to a list row. Returns onTouchStart/onContextMenu handlers plus
 * the open menu state; the caller closes it via closeMenu().
 */
export function useLongPress() {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef({ x: 0, y: 0 });

  const clear = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }, []);

  useEffect(() => clear, [clear]);

  // Dismiss on any outside interaction.
  useEffect(() => {
    if (!menu) return;
    const off = () => setMenu(null);
    window.addEventListener("scroll", off, true);
    window.addEventListener("resize", off);
    return () => {
      window.removeEventListener("scroll", off, true);
      window.removeEventListener("resize", off);
    };
  }, [menu]);

  const openAt = useCallback((x: number, y: number, id: string) => {
    haptic.tick();
    // Keep the menu on-screen: clamp to viewport with a small margin.
    const cx = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 400) - 190);
    const cy = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 800) - 190);
    setMenu({ x: Math.max(8, cx), y: Math.max(8, cy), id });
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent, id: string) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
    clear();
    timer.current = setTimeout(() => {
      openAt(start.current.x, start.current.y, id);
    }, HOLD_MS);
  }, [clear, openAt]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    // Finger drifted more than ~10px: it's a scroll, cancel the hold.
    if (Math.abs(t.clientX - start.current.x) > 10 || Math.abs(t.clientY - start.current.y) > 10) {
      clear();
    }
  }, [clear]);

  const onTouchEnd = useCallback(() => clear(), [clear]);

  const onContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    openAt(e.clientX, e.clientY, id);
  }, [openAt]);

  const closeMenu = useCallback(() => setMenu(null), []);

  return { menu, closeMenu, longPressProps: (id: string) => ({
    onTouchStart: (e: React.TouchEvent) => onTouchStart(e, id),
    onTouchMove,
    onTouchEnd,
    onContextMenu: (e: React.MouseEvent) => onContextMenu(e, id),
  }) };
}

/** Glass-styled floating menu sheet rendered from useLongPress().menu. */
export function LongPressMenu({
  menu,
  onClose,
  children,
}: {
  menu: MenuState | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {menu && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[190]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            style={{ left: menu.x, top: menu.y }}
            className="fixed z-[200] w-48 overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-2xl"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
