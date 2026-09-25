"use client";

import { useState, useEffect } from "react";
import { storage } from "@/lib/storage";

const NEW_APP = "https://app.orleia.app";
const MAX_HASH = 90_000; // keep under URL limits; larger data falls back to manual copy

export default function MigratePage() {
  const [phase, setPhase] = useState<"loading" | "export" | "import" | "done" | "error">("loading");
  const [message, setMessage] = useState("");
  const [backupJson, setBackupJson] = useState("");
  const [isOldDomain, setIsOldDomain] = useState(false);
  const [isNewDomain, setIsNewDomain] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    const isOld = host.includes("orleia-workspace") || host.includes("orleia-app");
    const isNew = host === "app.orleia.app" || host === "localhost" || host.startsWith("localhost:");
    setIsOldDomain(isOld);
    setIsNewDomain(isNew);

    const raw = window.location.hash;
    if (raw.startsWith("#data=")) {
      setPhase("import");
      runImport(decodeURIComponent(raw.slice(6)));
    } else {
      setPhase("export");
    }
  }, []);

  async function buildPayload(): Promise<string> {
    await storage.init();
    const json = storage.exportData();
    const extra: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("orleia-")) {
        const val = localStorage.getItem(key);
        if (val !== null) extra[key] = val;
      }
    }
    return encodeURIComponent(JSON.stringify({ json, extra }));
  }

  async function handleExport() {
    setMessage("Reading your data…");
    try {
      const payload = await buildPayload();
      setBackupJson(payload);
      if (payload.length <= MAX_HASH) {
        window.location.href = `${NEW_APP}/migrate#data=${payload}`;
        return;
      }
      setMessage("Your data is large - copy it manually below (step 2):");
    } catch (e) {
      setMessage("Something went wrong reading your data: " + String(e));
    }
  }

  async function runImport(encoded: string) {
    setMessage("Importing your data…");
    try {
      const parsed = JSON.parse(encoded) as {
        json: string;
        extra?: Record<string, string>;
      };
      const ok = storage.importData(parsed.json);
      if (!ok) throw new Error("invalid data file");
      for (const [k, v] of Object.entries(parsed.extra || {})) {
        localStorage.setItem(k, v);
      }
      setPhase("done");
    } catch (e) {
      setMessage("Import failed - the data looks corrupted: " + String(e));
      setPhase("error");
    }
  }

  async function handlePasteImport(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const raw = e.target.value.trim();
    if (raw.startsWith("#data=")) {
      runImport(decodeURIComponent(raw.slice(6)));
    } else if (raw) {
      runImport(raw);
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-border/50 bg-card p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {phase === "done" ? "Data migrated 🎉" : "Move your data"}
          </h1>

          {phase === "export" && (
            <>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Orleia has moved to a new home on{" "}
                <span className="font-medium text-foreground">{NEW_APP}</span>. Your habits, notes,
                journal, tasks and password live in this browser - this button carries them across,
                then lands you in the new app. One click, nothing leaves your devices.
              </p>
              <button
                onClick={handleExport}
                className="mt-6 w-full rounded-xl bg-foreground px-5 py-3.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Migrate to app.orleia.app →
              </button>
              {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
              {backupJson.length > MAX_HASH && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Step 2 - open{" "}
                    <a className="underline" href={`${NEW_APP}/migrate`}>
                      {NEW_APP}/migrate
                    </a>{" "}
                    and paste this:
                  </p>
                  <textarea
                    readOnly
                    value={`#data=${backupJson}`}
                    className="mt-2 h-32 w-full rounded-lg border border-border bg-muted p-3 font-mono text-xs"
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              )}
            </>
          )}

          {phase === "import" && (
            <>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {message || "Importing…"}
              </p>
            </>
          )}

          {phase === "done" && (
            <>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Everything is in place on your new home. You can now open Orleia - your password and
                all your data came along.
              </p>
              <a
                href="/"
                className="mt-6 block w-full rounded-xl bg-foreground px-5 py-3.5 text-center text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Open Orleia →
              </a>
            </>
          )}

          {phase === "error" && (
            <>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{message}</p>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Paste the backup here to retry:</p>
                <textarea
                  onChange={handlePasteImport}
                  placeholder='{"json": …, "extra": …} or #data=…'
                  className="mt-2 h-28 w-full rounded-lg border border-border bg-muted p-3 font-mono text-xs"
                />
              </div>
            </>
          )}

          {phase === "export" && isOldDomain && (
            <p className="mt-6 border-t border-border/50 pt-4 text-xs text-muted-foreground">
              You're on the old address - this page can read your data here. After migrating, the
              old address will point to the new one.
            </p>
          )}

          {phase === "export" && !isOldDomain && isNewDomain && (
            <p className="mt-6 border-t border-border/50 pt-4 text-xs text-muted-foreground">
              You're on the new address. If you had data on the old site, first open{" "}
              <span className="font-medium text-foreground">orleia-workspace.vercel.app/migrate</span>{" "}
              in the browser you used before - this page will carry it here automatically.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
