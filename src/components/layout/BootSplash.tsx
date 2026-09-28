"use client";

/**
 * Boot splash — visible from FIRST PAINT, before any JavaScript runs.
 *
 * Root problem this solves: the React SplashScreen only exists after the
 * bundle downloads and hydration runs, so cold loads showed a white screen
 * for seconds before the wordmark ever appeared. This component is plain
 * server-rendered HTML with inline styles: the browser paints it while the
 * JS bundle is still downloading.
 *
 * Handoff: when the React SplashScreen mounts (same wordmark, same
 * background, higher z-index) it dispatches `orleia:splash-ready`, and this
 * overlay removes itself — the swap is invisible. If the React splash will
 * NOT mount (e.g. same-session reload, where isFreshLoad() is false),
 * ClientLayout dispatches the same event so this never lingers. A failsafe
 * timer guarantees removal even if some path never fires the event.
 *
 * Rendered only inside the (app) group — marketing/landing pages unaffected.
 */
import { useEffect, useState } from "react";

export function BootSplash() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const off = () => setDone(true);
    window.addEventListener("orleia:splash-ready", off, { once: true });
    // Failsafe: never trap the user behind a static overlay.
    const failsafe = setTimeout(off, 8000);
    return () => {
      window.removeEventListener("orleia:splash-ready", off);
      clearTimeout(failsafe);
    };
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden
      className="boot-splash"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998, // under SplashScreen (9999), above the app
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgb(var(--background))",
      }}
    >
      {/* Dark-mode flip matches SplashScreen's dark:invert. Inline <style> so
          no external CSS is needed for the pre-JS paint. */}
      <style>{`html.dark .boot-splash-img{filter:invert(1)}`}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/orleia-wordmark.png"
        alt=""
        className="boot-splash-img"
        style={{ height: "clamp(48px, 6vw, 64px)", width: "auto" }}
      />
    </div>
  );
}
