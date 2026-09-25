"use client";

import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";

interface VerticalMarqueeProps {
  children: ReactNode;
  pauseOnHover?: boolean;
  reverse?: boolean;
  className?: string;
  speed?: number;
}

function VerticalMarquee({
  children,
  pauseOnHover = false,
  reverse = false,
  className,
  speed = 30,
}: VerticalMarqueeProps) {
  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden",
        className
      )}
      style={
        {
          "--duration": `${speed}s`,
        } as React.CSSProperties
      }
    >
      <div
        className={cn(
          "flex shrink-0 flex-col animate-marquee-vertical",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "flex shrink-0 flex-col animate-marquee-vertical",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  );
}

const lexFeatures = [
  "Habits",
  "Mindfulness",
  "Notes",
  "Documents",
  "Tasks",
  "Grid",
  "Noor AI",
  "Voice Mode",
  "Image Generation",
  "Streaks",
  "Journals",
  "Kanban",
  "Spreadsheets",
  "Offline-First",
  "Free Forever",
];

export default function CTAWithVerticalMarquee() {
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const marqueeContainer = marqueeRef.current;
    if (!marqueeContainer) return;

    const updateOpacity = () => {
      const items = marqueeContainer.querySelectorAll(".marquee-item");
      const containerRect = marqueeContainer.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 2;

      items.forEach((item) => {
        const itemRect = item.getBoundingClientRect();
        const itemCenterY = itemRect.top + itemRect.height / 2;
        const distance = Math.abs(centerY - itemCenterY);
        const maxDistance = containerRect.height / 2;
        const normalizedDistance = Math.min(distance / maxDistance, 1);
        const opacity = 1 - normalizedDistance * 0.75;
        (item as HTMLElement).style.opacity = opacity.toString();
      });
    };

    const animationFrame = () => {
      updateOpacity();
      requestAnimationFrame(animationFrame);
    };

    const frame = requestAnimationFrame(animationFrame);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-12 overflow-hidden">
      <div className="w-full max-w-7xl animate-fade-in-up">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          {/* Left Content */}
          <div className="space-y-8 max-w-xl">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-medium leading-tight tracking-tight text-foreground animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              Your Entire Life,
              <br />
              In One Workspace.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-body animate-fade-in-up" style={{ animationDelay: "400ms" }}>
              Habits, journal, tasks, notes, spreadsheets, and AI. All local. All private. All yours. No account. No cost. No catch.
            </p>
            <div className="flex flex-wrap gap-4 animate-fade-in-up" style={{ animationDelay: "600ms" }}>
              <a
                href="https://app.orleia.app"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative px-6 py-3 bg-foreground text-background rounded-md font-medium overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                <span className="relative z-10 inline-flex items-center gap-2">ENTER ORLEIA <ArrowUpRight className="h-4 w-4" /></span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              </a>
              <a
                href="#features"
                className="group relative px-6 py-3 bg-secondary text-secondary-foreground rounded-md font-medium overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg border border-border"
              >
                <span className="relative z-10">EXPLORE FEATURES</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              </a>
            </div>
          </div>

          {/* Right Marquee */}
          <div ref={marqueeRef} className="relative h-[500px] lg:h-[600px] flex items-center justify-center animate-fade-in-up" style={{ animationDelay: "400ms" }}>
            <div className="relative w-full h-full">
              <VerticalMarquee speed={25} pauseOnHover className="h-full">
                {lexFeatures.map((item, idx) => (
                  <div
                    key={idx}
                    className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading font-light tracking-tight py-6 marquee-item"
                  >
                    {item}
                  </div>
                ))}
              </VerticalMarquee>

              {/* Top vignette */}
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-background via-background/60 to-transparent z-10"></div>

              {/* Bottom vignette */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/60 to-transparent z-10"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
