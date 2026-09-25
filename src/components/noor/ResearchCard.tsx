"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Zap,
  FileText,
  Presentation,
  ListChecks,
  Plus,
  Download,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { ResearchDeliverable, ResearchSource } from "@/lib/research";

const FORMAT_ICON = {
  brief: Zap,
  report: FileText,
  presentation: Presentation,
  actions: ListChecks,
} as const;

export function ResearchCard({
  deliverable,
  sources,
  onSendToTasks,
  onSaveAsNote,
  onExportDeck,
  onExportMarkdown,
  defaultOpen = true,
}: {
  deliverable: ResearchDeliverable;
  sources: ResearchSource[];
  onSendToTasks: () => void;
  onSaveAsNote: () => void;
  onExportDeck: () => void;
  onExportMarkdown: () => void;
  defaultOpen?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(defaultOpen);
  const [sentToTasks, setSentToTasks] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const [exportedDeck, setExportedDeck] = useState(false);
  const [exportedMd, setExportedMd] = useState(false);
  const [openSections, setOpenSections] = useState<Set<number>>(new Set(deliverable.sections.map((_, i) => i)));

  const Icon = FORMAT_ICON[deliverable.format] || FileText;
  const isActions = deliverable.format === "actions";
  const isDeck = deliverable.format === "presentation" && deliverable.deck;

  const toggleSection = (i: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-all"
      >
        <span className="p-2 rounded-xl bg-primary-500/10 text-primary-500 shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold truncate">{deliverable.title}</span>
          <span className="mb-0.5 inline-block text-[9px] uppercase tracking-wider text-muted-foreground/50 border border-border/50 rounded-full px-1.5 py-px">{t("assistant.aiLabel")}</span>
          <span className="block text-[11px] text-muted-foreground">
            {deliverable.format === "actions" ? `${deliverable.actionItems?.length || 0} action items` : `${deliverable.sections.length} sections`} · {sources.length} sources
          </span>
        </span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* TL;DR */}
          {deliverable.tldr && (
            <div className="rounded-xl bg-muted/30 border border-border/40 p-3 text-[13px] leading-relaxed text-foreground/85">
              {deliverable.tldr}
            </div>
          )}

          {/* Sections */}
          <div className="space-y-2">
            {deliverable.sections.map((s, i) => {
              const expanded = openSections.has(i);
              return (
                <div key={i} className="rounded-xl border border-border/40 overflow-hidden">
                  <button
                    onClick={() => toggleSection(i)}
                    className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-muted/20 transition-all"
                  >
                    {expanded ? (
                      <ChevronDown className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-[13px] font-medium leading-snug">{s.heading}</span>
                  </button>
                  {expanded && (
                    <div className="px-3 pb-3 pl-8 text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap">
                      {s.body}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action items */}
          {isActions && deliverable.actionItems && (
            <div className="space-y-1.5">
              {deliverable.actionItems.map((a, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl border border-border/40 px-3 py-2">
                  <span
                    className={cn(
                      "mt-1 h-2 w-2 rounded-full shrink-0",
                      a.priority === "high" ? "bg-red-500" : a.priority === "medium" ? "bg-yellow-500" : "bg-emerald-500"
                    )}
                  />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium leading-snug">{a.task}</div>
                    {a.context && <div className="text-[11px] text-muted-foreground mt-0.5">{a.context}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sources */}
          {sources.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1.5">Sources</div>
              <div className="flex flex-wrap gap-1.5">
                {sources.map((s, i) => (
                  <a
                    key={s.url + i}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    title={s.title}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary-500/40 hover:text-foreground"
                  >
                    <span className="text-[9px] opacity-50">[{i + 1}]</span>
                    <span className="max-w-[130px] truncate">{s.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Export actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {isActions && (
              <button
                onClick={() => {
                  onSendToTasks();
                  setSentToTasks(true);
                }}
                disabled={sentToTasks}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  sentToTasks ? "bg-emerald-500/10 text-emerald-600" : "border border-foreground/20 bg-transparent text-foreground/70 hover:border-foreground/40 hover:text-foreground"
                )}
              >
                {sentToTasks ? <Check className="h-3.5 w-3.5" /> : <ListChecks className="h-3.5 w-3.5" />}
                {sentToTasks ? "Added to Tasks" : "Send to Tasks"}
              </button>
            )}
            <button
              onClick={() => {
                onSaveAsNote();
                setSavedNote(true);
              }}
              disabled={savedNote}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                savedNote ? "bg-emerald-500/10 text-emerald-600" : "border border-border/60 hover:bg-muted/30"
              )}
            >
              {savedNote ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {savedNote ? "Saved" : "Save as note"}
            </button>
            {isDeck && (
              <button
                onClick={() => {
                  onExportDeck();
                  setExportedDeck(true);
                }}
                disabled={exportedDeck}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  exportedDeck ? "bg-emerald-500/10 text-emerald-600" : "border border-border/60 hover:bg-muted/30"
                )}
              >
                {exportedDeck ? <Check className="h-3.5 w-3.5" /> : <Presentation className="h-3.5 w-3.5" />}
                {exportedDeck ? "Deck created" : "Open as Deck"}
              </button>
            )}
            <button
              onClick={() => {
                onExportMarkdown();
                setExportedMd(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 hover:bg-muted/30 transition-all"
            >
              <Download className="h-3.5 w-3.5" /> .md
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
