import { useEffect, useState } from "react";

/**
 * True once the component has mounted on the client.
 *
 * Pages whose content depends on localStorage render a static skeleton
 * until this flips — otherwise the SSR tree (default data) is replaced
 * during hydration and every entrance animation replays (the flicker).
 *
 * The flag is module-level on purpose: once the app has hydrated, any
 * LATER mount (tab switch, back-navigation) starts `true` immediately.
 * Without it, every remount spent one frame on the skeleton — a second
 * flicker on each tab entry.
 */
let HAS_HYDRATED = false;

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(HAS_HYDRATED);
  useEffect(() => {
    HAS_HYDRATED = true;
    setHydrated(true);
  }, []);
  return hydrated;
}

/**
 * True only on the FIRST mount of the given page key in the current app
 * session. Use it to gate entrance animations:
 *   const enter = useFirstVisit("tasks");
 *   initial={enter ? { opacity: 0, y: 12 } : false}
 * Sections animate in on first visit and appear instantly on every
 * revisit, so switching tabs never replays the choreography.
 */
const FIRST_VISITS = new Set<string>();
export function useFirstVisit(pageKey: string): boolean {
  const [enter] = useState(() => {
    const first = !FIRST_VISITS.has(pageKey);
    FIRST_VISITS.add(pageKey);
    return first;
  });
  return enter;
}
