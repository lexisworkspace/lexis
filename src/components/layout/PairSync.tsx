"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import { Smartphone, X, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { PairAction } from "@/lib/pair-actions";

/* ------------------------------------------------------------------ */
/* The desktop pairing bridge (only exists inside Orleia Desktop).     */
/* In a plain browser tab there is nothing to pair with, so the step  */
/* explains that instead of failing.                                  */
/* ------------------------------------------------------------------ */

interface PairingInfo {
  url: string;
  token: string;
  port: number;
  host: string;
  expiresAt: number;
}

interface OrleiaPairingApi {
  available: boolean;
  start: () => Promise<PairingInfo>;
  stop: () => Promise<boolean>;
  onDataRequest: (provider: () => string) => void;
  onPairAction: (handler: (action: PairAction) => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>) => void;
}

declare global {
  interface Window {
    orleiaPairing?: OrleiaPairingApi;
  }
}

export function PairSync({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const { t } = useI18n();
  const pairing = typeof window !== "undefined" ? window.orleiaPairing : undefined;
  const [state, setState] = useState<"checking" | "unavailable" | "starting" | "active" | "error">(
    typeof window !== "undefined" && window.orleiaPairing ? "starting" : "checking"
  );
  const [info, setInfo] = useState<PairingInfo | null>(null);
  const [qrData, setQrData] = useState<string>("");
  const [error, setError] = useState("");

  // NOTE: the workspace provider + phone-action handler are registered at
  // the APP level (ClientLayout), not here - they must stay registered no
  // matter which screen is mounted, or a paired phone loses access the
  // moment the user navigates away from this screen.

  // Resolve the initial state fast: with a bridge, start the local link
  // automatically (the QR appears without any click). Without one, stop
  // hanging on "Checking…" and explain what's needed instead.
  useEffect(() => {
    if (pairing) {
      begin();
      return;
    }
    const t = setTimeout(() => setState("unavailable"), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairing]);

  // Start the pairing server and render the QR.
  const begin = useCallback(async () => {
    if (!pairing) {
      setState("unavailable");
      return;
    }
    setState("starting");
    try {
      const i = await pairing.start();
      setInfo(i);
      const url = await QRCode.toDataURL(i.url, {
        width: 260,
        margin: 1,
        color: { dark: "#0b0b0b", light: "#ffffff" },
      });
      setQrData(url);
      setState("active");
    } catch (e) {
      setError(String((e as Error)?.message || e));
      setState("error");
    }
  }, [pairing]);

  // Deliberately NO stop-on-unmount: the pairing server is not tied to this
  // screen. It lives until the user explicitly stops it, the app quits, or
  // the 24h token expires - otherwise switching tabs on the desktop would
  // kill the phone's connection (the phone's app is served through this
  // server).

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background">
      <div className="mt-14 flex w-full justify-center md:mt-16">
        <p className="text-xs font-sans tracking-[0.5em] text-muted-foreground/40">
          ORLEIA<span className="text-foreground/60">OS</span>
        </p>
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mt-10 px-6 text-center font-serif text-3xl font-light tracking-tight text-foreground md:text-4xl"
      >
        {t("pair.title")}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="mx-auto mt-4 max-w-sm px-6 text-center text-xs leading-relaxed text-muted-foreground/70"
      >
        {t("pair.desc")}
      </motion.p>

      <div className="mt-8 w-full flex-1 overflow-y-auto px-6 pb-4">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center">
          {state === "checking" && <p className="py-10 text-sm text-muted-foreground/60">{t("pair.checking")}</p>}

          {state === "unavailable" && (
            <div className="w-full rounded-2xl border border-border bg-secondary/40 p-6 text-center">
              <Smartphone className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("pair.desktopOnly")}</p>
            </div>
          )}

          {state === "starting" && <p className="py-10 text-sm text-muted-foreground/60">{t("pair.starting")}</p>}

          {state === "error" && (
            <div className="w-full rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={() => begin()}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t("pair.retry")}
              </button>
            </div>
          )}

          {state === "active" && info && (
            <>
              <div className="rounded-2xl border border-border bg-white p-4">
                <img src={qrData} alt={t("pair.qrAlt")} className="h-60 w-60" width={240} height={240} />
              </div>
              <p className="mt-5 text-center font-sans text-[11px] tracking-widest text-muted-foreground/50">
                {t("pair.active")}
              </p>
              <p className="mt-6 w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 text-center text-xs text-muted-foreground break-all">
                {info.url}
              </p>
              <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground/60">
                {t("pair.how")}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex w-full flex-col items-center gap-3 px-6 pb-10 pt-4">
        <div className="mx-auto w-full max-w-sm">
          {state === "active" && (
            <button
              onClick={() => {
                // Finish the step WITHOUT stopping the server - the phone
                // stays connected until the user stops pairing explicitly.
                onDone();
              }}
              className="w-full rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
            >
              {t("pair.done")}
            </button>
          )}
          {state === "unavailable" && (
            <a
              href="https://www.orleia.app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
            >
              {t("pair.getDesktop")}
            </a>
          )}
        </div>
        <button onClick={onSkip} className="text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground/70">
          {state === "active" ? (
            <span className="inline-flex items-center gap-1.5">
              <X className="h-3 w-3" />
              {t("pair.skip")}
            </span>
          ) : (
            t("pair.skip")
          )}
        </button>
      </div>
    </div>
  );
}
