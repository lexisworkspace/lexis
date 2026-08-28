"use client";

import { cn } from "@/lib/utils";

type VoiceOrbState = "idle" | "listening" | "speaking";

/**
 * The Noor voice orb - a sleek monochrome circle. The small variant is a clean orb
 * with no decoration; the larger variants add a soft glow and rings. Same
 * amber language everywhere.
 */
export function VoiceOrb({
  state = "idle",
  size = "md",
  className,
}: {
  state?: VoiceOrbState;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const active = state !== "idle";

  // Small: just the orb. Clean, no waves, no extras.
  if (size === "sm") {
    return (
      <span
        className={cn("relative flex items-center justify-center", className)}
        aria-hidden="true"
      >
        <span
          className={cn(
            "relative h-5 w-5 rounded-full",
            "bg-[radial-gradient(circle_at_32%_28%,#ffffff_0%,#a1a1aa_35%,#71717a_70%,#3f3f46_100%)]",
            "shadow-[inset_0_0_6px_rgba(255,255,255,0.3),inset_-2px_-3px_6px_rgba(0,0,0,0.4),0_0_10px_rgba(161,161,170,0.3)]",
            active && "orb-breathe"
          )}
        />
      </span>
    );
  }

  const container = size === "lg" ? "h-28 w-28" : "h-14 w-14";
  const core = size === "lg" ? "h-24 w-24" : "h-12 w-12";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center",
        container,
        className
      )}
      aria-hidden="true"
    >
      {state === "listening" && (
        <>
          <span className="orb-ring" />
          <span className="orb-ring" style={{ animationDelay: "0.8s" }} />
          <span className="orb-ring" style={{ animationDelay: "1.6s" }} />
        </>
      )}
      {state === "speaking" && <span className="orb-ring orb-ring-soft" />}

      <div className={cn("orb-core", core, active && "orb-breathe")}>
        <span className="orb-glow" />
      </div>
    </div>
  );
}
