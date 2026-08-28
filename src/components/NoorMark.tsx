// NoorMark - the first "o" of the Noor wordmark, cropped straight from the
// actual logo (the ring + diagonal slash). White mark; callers add
// "invert dark:invert-0" on light backgrounds.

import { cn } from "@/lib/utils";

export function NoorMark({ className }: { className?: string }) {
  return (
    <img
      src="/noor-o.png"
      alt=""
      aria-hidden="true"
      className={cn("object-contain", className)}
    />
  );
}
