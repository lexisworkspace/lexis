"use client";

import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ElasticItemProps {
  id: string;
  title: string;
  category: string;
  src: string;
  alt: string;
}

function ElasticGallery() {
  const items: ElasticItemProps[] = [
    {
      id: "01",
      title: "Ethos 4.7",
      category: "DEEP REASONING",
      src: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800&auto=format&fit=crop&q=80",
      alt: "Abstract flowing waves",
    },
    {
      id: "02",
      title: "Logos 4.5",
      category: "BALANCED",
      src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop&q=80",
      alt: "Abstract intersecting lines",
    },
    {
      id: "03",
      title: "Verse 4",
      category: "INSTANT",
      src: "https://images.unsplash.com/photo-1504192010706-dd7f569ee2be?w=800&auto=format&fit=crop&q=80",
      alt: "Abstract geometric shapes",
    },
  ];

  const [activeId, setActiveId] = useState<string | null>("01");

  return (
    <section id="noor" className="border-t border-border/30">
      <div className="w-full py-12 md:py-24">
        <div className="mx-auto max-w-5xl px-6 mb-12 text-center">
          <p className="text-[11px] font-mono tracking-[0.4em] text-muted-foreground/40 mb-4">NOOR</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Your AI companion.</h2>
          <p className="mt-4 text-muted-foreground/60 font-body text-lg max-w-xl mx-auto">Three distinct minds, one workspace. Reads your data, helps you think deeper.</p>
        </div>
        <div className="mx-auto flex h-[400px] w-full max-w-6xl flex-col gap-2 px-4 md:h-[500px] md:flex-row md:gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              onMouseEnter={() => setActiveId(item.id)}
              onClick={() => setActiveId(item.id)}
              className={cn(
                "relative cursor-pointer overflow-hidden rounded-2xl border border-neutral-200 bg-[#fafafa] dark:border-neutral-800 dark:bg-neutral-950",
                "transition-[flex,filter] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]",
                activeId === item.id ? "flex-[4]" : "flex-[1]",
                activeId === item.id
                  ? "brightness-100"
                  : "brightness-50 hover:brightness-75"
              )}
            >
              <div className="absolute inset-0 h-full w-full">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  className={cn(
                    "object-cover transition-transform duration-1000",
                    activeId === item.id ? "scale-100" : "scale-110"
                  )}
                />
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500",
                    activeId === item.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
                <div className="absolute inset-0 bg-purple-900/25 mix-blend-multiply pointer-events-none"></div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 flex h-full flex-col justify-end p-4 md:p-8">
                <div
                  className={cn(
                    "flex flex-col gap-2 transition-all duration-500",
                    activeId === item.id
                      ? "translate-y-0 opacity-100 delay-200"
                      : "translate-y-12 opacity-0"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/30 bg-white/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-md md:px-3 md:text-xs">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black uppercase leading-none text-white md:text-5xl">
                    {item.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/80 md:mt-4 md:text-sm">
                    Chat with {item.title.split(" ")[0]}{" "}
                    <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4" />
                  </div>
                </div>

                <div
                  className={cn(
                    "absolute transition-all duration-500",
                    "bottom-4 left-1/2 -translate-x-1/2 md:bottom-8",
                    activeId === item.id
                      ? "opacity-0 scale-50"
                      : "opacity-100 delay-500"
                  )}
                >
                  <span className="hidden whitespace-nowrap text-xl font-bold uppercase tracking-widest text-white [writing-mode:vertical-rl] md:block">
                    {item.title}
                  </span>
                  <span className="block text-xs font-bold text-white md:hidden">
                    {item.id}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export { ElasticGallery };
