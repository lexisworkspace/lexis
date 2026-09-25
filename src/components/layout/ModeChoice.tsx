"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, PenTool, Copy, Check, Lock } from "lucide-react";
import { storage } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";
import type { OrleiaMode } from "@/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* The big choice: how do you want to use Orleia?                      */
/* Workspace (available now, the default) vs Canvas / Clone (soon).   */
/* ------------------------------------------------------------------ */

export function ModeChoice({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<OrleiaMode>(storage.getOrleiaMode());

  const options: {
    key: OrleiaMode;
    icon: React.ComponentType<{ className?: string }>;
    name: string;
    desc: string;
    soon: boolean;
  }[] = [
    {
      key: "workspace",
      icon: LayoutGrid,
      name: t("mode.workspace"),
      desc: t("mode.workspaceDesc"),
      soon: false,
    },
    {
      key: "canvas",
      icon: PenTool,
      name: t("mode.canvas"),
      desc: t("mode.canvasDesc"),
      soon: true,
    },
    {
      key: "clone",
      icon: Copy,
      name: t("mode.clone"),
      desc: t("mode.cloneDesc"),
      soon: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background">
      <div className="flex flex-1 flex-col justify-center px-6">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6 flex justify-center">
            <p className="text-xs font-sans tracking-[0.5em] text-muted-foreground/40">
              ORLEIA<span className="text-foreground/60">OS</span>
            </p>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-4 text-center font-serif text-3xl font-light tracking-tight text-foreground md:text-4xl"
          >
            {t("mode.title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mb-6 text-center text-xs leading-relaxed text-muted-foreground/70"
          >
            {t("mode.desc")}
          </motion.p>

          <div className="flex flex-col gap-3">
            {options.map((o) => {
              const active = mode === o.key;
              return (
                <button
                  key={o.key}
                  onClick={() => {
                    if (o.soon) return;
                    setMode(o.key);
                  }}
                  disabled={o.soon}
                  className={cn(
                    "relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                    o.soon
                      ? "cursor-not-allowed border-border/60 bg-secondary/20 opacity-60"
                      : active
                        ? "border-amber-500/40 bg-amber-500/10"
                        : "border-border bg-secondary/40 hover:border-muted-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      o.soon
                        ? "bg-secondary text-muted-foreground/50"
                        : active
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <o.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-sm font-medium",
                        o.soon ? "text-muted-foreground/70" : "text-foreground"
                      )}
                    >
                      {o.name}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {o.desc}
                    </span>
                  </span>
                  {o.soon ? (
                    <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                      <Lock className="h-2.5 w-2.5" />
                      {t("mode.comingSoon")}
                    </span>
                  ) : (
                    active && <Check className="mt-1 h-4 w-4 shrink-0 text-amber-500" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              storage.updateOrleiaMode(mode);
              onDone();
            }}
            className="mt-6 w-full rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
          >
            {t("onboarding.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
