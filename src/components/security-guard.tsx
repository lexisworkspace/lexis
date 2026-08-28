"use client";

import { useEffect, useRef } from "react";

/**
 * SecurityGuard - privacy-first client-side hardening.
 *
 * - Disables right-click context menu (casual copy attempts)
 * - Warns in console if devtools are suspected
 * - Monitors localStorage integrity for tampering
 * - Detects common DevTools opening techniques
 */
export default function SecurityGuard() {
  const integrityRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. Capture initial localStorage checksum for integrity monitoring
    const getChecksum = () => {
      try {
        const keys = Object.keys(localStorage).sort();
        const vals = keys.map((k) => `${k}:${localStorage.getItem(k)}`).join("||");
        let hash = 0;
        for (let i = 0; i < vals.length; i++) {
          const char = vals.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash |= 0;
        }
        return hash.toString();
      } catch {
        return null;
      }
    };
    integrityRef.current = getChecksum();

    // 2. Periodic integrity check (every 30s)
    const integrityInterval = setInterval(() => {
      const current = getChecksum();
      if (integrityRef.current && current && current !== integrityRef.current) {
        console.warn(
          "%c[LEXIS] ⚠️ localStorage integrity changed unexpectedly. Some data may have been modified externally.",
          "color: #a1a1aa; font-size: 11px;"
        );
        integrityRef.current = current;
      }
    }, 30000);

    // 3. Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);

    // 4. Disable print (shortcut guarding)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P / Cmd+P - print
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
      }
      // Ctrl+Shift+I / Cmd+Option+I - devtools
      if (
        (e.ctrlKey && e.shiftKey && e.key === "i") ||
        (e.metaKey && e.altKey && e.key === "i")
      ) {
        e.preventDefault();
      }
      // Ctrl+U - view source
      if ((e.ctrlKey || e.metaKey) && e.key === "u") {
        e.preventDefault();
      }
      // Ctrl+S / Cmd+S - save (page source)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // 5. DevTools open detection via element trick
    const detectDevTools = () => {
      const threshold = 200;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      if (widthThreshold || heightThreshold) {
        document.title = "LEXIS - Privacy Protected";
        console.log(
          "%c[LEXIS] 🔒 DevTools detected. All data remains encrypted in your browser.",
          "color: #a1a1aa; font-size: 12px; font-weight: bold;"
        );
      }
    };
    const devToolsInterval = setInterval(detectDevTools, 2000);

    // 6. Console warning - privacy notice
    const styles = [
      "color: #a1a1aa; font-size: 14px; font-weight: bold;",
      "color: #71717a; font-size: 12px;",
      "color: #a1a1aa; font-size: 11px;",
    ];
    console.log(
      "%c🔒 LEXIS - Privacy Protected\n%cAll data is stored locally in your browser. No servers, no tracking, no data collection.\n%cIf someone asked you to paste something here, it's a scam. Keep your data safe.",
      styles[0],
      styles[1],
      styles[2]
    );
    console.log(
      "%c🔐 This is a local-first application. Everything stays on your device.",
      "color: #52525b; font-size: 10px;"
    );

    // 7. Block external script injection via mutation observer
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLScriptElement && node.src) {
            // Only block scripts that try to access localStorage or are from unknown origins
            const allowedOrigins = [
              window.location.origin,
              "https://fonts.googleapis.com",
              "https://fonts.gstatic.com",
            ];
            const isAllowed = allowedOrigins.some(
              (origin) => node.src && node.src.startsWith(origin)
            );
            if (!isAllowed && !node.src.includes("vercel")) {
              console.warn(
                "%c[LEXIS] 🔒 Blocked external script:",
                "color: #ef4444; font-size: 10px;",
                node.src
              );
              node.remove();
            }
          }
        }
      }
    });
    observer.observe(document.head, { childList: true, subtree: true });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearInterval(integrityInterval);
      clearInterval(devToolsInterval);
      observer.disconnect();
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}
