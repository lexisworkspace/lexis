"use client";

import { useCallback, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileDown,
  FileText,
  FileUp,
  ListTodo,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NotionLogo,
  TodoistLogo,
  GoogleTasksLogo,
  AppleRemindersLogo,
  TrelloLogo,
  GenericLogo,
} from "./BrandLogos";
import {
  SWITCH_SOURCES,
  SwitchSource,
  ImportResult,
  SwitchSourceDef,
} from "@/lib/switch/types";
import { parseImport } from "@/lib/switch/parsers";
import { commitImport, CommitStats } from "@/lib/switch/commit";

type Stage = "source" | "upload" | "preview" | "done";

const SOURCE_ICONS: Record<SwitchSource, React.ComponentType<{ className?: string }>> = {
  notion: NotionLogo,
  todoist: TodoistLogo,
  google: GoogleTasksLogo,
  apple: AppleRemindersLogo,
  trello: TrelloLogo,
  generic: GenericLogo,
};

const SOURCE_COLORS: Record<SwitchSource, string> = {
  notion: "text-muted-foreground bg-zinc-200/10",
  todoist: "text-red-400 bg-red-400/10",
  google: "text-sky-400 bg-sky-400/10",
  apple: "text-muted-foreground bg-zinc-300/10",
  trello: "text-blue-400 bg-blue-400/10",
  generic: "text-emerald-400 bg-emerald-400/10",
};

export function LexisSwitch({
  onClose,
  onComplete,
}: {
  /** Called when the user dismisses without importing (X / skip). */
  onClose?: () => void;
  /** Called after a successful import OR explicit completion. */
  onComplete: () => void;
}) {
  const [stage, setStage] = useState<Stage>("source");
  const [source, setSource] = useState<SwitchSourceDef | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [stats, setStats] = useState<CommitStats | null>(null);
  const [genericMode, setGenericMode] = useState<"auto" | "tasks" | "documents">("auto");
  const inputRef = useRef<HTMLInputElement>(null);

  const pickSource = (s: SwitchSourceDef) => {
    setSource(s);
    setFiles([]);
    setResult(null);
    setError(null);
    setStage("upload");
  };

  const handleFiles = (list: FileList | null) => {
    if (!list || !source) return;
    const arr = Array.from(list);
    setFiles(arr);
    setError(null);
    runParse(arr);
  };

  const runParse = async (arr: File[], mode: "auto" | "tasks" | "documents" = "auto") => {
    if (!source) return;
    setBusy(true);
    setError(null);
    try {
      const r = await parseImport(source.id, arr, mode);
      setResult(r);
      setStage("preview");
    } catch (e) {
      console.error("Lexis Switch parse failed", e);
      setError(
        "We couldn't read that file. Make sure it's the right export format for " +
          source.name +
          "."
      );
      setStage("upload");
    } finally {
      setBusy(false);
    }
  };

  const toggleGenericMode = (mode: "tasks" | "documents") => {
    setGenericMode(mode);
    if (files.length) runParse(files, mode);
  };

  const doImport = () => {
    if (!result) return;
    setBusy(true);
    try {
      // Wait a tick so the UI paints the loading state
      setTimeout(() => {
        const s = commitImport(result.tasks, result.documents);
        setStats(s);
        setStage("done");
        setBusy(false);
      }, 50);
    } catch (e) {
      console.error("Lexis Switch commit failed", e);
      setError("Something went wrong while saving. Nothing was changed.");
      setBusy(false);
    }
  };

  const totalFound =
    (result?.tasks.length ?? 0) + (result?.documents.length ?? 0);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source]
  );

  const back = () => {
    if (stage === "upload" || stage === "preview") {
      setStage("source");
      setSource(null);
      setResult(null);
      setFiles([]);
      setError(null);
    } else if (stage === "done") {
      setStage("source");
      setStats(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-background">
      {/* Decorative lines */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/4 top-1/4 h-px w-32 -translate-x-1/2 bg-border" />
        <div className="absolute left-1/4 top-1/4 h-32 w-px -translate-y-1/2 bg-border" />
        <div className="absolute bottom-1/3 right-1/4 h-px w-20 bg-border/50" />
        <div className="absolute right-1/3 top-1/3 h-24 w-px bg-border/30" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-5 py-8 sm:px-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="mb-3 text-[11px] font-mono tracking-widest text-muted-foreground/40">
              LEXIS SWITCH
            </p>
            <div className="mb-3 h-px w-10 bg-primary-500/50" />
            <h1 className="mb-2 font-serif text-3xl font-light tracking-tight text-foreground leading-none md:text-4xl">
              Bring your life to Lexis
            </h1>
            <p className="max-w-md text-sm text-muted-foreground/70 leading-relaxed">
              Import tasks and documents from the apps you already use. Everything is
              parsed right here on your device - nothing ever leaves your browser.
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border p-2 text-muted-foreground/50 transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ---------- STAGE: source picker ---------- */}
        {stage === "source" && (
          <div>
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/50">
              Where are you coming from?
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SWITCH_SOURCES.map((s, i) => {
                const Icon = SOURCE_ICONS[s.id];
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => pickSource(s)}
                    className="group flex items-start gap-4 rounded-2xl border border-border bg-secondary/30 p-4 text-left transition-all duration-200 hover:border-muted-foreground/30 hover:bg-secondary/60 active:scale-[0.99]"
                    style={{ animation: `lx-fade-up 0.45s cubic-bezier(0.22,1,0.36,1) both ${i * 0.06}s` }}
                  >
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                        SOURCE_COLORS[s.id]
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{s.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground/60">
                        {s.desc}
                      </span>
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary-500 opacity-0 transition-opacity group-hover:opacity-100">
                        Import <ArrowRight className="h-3 w-3" />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <p className="text-xs text-muted-foreground/40">It&apos;s optional - you can always do it later in Settings.</p>
              <button
                type="button"
                onClick={onComplete}
                className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
              >
                Skip
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ---------- STAGE: upload / drop zone ---------- */}
        {stage === "upload" && source && (
          <div>
            <button
              type="button"
              onClick={back}
              className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground/50 transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> All sources
            </button>

            <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-secondary/30 p-4">
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", SOURCE_COLORS[source.id])}>
                {(() => {
                  const Icon = SOURCE_ICONS[source.id];
                  return <Icon className="h-5 w-5" />;
                })()}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{source.name}</p>
                <p className="text-xs text-muted-foreground/60">{source.desc}</p>
              </div>
            </div>

            {/* How-to export helper */}
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-primary-500/20 bg-primary-500/5 p-4">
              <FileDown className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
              <div>
                <p className="text-xs font-semibold text-foreground/90">How to export</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground/70">
                  {source.howTo}
                </p>
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-all duration-200",
                dragging
                  ? "border-primary-500 bg-primary-500/10"
                  : "border-border bg-secondary/20 hover:border-muted-foreground/30 hover:bg-secondary/40"
              )}
            >
              {busy ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                  <p className="text-sm text-muted-foreground/70">Reading your export...</p>
                </>
              ) : (
                <>
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/10">
                    <UploadCloud className="h-7 w-7 text-primary-500" />
                  </span>
                  <div>
                    <p className="text-base font-semibold">
                      {dragging ? "Drop it here" : "Drop your export here"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground/60">
                      or click to browse files
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-mono text-muted-foreground/60">
                    {source.multi
                      ? ".csv .md .txt — select as many as you want"
                      : source.extensions.join(" ")}
                  </span>
                </>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              className="hidden"
              multiple={source.multi}
              accept={source.extensions.join(",")}
              onChange={(e) => handleFiles(e.target.files)}
            />

            {error && (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-300">
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            {files.length > 0 && !error && (
              <div className="mt-5 rounded-xl border border-border bg-secondary/30 p-3.5">
                {files.map((f) => (
                  <div key={f.name} className="flex items-center gap-2.5 py-1 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                    <span className="truncate">{f.name}</span>
                    <span className="ml-auto shrink-0 text-muted-foreground/40">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------- STAGE: preview ---------- */}
        {stage === "preview" && result && (
          <div>
            <button
              type="button"
              onClick={back}
              className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground/50 transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Choose a different file
            </button>

            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/50">
              What we found
            </p>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <div
                className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/30 p-4"
                style={{ animation: "lx-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both" }}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10">
                  <ListTodo className="h-5 w-5 text-primary-500" />
                </span>
                <div>
                  <p className="text-2xl font-bold leading-none">{result.tasks.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">Tasks</p>
                </div>
              </div>
              <div
                className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/30 p-4"
                style={{ animation: "lx-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both 0.05s" }}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <FileText className="h-5 w-5 text-emerald-500" />
                </span>
                <div>
                  <p className="text-2xl font-bold leading-none">{result.documents.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">Documents</p>
                </div>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="mb-5 space-y-2">
                {result.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200/90"
                  >
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                    {w}
                  </div>
                ))}
              </div>
            )}

            {/* Generic override: force tasks vs documents */}
            {result.source === "generic" && result.tasks.length + result.documents.length === 0 && (
              <div className="mb-5 rounded-2xl border border-border bg-secondary/30 p-4">
                <p className="mb-3 text-xs font-semibold">Not sure what this is?</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleGenericMode("tasks")}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      genericMode === "tasks"
                        ? "border-primary-500 bg-primary-500/15 text-primary-500"
                        : "border-border text-muted-foreground hover:border-muted-foreground/30"
                    )}
                  >
                    Treat as tasks
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGenericMode("documents")}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      genericMode === "documents"
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-500"
                        : "border-border text-muted-foreground hover:border-muted-foreground/30"
                    )}
                  >
                    Treat as documents
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground/50">
                  {genericMode === "tasks"
                    ? "CSV rows will be imported as tasks (first column = title)."
                    : genericMode === "documents"
                    ? "CSV rows will be imported as documents (first column = title)."
                    : "Lexis will guess. Choose a mode if the guess looks wrong."}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="max-w-[240px] text-xs text-muted-foreground/40">
                Items with the same title as something you already have are skipped automatically.
              </p>
              <button
                type="button"
                onClick={doImport}
                disabled={(totalFound === 0 && genericMode === "auto") || busy}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-medium transition-all active:scale-[0.98]",
                  totalFound > 0 || genericMode !== "auto"
                    ? "bg-foreground text-background hover:opacity-90"
                    : "cursor-not-allowed bg-muted text-muted-foreground/40"
                )}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    Import {totalFound > 0 ? `${totalFound} items` : ""}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ---------- STAGE: done ---------- */}
        {stage === "done" && stats && (
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <div
              className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/15 ring-1 ring-emerald-500/30"
              style={{ animation: "lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both" }}
            >
              <Check className="h-8 w-8 text-emerald-500" />
            </div>
            <h2
              className="mb-3 text-3xl font-bold tracking-tight leading-none"
              style={{ animation: "lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both 0.05s" }}
            >
              Welcome to Lexis
            </h2>
            <p
              className="mb-8 max-w-sm text-sm text-muted-foreground/70 leading-relaxed"
              style={{ animation: "lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both 0.1s" }}
            >
              Your data is now part of your local workspace. Find it under Tasks and
              Documents - and ask Noor about it anytime.
            </p>

            <div
              className="mb-10 grid w-full max-w-md grid-cols-2 gap-3 sm:grid-cols-4"
              style={{ animation: "lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both 0.15s" }}
            >
              {[
                { n: stats.tasksCreated, label: "Tasks" },
                { n: stats.documentsCreated, label: "Documents" },
                { n: stats.listsCreated + stats.foldersCreated, label: "Lists & folders" },
                { n: stats.skipped, label: "Skipped" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-secondary/30 p-3">
                  <p className="text-2xl font-bold">{s.n}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/60">{s.label}</p>
                </div>
              ))}
            </div>

            <div
              className="flex items-center gap-3"
              style={{ animation: "lx-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both 0.2s" }}
            >
              <button
                type="button"
                onClick={back}
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-xs font-medium text-muted-foreground transition-all hover:bg-secondary/40"
              >
                <FileUp className="h-3.5 w-3.5" /> Import another
              </button>
              <button
                type="button"
                onClick={onComplete}
                className="inline-flex items-center gap-2 rounded-md bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
