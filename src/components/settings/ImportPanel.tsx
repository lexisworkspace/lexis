"use client";

// ============================================================
// Settings → Import — bring your data from other tools.
// Local-first: file parsing happens in the browser, a preview
// shows exactly what will land, and only then does anything
// get written to the device workspace.
// ============================================================

import { useRef, useState } from "react";
import { FileUp, Check, Loader2, X } from "lucide-react";
import {
  parseImportFile,
  commitImport,
  type ImportPreview,
} from "@/lib/import-tools";

const SOURCE_LABEL: Record<string, string> = {
  todoist: "Todoist",
  ticktick: "TickTick",
  things: "Things",
  markdown: "Markdown checklist",
};

export function ImportPanel() {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ingest = (file: File) => {
    setImported(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setPreview(parseImportFile(file.name, text.slice(0, 2_000_000)));
    };
    reader.onerror = () =>
      setPreview({ source: null, fileName: file.name, items: [], skipped: 0, error: "Could not read that file." });
    reader.readAsText(file);
  };

  const runImport = () => {
    if (!preview) return;
    setBusy(true);
    try {
      const n = commitImport(preview);
      setImported(n);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Switching from another app? Export your tasks from it, drop the file
        here, and Orleia rebuilds them as tasks — priorities, due dates and
        labels included. Everything is parsed on this device; nothing uploads.
      </p>

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) ingest(f);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-8 text-center transition-colors ${
          dragOver ? "border-primary-500 bg-primary-500/5" : "border-border hover:border-foreground/30"
        }`}
      >
        <FileUp className="h-6 w-6 text-primary-500" />
        <p className="text-sm font-medium">Drop a CSV or markdown file here</p>
        <p className="text-xs text-muted-foreground">Todoist · TickTick · Things · any markdown checklist</p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.md,.markdown,.txt,text/csv,text/markdown,text/plain"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) ingest(f);
          e.target.value = "";
        }}
      />

      {/* Error */}
      {preview?.error && (
        <p className="text-xs text-red-500">{preview.error}</p>
      )}

      {/* Preview */}
      {preview && !preview.error && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">
              {preview.items.length} task{preview.items.length === 1 ? "" : "s"} found
              {preview.source && SOURCE_LABEL[preview.source] ? ` · ${SOURCE_LABEL[preview.source]}` : ""}
              {preview.skipped > 0 && <span className="text-muted-foreground"> · {preview.skipped} lines skipped</span>}
            </p>
            <button
              onClick={() => setPreview(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Discard preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {preview.items.map((it, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm odd:bg-secondary/40">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span className="min-w-0 flex-1 truncate">{it.title}</span>
                {it.dueDate && <span className="shrink-0 text-[11px] text-muted-foreground">{it.dueDate}</span>}
                {it.priority !== "low" && (
                  <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{it.priority}</span>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={runImport}
            disabled={busy}
            className="mt-3 w-full rounded-xl border border-border py-2.5 text-sm font-medium transition-colors hover:border-foreground/40 disabled:opacity-50"
          >
            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : `Import ${preview.items.length} task${preview.items.length === 1 ? "" : "s"}`}
          </button>
        </div>
      )}

      {/* Done */}
      {imported !== null && (
        <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" /> {imported} task{imported === 1 ? "" : "s"} imported into your Inbox.
        </p>
      )}
    </div>
  );
}
