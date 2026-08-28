"use client";

import { useState, useEffect } from "react";

/**
 * Mobile/small-screen detection.
 * The initial value is computed synchronously on the client so there is no
 * post-hydration state flip (which previously caused a visible "double load":
 * content renders hidden, then pops in after the effect runs). On the server
 * it defaults to false; the CSS media-query override in globals.css guarantees
 * nothing ever appears invisible on touch devices.
 */
export function useMobile(breakpoint: number = 767): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(`(max-width: ${breakpoint}px)`).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}
