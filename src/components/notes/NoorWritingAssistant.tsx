"use client";

// ============================================================
// NoorWritingAssistant — inline AI writing helper for Documents.
// Select text (or place the cursor) and pick an action:
//   Continue  — draft the next sentences from the doc context
//   Improve   — rewrite the current selection
//   Summarize — condense the selection / document into a short paragraph
// Results show in a preview and can be inserted at the cursor or
// replace the selection. Runs through the existing /api/chat path.
// ============================================================

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ArrowRight, ArrowDownToLine, Replace, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { chat } from "@/lib/ai";
import { useI18n } from "@/lib/i18n";

type AssistantAction = "continue" | "improve" | "summarize";

export function NoorWritingAssistant({ editor }: { editor: any }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [hadSelection, setHadSelection] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const getSelection = (): string => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    if (from === to) return "";
    return editor.state.doc.textBetween(from, to, "\n");
  };

  const run = async (action: AssistantAction) => {
    if (!editor) return;
    setBusy(true);
    setError("");
    setResult("");
    const selection = getSelection();
    setHadSelection(!!selection);
    const docText = editor.getText().slice(0, 4000);

    const prompts: Record<AssistantAction, string> = {
      continue: `You are a writing assistant. Continue the user's document naturally from where it stops. Match the language, tone and formatting style (markdown). Reply with ONLY the continuation text — no preamble, no quotes, no commentary.\n\nDocument so far:\n"""${docText}"""`,
      improve: `You are an editing assistant. Rewrite the following passage to be clearer and better structured while preserving its meaning, language and approximate length. Reply with ONLY the improved passage — no preamble, no quotes, no commentary.\n\nPassage:\n"""${selection || docText}"""`,
      summarize: `Summarize the following text into one short, information-dense paragraph in the same language. Reply with ONLY the summary — no preamble, no quotes.\n\nText:\n"""${selection || docText}"""`,
    };

    try {
      const out = await chat(prompts[action], [], "core-1", {
        extraSystem: "You are the writing assistant inside the Orleia Documents editor. Output plain prose or markdown only.",
      });
      setResult(out.trim() || "Noor could not produce a result. Try again.");
    } catch {
      setError("Noor is unavailable right now. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const insertAtCursor = () => {
    if (!editor || !result) return;
    const { from, to, empty } = editor.state.selection;
    if (!empty && hadSelection) {
      editor.chain().focus().insertContentAt({ from, to }, result).run();
    } else {
      editor.chain().focus().insertContent(result).run();
    }
    setOpen(false);
    setResult("");
  };

  const replaceSelection = () => {
    if (!editor || !result) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().insertContentAt({ from, to }, result).run();
    } else {
      editor.chain().focus().insertContent(result).run();
    }
    setOpen(false);
    setResult("");
  };

  const actions: { id: AssistantAction; label: string; hint: string }[] = [
    { id: "continue", label: "Continue", hint: "Draft what comes next" },
    { id: "improve", label: "Improve", hint: "Rewrite the selection" },
    { id: "summarize", label: "Summarize", hint: "Condense into a paragraph" },
  ];

  return (
    <div className="relative hidden sm:block" ref={panelRef}>
      <button
        onClick={() => { setOpen(o => !o); setResult(""); setError(""); }}
        className={cn("btn-ghost p-2", open && "bg-primary-500/10 text-primary-500")}
        title="Write with Noor"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Sparkles className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-label="Noor writing assistant"
            className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-2xl p-3 z-[60]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-primary-500" /> Write with Noor
              </span>
              <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-secondary" aria-label="Close">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {actions.map((a) => (
                <button
                  key={a.id}
                  onClick={() => run(a.id)}
                  disabled={busy}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  <span>
                    <span className="block font-medium">{a.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{a.hint}</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>

            {busy && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Noor is thinking…
              </div>
            )}
            {error && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</p>}

            {result && !busy && (
              <div className="mt-3">
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background/60 px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap">
                  <span className="mb-1 inline-block text-[9px] uppercase tracking-wider text-muted-foreground/50 border border-border/50 rounded-full px-1.5 py-px">{t("assistant.aiLabel")}</span>
                  {result}
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={insertAtCursor} className="btn-primary flex-1 text-xs px-3 py-1.5 flex items-center justify-center gap-1.5">
                    <ArrowDownToLine className="h-3.5 w-3.5" /> Insert
                  </button>
                  {hadSelection && (
                    <button onClick={replaceSelection} className="btn-ghost flex-1 text-xs px-3 py-1.5 flex items-center justify-center gap-1.5 border border-border">
                      <Replace className="h-3.5 w-3.5" /> Replace
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
