// NoorMark - the Noor monogram ("n" in a ring), from the 2026 rebrand.
// White mark on transparent; callers add "invert dark:invert-0" on light
// backgrounds. Variants: /noor-mark-white.png, /noor-mark-black.png.

import { cn } from "@/lib/utils";

export function NoorMark({ className }: { className?: string }) {
  return (
    <img
      src="/noor-mark-white.png"
      alt=""
      aria-hidden="true"
      className={cn("object-contain", className)}
    />
  );
}
