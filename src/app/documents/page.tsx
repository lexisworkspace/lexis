"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import HighlightMark from "@tiptap/extension-highlight";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { TextStyle, Color, FontSize, FontFamily, LineHeight } from "@tiptap/extension-text-style";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { EditorToolbar, EditorStatusBar } from "@/components/notes/EditorToolbar";
import { DrawingCanvas } from "@/components/notes/DrawingCanvas";
import { HorizontalRuler, VerticalRuler, DEFAULT_MARGINS, type DocMargins } from "@/components/notes/Ruler";
import { IndentExtension } from "@/lib/notes/indent";
import { Columns } from "@/lib/notes/columns";
import { CommentMark } from "@/lib/notes/comment";
import { LexisImage } from "@/components/notes/ImageNode";
import { FindReplace } from "@/lib/notes/find-replace";
import {
  PageBreaks,
  PAGE_GAP,
  getLivePages,
  getLivePageHeight,
  PAGE_SIZES,
  setPageGeometry,
} from "@/lib/notes/page-breaks";
import {
  Plus,
  Search,
  FileText,
  Tag,
  Pin,
  PinOff,
  Trash2,

  Underline as UnderlineIcon,

  Download,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  ImagePlus,

  Bot,
  Sparkles,
  Lightbulb,
  BarChart3,
  ListChecks,
  ListTodo,
  Heart,
  Hash,
  Layers,
  Link2,
  Loader2,
  Flame,
  BookOpen,
} from "lucide-react";
import { storage } from "@/lib/storage";
import { Document, Packer, Paragraph, TextRun, Header, Footer, PageNumber, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { cn, formatDate, generateId } from "@/lib/utils";
import { Note, NoteTag, Attachment } from "@/types";
import { useI18n } from "@/lib/i18n";
import { getGraph, relatedTo, ensureWired, rebuildGraph } from "@/lib/graph/engine";
import { Highlight } from "@/components/Highlight";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import { detectTasks, DetectedTask } from "@/lib/task-detect";
import { useVoiceDictation } from "@/lib/useVoiceDictation";

// ============================================================
// AI Analysis Engine
// ============================================================

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "can", "shall", "this", "that",
  "these", "those", "it", "its", "they", "them", "their", "we", "us",
  "our", "you", "your", "he", "she", "him", "her", "his", "not",
  "no", "nor", "so", "if", "then", "than", "too", "very", "just",
  "about", "above", "after", "again", "all", "also", "any", "because",
  "been", "before", "between", "both", "each", "few", "more", "most",
  "into", "over", "such", "only", "own", "same", "some", "through",
  "while", "yet", "up", "down", "out", "off", "under", "here", "there",
  "when", "where", "why", "how", "what", "which", "who", "whom",
]);

const POSITIVE_WORDS = new Set([
  "great", "good", "amazing", "excellent", "wonderful", "fantastic", "happy",
  "love", "beautiful", "awesome", "incredible", "perfect", "best", "brilliant",
  "positive", "success", "successful", "achieved", "progress", "improve",
  "improved", "improvement", "exciting", "grateful", "thankful", "blessed",
  "proud", "confident", "inspired", "motivated", "energized", "thrilled",
  "delighted", "joyful", "peaceful", "productive", "efficient", "effective",
  "strong", "better", "win", "won", "growth", "opportunity", "solution",
  "helpful", "kind", "generous", "creative", "innovative", "breakthrough",
]);

const NEGATIVE_WORDS = new Set([
  "bad", "terrible", "awful", "horrible", "worst", "sad", "angry", "upset",
  "frustrated", "annoyed", "disappointed", "depressed", "anxious", "worried",
  "stressed", "tired", "exhausted", "overwhelmed", "difficult", "hard",
  "struggle", "failed", "failure", "problem", "issue", "broken", "wrong",
  "hate", "hateful", "ugly", "painful", "pain", "suffering", "crisis",
  "emergency", "urgent", "critical", "dangerous", "risk", "threat",
  "negative", "worse", "decline", "decrease", "lose", "lost", "loss",
  "missing", "lack", "poor", "weak", "slow", "delay", "late", "error",
  "mistake", "sorry", "regret", "guilty", "ashamed", "lonely", "alone",
]);

const ACTION_VERBS = [
  "create", "make", "build", "develop", "write", "draft", "compose",
  "call", "email", "message", "contact", "send", "submit", "file",
  "complete", "finish", "finalize", "review", "check", "verify",
  "update", "fix", "repair", "resolve", "solve", "address",
  "prepare", "organize", "plan", "schedule", "book", "reserve",
  "buy", "purchase", "order", "get", "fetch", "pick", "collect",
  "meet", "attend", "join", "participate", "discuss", "present",
  "read", "study", "learn", "research", "explore", "investigate",
  "implement", "deploy", "launch", "publish", "share", "post",
  "clean", "organize", "tidy", "pack", "setup", "configure",
];

function runAIAnalysis(
  type: string,
  text: string,
  title: string,
  currentTags: string[],
  allTags: { id: string; name: string; color: string }[]
): any {
  const plainText = text.trim();
  if (!plainText) return "No content to analyze.";

  switch (type) {
    case "summarize": {
      // Extract key sentences
      const sentences = plainText.match(/[^.!?]+[.!?]+/g) || [plainText];
      if (sentences.length <= 1) return plainText.slice(0, 300) + (plainText.length > 300 ? "..." : "");

      // Strategy: pick first sentence of each paragraph, plus sentences with key indicators
      const paragraphs = plainText.split(/\n\s*\n/);
      const keySentences: string[] = [];
      
      for (const para of paragraphs) {
        const paraSentences = para.match(/[^.!?]+[.!?]+/g) || [para];
        if (paraSentences.length > 0) {
          keySentences.push(paraSentences[0].trim());
        }
      }

      // Also pick sentences with important indicators
      for (const s of sentences) {
        const trimmed = s.trim();
        if (
          /important|key|crucial|essential|significant|notably|conclusion|summary|result|therefore|finally|ultimately/i.test(trimmed) &&
          !keySentences.includes(trimmed)
        ) {
          keySentences.push(trimmed);
        }
        if (keySentences.length >= 5) break;
      }

      const summary = keySentences.slice(0, 4).join(" ");
      return summary || "Could not generate summary.";
    }

    case "keypoints": {
      const points: string[] = [];

      // Find headings (lines that are short and don't end with punctuation)
      const lines = plainText.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Detect headings: short, no ending punctuation, often title case
        if (
          trimmed.length < 80 &&
          !trimmed.endsWith(".") &&
          !trimmed.endsWith("?") &&
          !trimmed.endsWith("!") &&
          /^[A-Z]/.test(trimmed)
        ) {
          points.push(`📌 ${trimmed}`);
        }

        // Detect list items
        if (/^[\s]*(?:[-*•]|\d+\.)\s/.test(trimmed)) {
          points.push(`• ${trimmed.replace(/^[\s]*[-*•]\s*|^[\s]*\d+\.\s*/, "")}`);
        }
      }

      if (points.length === 0) {
        // Fallback: extract sentences with numbers or key terms
        const sentences = plainText.match(/[^.!?]+[.!?]+/g) || [];
        for (const s of sentences) {
          if (/\d+|important|key|must|need|should|always|never/i.test(s)) {
            points.push(`• ${s.trim()}`);
          }
          if (points.length >= 8) break;
        }
      }

      return points.length > 0 ? points : ["No key points detected."];
    }

    case "stats": {
      const words = plainText.split(/\s+/).filter(Boolean).length;
      const chars = plainText.length;
      const sentences = (plainText.match(/[^.!?]+[.!?]+/g) || []).length ||
        plainText.split(/[.!?]+/).filter(Boolean).length || 1;
      const paragraphs = plainText.split(/\n\s*\n/).filter(Boolean).length || 1;
      const readingTimeMin = Math.max(1, Math.round(words / 200));

      return {
        words,
        chars,
        sentences,
        paragraphs,
        readingTime: readingTimeMin,
        charsPerSentence: sentences > 0 ? Math.round(chars / sentences) : chars,
      };
    }

    case "sentiment": {
      const words = plainText.toLowerCase().split(/\s+/).filter(Boolean);
      let positiveCount = 0;
      let negativeCount = 0;

      for (const word of words) {
        // Clean punctuation
        const clean = word.replace(/[^a-z]/g, "");
        if (POSITIVE_WORDS.has(clean)) positiveCount++;
        if (NEGATIVE_WORDS.has(clean)) negativeCount++;
      }

      const total = positiveCount + negativeCount;
      let score = 50; // neutral baseline
      if (total > 0) {
        score = Math.round((positiveCount / total) * 100);
      }

      const label =
        score >= 75
          ? "Very Positive"
          : score >= 60
          ? "Positive"
          : score >= 40
          ? "Neutral"
          : score >= 25
          ? "Negative"
          : "Very Negative";

      const emoji =
        score >= 75 ? "😊" : score >= 60 ? "🙂" : score >= 40 ? "😐" : score >= 25 ? "😔" : "😢";

      return { score, label, emoji, positiveCount, negativeCount };
    }

    case "suggesttags": {
      const words = plainText
        .toLowerCase()
        .split(/[^a-zA-Z]+/)
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

      const freq: Record<string, number> = {};
      for (const word of words) {
        freq[word] = (freq[word] || 0) + 1;
      }

      // Sort by frequency
      const sorted = Object.entries(freq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8);

      // Match against existing tags
      const suggestions = sorted.map(([word]) => word);
      
      // Check which existing tags match
      const matchedTags = allTags.filter((t) =>
        suggestions.some((s) => t.name.toLowerCase() === s)
      );

      return {
        suggestedTags: suggestions.filter((s) => !currentTags.includes(s)),
        matchedTags: matchedTags,
        frequencies: sorted.slice(0, 5),
      };
    }

    case "related": {
      const words = plainText
        .toLowerCase()
        .split(/[^a-zA-Z]+/)
        .filter((w) => w.length > 4 && !STOP_WORDS.has(w));

      const keywords = [...new Set(words)].slice(0, 10);
      if (keywords.length === 0) return "Not enough content to find related notes.";

      const allNotes = storage.getData().notes.filter((n) => {
        // Exclude current note by checking content length similarity
        return n.content !== plainText;
      });

      const related: { title: string; match: number }[] = [];
      for (const note of allNotes) {
        const noteLower = (note.title + " " + note.content).toLowerCase();
        const matchCount = keywords.filter((kw) => noteLower.includes(kw)).length;
        const matchPercent = Math.round((matchCount / keywords.length) * 100);
        if (matchPercent >= 30 && note.title) {
          related.push({ title: note.title, match: matchPercent });
        }
      }

      return related
        .sort((a, b) => b.match - a.match)
        .slice(0, 5);
    }

    case "actions": {
      const sentences = plainText.match(/[^.!?]+[.!?]+/g) || [];
      const actions: string[] = [];

      for (const s of sentences) {
        const trimmed = s.trim();
        const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase();

        // Check if starts with an action verb
        if (firstWord && ACTION_VERBS.includes(firstWord)) {
          actions.push(trimmed);
        }

        // Check for date/deadline indicators
        if (
          /by|due|deadline|by\s+\w+day|until|before|tomorrow|next\s+week/i.test(trimmed) &&
          !actions.includes(trimmed)
        ) {
          actions.push(trimmed);
        }

        if (actions.length >= 10) break;
      }

      return actions.length > 0 ? actions : ["No clear action items detected."];
    }

    default:
      return "Unknown analysis type.";
  }
}

// ============================================================
// AI Panel UI
// ============================================================

const AI_ACTIONS = [
  { id: "summarize", icon: Sparkles, label: "Summarize", desc: "Extract key points from your note" },
  { id: "keypoints", icon: ListChecks, label: "Key Points", desc: "Find headings, lists & important lines" },
  { id: "stats", icon: BarChart3, label: "Reading Stats", desc: "Words, reading time & structure" },
  { id: "sentiment", icon: Heart, label: "Sentiment", desc: "Analyze the tone of your writing" },
  { id: "suggesttags", icon: Hash, label: "Suggest Tags", desc: "Find relevant tags from content" },
  { id: "related", icon: Search, label: "Related Documents", desc: "Find documents with similar topics" },
  { id: "actions", icon: Lightbulb, label: "Action Items", desc: "Extract tasks & deadlines" },
];

function AIPanelContent({
  editor,
  title,
  currentTags,
  allTags,
  aiLoading,
  aiResults,
  onAnalyze,
}: {
  editor: any;
  title: string;
  currentTags: string[];
  allTags: { id: string; name: string; color: string }[];
  aiLoading: string | null;
  aiResults: Record<string, any>;
  onAnalyze: (type: string) => void;
}) {
  const hasContent = editor && editor.getText().trim().length > 0;
  const { t } = useI18n();
  const AI_KEY: Record<string, string> = {
    summarize: "summarize",
    keypoints: "keyPoints",
    stats: "readingStats",
    sentiment: "sentiment",
    suggesttags: "suggestTags",
    related: "related",
    actions: "actionItems",
  };

  return (
    <div className="w-[300px] p-4 space-y-3 overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/20">
          <Sparkles className="h-3.5 w-3.5 text-primary-500" />
        </div>
        <h3 className="text-sm font-semibold">{t("notes.aiTools")}</h3>
      </div>

      {!hasContent && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          {t("notes.writeFirst")}
        </p>
      )}

      <div className="space-y-1.5">
        {AI_ACTIONS.map((action) => {
          const Icon = action.icon;
          const isLoading = aiLoading === action.id;
          const result = aiResults[action.id];
          const hasResult = result !== undefined;

          return (
            <div key={action.id}>
              <button
                onClick={() => onAnalyze(action.id)}
                disabled={!hasContent || isLoading}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs transition-all hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed text-left"
              >
                <div className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                  hasResult ? "bg-primary-500/20" : "bg-muted"
                )}>
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-primary-500" />
                  ) : (
                    <Icon className={cn("h-3 w-3", hasResult ? "text-primary-500" : "text-muted-foreground")} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{t("notes." + (AI_KEY[action.id] || action.id))}</span>
                  <p className="text-[10px] text-muted-foreground/70 mt-px">{t("notes." + (AI_KEY[action.id] || action.id) + "Desc")}</p>
                </div>
                {hasResult && !isLoading && (
                  <Check className="h-3 w-3 text-green-500 shrink-0" />
                )}
              </button>

              {/* Result display */}
              <AnimatePresence>
                {hasResult && !isLoading && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mx-2 my-2 px-3 py-2 rounded-lg bg-muted/50 text-xs leading-relaxed">
                      <AIPanelResult type={action.id} result={result} currentTags={currentTags} allTags={allTags} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground/50 text-center">
          {t("notes.localAnalysis")}
        </p>
      </div>
    </div>
  );
}

function AIPanelResult({
  type,
  result,
  currentTags,
  allTags,
}: {
  type: string;
  result: any;
  currentTags: string[];
  allTags: { id: string; name: string; color: string }[];
}) {
  const { t } = useI18n();
  if (typeof result === "string") {
    return <p className="text-muted-foreground">{result}</p>;
  }

  switch (type) {
    case "summarize":
      return <p>{result}</p>;

    case "keypoints":
      return (
        <div className="space-y-1">
          {result.map((point: string, i: number) => (
            <p key={i} className="text-muted-foreground">{point}</p>
          ))}
        </div>
      );

    case "stats": {
      const items = [
        { label: t("notes.words"), value: result.words },
        { label: t("notes.characters"), value: result.chars },
        { label: t("notes.sentences"), value: result.sentences },
        { label: t("notes.paragraphs"), value: result.paragraphs },
        { label: t("notes.readingTime"), value: `${result.readingTime} min` },
        { label: t("notes.charsPerSentence"), value: result.charsPerSentence },
      ];
      return (
        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => (
            <div key={item.label} className="rounded-lg bg-background/50 p-2 text-center">
              <p className="text-base font-bold text-primary-500">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      );
    }

    case "sentiment": {
      const barColor =
        result.score >= 75 ? "bg-green-500" : result.score >= 60 ? "bg-emerald-400" : result.score >= 40 ? "bg-zinc-400" : result.score >= 25 ? "bg-orange-400" : "bg-red-400";
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-lg">{result.emoji}</span>
            <span className="text-sm font-semibold">{result.label}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${result.score}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={`h-full rounded-full ${barColor}`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>😢 {t("notes.negative")}</span>
            <span>😊 {t("notes.positive")}</span>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground/70 mt-1">
            <span>{result.negativeCount} {t("notes.negativeWords")}</span>
            <span>{result.positiveCount} {t("notes.positiveWords")}</span>
          </div>
        </div>
      );
    }

    case "suggesttags": {
      const { suggestedTags, matchedTags, frequencies } = result;
      return (
        <div className="space-y-2">
          {matchedTags.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">{t("notes.matchedTags")}</p>
              <div className="flex flex-wrap gap-1">
                {matchedTags.map((tag: { id: string; name: string; color: string }) => (
                  <span key={tag.id} className="tag text-[10px] bg-muted text-foreground border-border">
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {suggestedTags.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">{t("notes.suggestedTags")}</p>
              <div className="flex flex-wrap gap-1">
                {suggestedTags.slice(0, 5).map((tag: string) => (
                  <span key={tag} className="tag text-[10px] bg-zinc-700/50 text-muted-foreground border-zinc-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {frequencies && frequencies.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">{t("notes.topKeywords")}</p>
              {frequencies.map(([word, count]: [string, number]) => (
                <div key={word} className="flex items-center gap-2 text-[10px] mb-0.5">
                  <span className="flex-1 truncate text-muted-foreground">{word}</span>
                  <span className="font-mono text-muted-foreground/60">×{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "related": {
      if (typeof result === "string") {
        return <p className="text-muted-foreground">{result}</p>;
      }
      return (
        <div className="space-y-1.5">
          {result.length === 0 ? (
            <p className="text-muted-foreground">{t("notes.noRelated")}</p>
          ) : (
            result.map((note: { title: string; match: number }, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs truncate flex-1">{note.title}</span>
                <span className="text-[10px] text-muted-foreground/60 ml-2 shrink-0">{note.match}%</span>
              </div>
            ))
          )}
        </div>
      );
    }

    case "actions":
      return (
        <div className="space-y-1">
          {result.map((action: string, i: number) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-primary-500 shrink-0 mt-0.5">☐</span>
              <span className="text-xs text-muted-foreground">{action}</span>
            </div>
          ))}
        </div>
      );

    default:
      return <p className="text-muted-foreground">Unknown result type.</p>;
  }
}

export default function NotesPage() {
  const { t } = useI18n();
  const [data, setData] = useState(storage.getData());
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  const refresh = useCallback(() => setData({ ...storage.getData() }), []);
  useEffect(() => storage.subscribe(() => setData({ ...storage.getData() })), []);

  // Double-press Ctrl anywhere in the app jumps here with ?new=1, or fires
  // the lexis:new-note event when already on this page. Either way: fresh note.
  const showEditorRef = useRef(showEditor);
  showEditorRef.current = showEditor;
  const router = useRouter();
  useEffect(() => {
    const openNewNote = () => {
      if (showEditorRef.current) return;
      setEditingNote(null);
      setShowEditor(true);
    };
    window.addEventListener("lexis:new-note", openNewNote);
    const onOpenNote = (ev: Event) => {
      const id = (ev as CustomEvent<string>).detail;
      if (!id || showEditorRef.current) return;
      const target = storage.getData().notes.find((n) => n.id === id && !n.archived);
      if (target) {
        setEditingNote(target);
        setShowEditor(true);
      }
    };
    window.addEventListener("lexis:open-note", onOpenNote as EventListener);
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      openNewNote();
      // Clean the URL so a refresh doesn't spawn another note.
      router.replace("/documents", { scroll: false });
    } else if (params.get("open")) {
      // Global search deep-link: open the exact note.
      const targetId = params.get("open")!;
      const target = storage.getData().notes.find((n) => n.id === targetId && !n.archived);
      if (target && !showEditorRef.current) {
        setEditingNote(target);
        setShowEditor(true);
        router.replace("/documents", { scroll: false });
      }
    }
    return () => {
      window.removeEventListener("lexis:new-note", openNewNote);
      window.removeEventListener("lexis:open-note", onOpenNote as EventListener);
    };
  }, [router]);

  const notes = data.notes
    .filter((n) => !n.archived)
    .filter((n) => {
      if (search) {
        const q = search.toLowerCase();
        const plainText = n.contentHtml ? n.contentHtml.replace(/<[^>]*>/g, "") : n.content;
        if (!n.title.toLowerCase().includes(q) && !plainText.toLowerCase().includes(q)) return false;
      }
      if (selectedTags.length > 0 && !selectedTags.some((t) => n.tags.includes(t))) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const folders = data.noteFolders;
  const tags = data.noteTags;

  // ---- Lexis Brain: quiet workspace intelligence ----
  useEffect(() => { ensureWired(); }, []);

  // Stable base for the Brain memos (identity only changes on storage refresh).
  const allNotes = useMemo(
    () => data.notes.filter((n) => !n.archived),
    [data.notes]
  );

  // Smart Collections: cluster notes by graph connections (shared tags / links).
  const collections = useMemo(() => {
    const g = getGraph();
    const parent = new Map<string, string>();
    const find = (k: string): string => {
      let root = k;
      while (parent.get(root) !== root) root = parent.get(root)!;
      while (parent.get(k) !== root) { const p = parent.get(k)!; parent.set(k, root); k = p; }
      return root;
    };
    const noteKeys = allNotes.map((x) => "note:" + x.id);
    for (const k of noteKeys) parent.set(k, k);
    for (const k of noteKeys) {
      // Walk both directions - edges can live with our note as source OR target.
      const edges = [
        ...(g.edgesBySource.get(k) || []),
        ...(g.edgesByTarget.get(k) || []),
      ];
      for (const e of edges) {
        if (e.weight < 0.35 || !e.target.startsWith("note:") || !parent.has(e.target)) continue;
        const a = find(k);
        const b = find(e.target);
        if (a !== b) parent.set(b, a);
      }
    }
    const groups = new Map<string, string[]>();
    for (const x of allNotes) {
      const r = find("note:" + x.id);
      const arr = groups.get(r) || [];
      arr.push(x.id);
      groups.set(r, arr);
    }
    const tagName = new Map(tags.map((t2) => [t2.id, t2.name]));
    const folderName = new Map(folders.map((fo) => [fo.id, fo.name]));
    const out: { id: string; name: string; members: Set<string> }[] = [];
    for (const [, ids] of groups) {
      if (ids.length < 2) continue;
      const counts = new Map<string, number>();
      for (const id of ids) {
        const x = allNotes.find((y) => y.id === id);
        if (!x) continue;
        for (const tg of x.tags) { const nm = tagName.get(tg); if (nm) counts.set(nm, (counts.get(nm) || 0) + 1); }
        if (x.folderId) { const nm = folderName.get(x.folderId); if (nm) counts.set(nm, (counts.get(nm) || 0) + 1); }
      }
      let name = "";
      let best = 0;
      for (const [nm, c] of counts) if (c > best) { best = c; name = nm; }
      if (!name) name = "Collection";
      out.push({ id: "col-" + ids[0], name, members: new Set(ids) });
    }
    return out.sort((a, b) => b.members.size - a.members.size).slice(0, 8);
  }, [allNotes, tags, folders]);

  const collectionMembers = useMemo(() => {
    const m = new Set<string>();
    for (const c of collections) for (const id of c.members) m.add(id);
    return m;
  }, [collections]);

  // Apply the selected collection on top of the base list (declared after
  // collectionMembers so there is no temporal-dead-zone crash).
  const visibleNotes = useMemo(() => {
    if (!selectedCollection) return notes;
    return notes.filter((n) => collectionMembers.has(n.id));
  }, [notes, selectedCollection, collectionMembers]);

  // Quiet connections: linked notes for each note (from the Brain graph).
  const connections = useMemo(() => {
    const g = getGraph();
    const titleById = new Map(allNotes.map((x) => [x.id, x.title || t("notes.untitled")]));
    const out: Record<string, { id: string; title: string }[]> = {};
    for (const x of allNotes) {
      const rel = relatedTo("note:" + x.id, { types: ["note"], minWeight: 0.3, limit: 3 });
      const list = rel
        .map((r) => r.other.replace(/^note:/, ""))
        .filter((id) => id !== x.id && titleById.has(id))
        .map((id) => ({ id, title: titleById.get(id)! }));
      if (list.length) out[x.id] = list;
    }
    return out;
  }, [allNotes, t]);

  // If editing/creating a note, show full-page editor
  if (showEditor) {
    return (
      <NoteEditor
        note={editingNote}
        tags={tags}
        onSave={(noteData) => {
          if (editingNote) {
            storage.updateNote(editingNote.id, noteData);
          } else {
            storage.createNote(noteData as any);
          }
          refresh();
          setShowEditor(false);
          setEditingNote(null);
        }}
        onAutoSave={(noteData) => {
          if (editingNote) {
            storage.updateNote(editingNote.id, noteData);
          } else {
            const created = storage.createNote(noteData as any);
            setEditingNote(created);
          }
          refresh();
        }}
        onClose={() => { setShowEditor(false); setEditingNote(null); }}
        onDelete={(id) => {
          storage.deleteNote(id);
          refresh();
          setShowEditor(false);
          setEditingNote(null);
        }}
        onOpenNote={(id) => {
          const nn = data.notes.find((x) => x.id === id);
          if (nn) {
            setShowEditor(false);
            setEditingNote(nn);
            setTimeout(() => setShowEditor(true), 0);
          }
        }}
      />
    );
  }

  return (
    <div className="relative space-y-6 md:space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex items-start justify-between relative"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-none">{t("notes.title")}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xs">
            {t("notes.subtitle")}
          </p>
          <p className="mt-2 hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl</kbd>
            <span className="text-muted-foreground/50">+</span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl</kbd>
            <span>{t("notes.ctrlHint")}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-12">
          <button
            onClick={() => { setEditingNote(null); setShowEditor(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("notes.newNote")}</span>
          </button>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("notes.search")}
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => setSelectedTags(
              selectedTags.includes(tag.id)
                ? selectedTags.filter((t) => t !== tag.id)
                : [...selectedTags, tag.id]
            )}
            className={cn("tag transition-all", selectedTags.includes(tag.id) ? "bg-foreground text-background border-transparent" : "bg-muted text-foreground border-border")}
          >
            {tag.name}
          </button>
        ))}
      </div>

      {/* Smart Collections - quiet, auto-derived from the Brain */}
      {collections.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground/70">
            <Layers className="h-3.5 w-3.5" />
            {t("notes.collections")}
          </span>
          {collections.map((c) => {
            const active = selectedCollection === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCollection(active ? null : c.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all",
                  active
                    ? "border-primary-500/50 bg-primary-500/10 text-primary-500"
                    : "border-border bg-card/60 text-muted-foreground hover:border-primary-500/40 hover:text-foreground"
                )}
              >
                {c.name}
                <span className="text-[10px] text-muted-foreground/50">{c.members.size}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Notes Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleNotes.map((note, i) => (
          <NoteCard key={note.id} note={note} tags={tags} index={i} query={search} connections={connections[note.id]} onEdit={() => { setEditingNote(note); setShowEditor(true); }} onRefresh={refresh} onOpenNote={(id) => { const nn = visibleNotes.find((x) => x.id === id); if (nn) { setEditingNote(nn); setShowEditor(true); } }} />
        ))}
      </div>

      {visibleNotes.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {search ? t("notes.noNotesFound") : t("notes.noNotes")}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? t("notes.tryDifferent") : t("notes.startCapturing")}
          </p>
          {!search && (
            <button onClick={() => { setEditingNote(null); setShowEditor(true); }} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t("notes.createNote")}
            </button>
          )}
          {!search && (
            <p className="mt-4 hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground/60">
              <span>{t("notes.ctrlHintOr")}</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl</kbd>
              <span className="text-muted-foreground/50">+</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl</kbd>
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Note Card (Grid View)
// ============================================================

function NoteCard({ note, tags, index, query, onEdit, onRefresh, connections, onOpenNote }: { note: Note; tags: NoteTag[]; index: number; query?: string; connections?: { id: string; title: string }[]; onEdit: () => void; onRefresh: () => void; onOpenNote: (id: string) => void }) {
  const { t } = useI18n();
  const plainText = note.contentHtml
    ? note.contentHtml.replace(/<[^>]*>/g, "").trim()
    : note.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.03 * index }}
      className="card card-hover group relative cursor-pointer"
      onClick={onEdit}
    >
      {note.pinned && (
        <div className="absolute top-3 right-3">
          <Pin className="h-3.5 w-3.5 text-muted-foreground fill-zinc-400" />
        </div>
      )}

      <div className="pt-4">
        <h3 className="font-semibold mb-1 line-clamp-1">
          <Highlight text={note.title || t("notes.untitled")} query={query} />
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {plainText ? <Highlight text={plainText.slice(0, 150)} query={query} /> : t("notes.noContent")}
        </p>
      </div>

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {note.tags.map((tagId) => {
            const tag = tags.find((t) => t.id === tagId);
            return tag ? (
              <span key={tag.id} className="tag text-[10px] bg-muted text-foreground border-border">
                {tag.name}
              </span>
            ) : null;
          })}
        </div>
      )}

      {note.attachments && note.attachments.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 overflow-hidden">
          {note.attachments.slice(0, 3).map((a) => (
            <img key={a.id} src={a.url} alt={a.name} className="h-10 w-10 rounded-lg object-cover border border-border" />
          ))}
          {note.attachments.length > 3 && (
            <span className="text-[10px] text-muted-foreground/70">+{note.attachments.length - 3}</span>
          )}
        </div>
      )}

      {connections && connections.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 overflow-hidden">
          <Link2 className="h-3 w-3 shrink-0 text-muted-foreground/40" />
          <div className="flex min-w-0 items-center gap-1.5">
            {connections.map((c) => (
              <button
                key={c.id}
                onClick={(e) => { e.stopPropagation(); onOpenNote(c.id); }}
                className="truncate text-[11px] text-muted-foreground/70 underline decoration-dotted underline-offset-2 transition-colors hover:text-primary-500"
                title={c.title}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatDate(note.updatedAt)}</span>
        <div className="touch-reveal flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); storage.updateNote(note.id, { pinned: !note.pinned }); onRefresh(); }} className="p-1 hover:text-muted-foreground">
            {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); storage.deleteNote(note.id); onRefresh(); }} className="p-1 hover:text-muted-foreground">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Rich Text Toolbar
// ============================================================

// ============================================================
// Full-Page Note Editor
// ============================================================

// Parse Noor's task-analysis JSON, tolerating markdown fences and extra text.
function parseTaskJson(raw: string): DetectedTask[] | null {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(s.slice(start, end + 1));
    if (!obj || !Array.isArray(obj.tasks)) return null;
    const out: DetectedTask[] = [];
    for (const tk of obj.tasks) {
      if (!tk || typeof tk.text !== "string") continue;
      const text = tk.text.trim();
      if (text.length < 3) continue;
      const due = typeof tk.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(tk.dueDate) ? tk.dueDate : undefined;
      out.push({ text, dueDate: due });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

const NOOR_TASK_PROMPT =
  "Extract task-like action items from the user's note text. Rules: " +
  "1) Return ONLY things the user intends, needs, or has committed to do. " +
  "2) Ignore general thoughts, descriptions, and statements of fact. " +
  "3) Keep each task text concise but complete (preserve the important words). " +
  "4) If a due date or relative time appears (today, tonight, tomorrow, next week, Friday, by 5pm, by June 10), set dueDate to the ISO date yyyy-MM-dd computed from today; otherwise null. " +
  "Respond ONLY with valid JSON in this exact shape: {\"tasks\":[{\"text\":\"...\",\"dueDate\":\"yyyy-MM-dd\"}]}. No commentary, no markdown."

/** A single connection shown in the editor's related panel: icon + title + why. */
function ConnectionRow({
  Icon,
  title,
  reason,
  href,
  onClick,
}: {
  Icon: any;
  title: string;
  reason: string;
  href?: string;
  onClick?: () => void;
}) {
  const cls =
    "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-secondary transition-colors text-left";
  const inner = (
    <>
      <Icon className="h-3 w-3 text-muted-foreground/50 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="truncate">{title}</p>
        {reason && <p className="truncate text-[10px] text-muted-foreground/70">{reason}</p>}
      </div>
    </>
  );
  return href ? (
    <NextLink href={href} className={cls}>
      {inner}
    </NextLink>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function NoteEditor({
  note,
  tags,
  onSave,
  onAutoSave,
  onClose,
  onDelete,
  onOpenNote,
}: {
  note: Note | null;
  tags: NoteTag[];
  onSave: (data: any) => void;
  onAutoSave: (data: any) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onOpenNote: (id: string) => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(note?.title || "");
  const [noteTags, setNoteTags] = useState<string[]>(note?.tags || []);
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<Record<string, any>>({});
  const [detectedTasks, setDetectedTasks] = useState<DetectedTask[]>([]);
  const [showDrawing, setShowDrawing] = useState(false);
  const detectedTasksRefSafe = useRef<DetectedTask[]>([]);
  detectedTasksRefSafe.current = detectedTasks;
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const aiLastRunRef = useRef(0);
  const aiTextRef = useRef("");
  const [addedTaskTitles, setAddedTaskTitles] = useState<Set<string>>(new Set());
  const addingRef = useRef<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<Attachment[]>(note?.attachments || []);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [dirtyTick, setDirtyTick] = useState(0);
  const [pagesState, setPagesState] = useState({ pages: getLivePages(), pageHeight: getLivePageHeight() });
  const [margins, setMargins] = useState<DocMargins>(DEFAULT_MARGINS);
  const [zoom, setZoom] = useState(1);
  const [pageSizeKey, setPageSizeKey] = useState("a4portrait");
  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [spellCheck, setSpellCheck] = useState(true);

  // persist per-document margins + zoom so the user's ruler work survives reloads
  useEffect(() => {
    if (!note?.id) return;
    try {
      const raw = localStorage.getItem(`lexis:doc-layout:${note.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.margins) setMargins(parsed.margins);
        if (typeof parsed.zoom === "number") setZoom(parsed.zoom);
        if (parsed.pageSize) setPageSizeKey(parsed.pageSize);
        if (typeof parsed.showHeader === "boolean") setShowHeader(parsed.showHeader);
        if (typeof parsed.showFooter === "boolean") setShowFooter(parsed.showFooter);
        if (typeof parsed.spellCheck === "boolean") setSpellCheck(parsed.spellCheck);
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, [note?.id]);
  useEffect(() => {
    if (!note?.id) return;
    try {
      localStorage.setItem(
        `lexis:doc-layout:${note.id}`,
        JSON.stringify({ margins, zoom, pageSize: pageSizeKey, showHeader, showFooter, spellCheck })
      );
    } catch {
      /* storage full / unavailable */
    }
  }, [note?.id, margins, zoom, pageSizeKey, showHeader, showFooter, spellCheck]);

  // apply page size / orientation to the pagination engine
  useEffect(() => {
    const g = PAGE_SIZES[pageSizeKey] || PAGE_SIZES.a4portrait;
    setPageGeometry(g.ratio);
    window.dispatchEvent(new CustomEvent("lexis:geometry"));
  }, [pageSizeKey]);
  useEffect(() => {
    const onPages = (e: any) =>
      setPagesState({
        pages: e.detail?.pages ?? getLivePages(),
        pageHeight: e.detail?.pageHeight ?? getLivePageHeight(),
      });
    window.addEventListener("lexis:pages", onPages);
    return () => window.removeEventListener("lexis:pages", onPages);
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSavedRef = useRef("");
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      FontFamily,
      LineHeight,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary-500 underline hover:text-primary-400" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: t("notes.startWriting") }),
      HighlightMark.configure({ multicolor: true }),
      LexisImage.configure({ allowBase64: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      FindReplace,
      PageBreaks,
      IndentExtension,
      Columns,
      CommentMark,
    ],
    content: note?.contentHtml || "",
    editorProps: {
      attributes: {
        class: "lexis-editor prose max-w-none focus:outline-none",
        spellcheck: "true",
      },
    },
  });

  // Any editor transaction marks the note dirty (drives debounced autosave).
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => setDirtyTick((n) => n + 1);
    editor.on("update", onUpdate);
    return () => { editor.off("update", onUpdate); };
  }, [editor]);

  // Get plain text from editor for exports
  useEffect(() => {
    if (editor?.view?.dom) {
      (editor.view.dom as HTMLElement).spellcheck = spellCheck;
    }
  }, [spellCheck, editor]);

  // comment tooltip - click/tap to read (native title is hover-only)
  const [commentTip, setCommentTip] = useState<{ text: string; x: number; y: number } | null>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const mark = t.closest?.("mark.lexis-comment");
      if (mark) {
        const text = mark.getAttribute("data-comment") || "";
        const r = mark.getBoundingClientRect();
        setCommentTip({ text, x: r.left + r.width / 2, y: r.bottom + 8 });
      } else {
        setCommentTip(null);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const getPlainText = () => {
    if (editor) return editor.getText();
    return note?.content || "";
  };

  const getHtml = () => {
    if (editor) return editor.getHTML();
    return note?.contentHtml || "";
  };

  const buildPayload = () => {
    const html = getHtml();
    return {
      title: title || t("notes.untitled"),
      content: html.replace(/<[^>]*>/g, "").trim(),
      contentHtml: html,
      folderId: note?.folderId || null,
      tags: noteTags,
      pinned: note?.pinned || false,
      archived: false,
      favorite: false,
      attachments,
    };
  };

  const handleSave = () => {
    onSave(buildPayload());
  };

  // Images stay 100% local: data URLs, downscaled to keep storage lean.
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const downscaleImage = (dataUrl: string, maxDim = 1400, quality = 0.85): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        if (scale >= 1) { resolve(dataUrl); return; }
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

  const addAttachment = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await fileToDataUrl(file);
    const url = await downscaleImage(dataUrl, 1600);
    setAttachments((prev) => [
      ...prev,
      { id: generateId(), name: file.name || "image", type: "image", url, size: file.size, createdAt: new Date().toISOString() },
    ]);
    // Word-like: drop the image inline at the cursor, full-size & draggable.
    if (editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  // Phase 2: one-tap "Add to Tasks" from a detected task line.
  const addDetectedTask = (dt: DetectedTask) => {
    const key = dt.text.toLowerCase();
    if (addingRef.current.has(key)) return; // double-click guard
    addingRef.current = new Set(addingRef.current).add(key);

    // Dedupe: if a task with the same title already exists, link + mark instead of creating a duplicate
    const existing = storage
      .getData()
      .tasks.find((t) => t.title && t.title.toLowerCase() === key);
    if (!existing) {
      const task = storage.createTask({
        title: dt.text,
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: dt.dueDate || null,
        dueTime: null,
        tags: [],
        listId: null,
        recurring: "none",
        recurringEndDate: null,
        estimatedMinutes: null,
        completedAt: null,
      });
      if (note?.id) {
        storage.linkEntities("note:" + note.id, "task:" + task.id);
        rebuildGraph(true);
      }
    } else if (note?.id) {
      storage.linkEntities("note:" + note.id, "task:" + existing.id);
      rebuildGraph(true);
    }
    setAddedTaskTitles((prev) => new Set(prev).add(key));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const images = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    e.preventDefault();
    images.forEach(addAttachment);
  };

  const handleDrop = (e: React.DragEvent) => {
    const images = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    e.preventDefault();
    images.forEach(addAttachment);
  };

  // Export as DOCX
  const exportDocx = async () => {
    const text = getPlainText();
    const lines = text.split("\n").filter(Boolean);

    const paragraphs = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return null;

      if (trimmed.length < 60 && !trimmed.endsWith(".") && !trimmed.endsWith("?") && !trimmed.endsWith("!")) {
        return new Paragraph({
          children: [new TextRun({ text: trimmed, bold: true, size: 28 })],
          spacing: { after: 200 },
        });
      }
      return new Paragraph({
        children: [new TextRun({ text: trimmed, size: 24 })],
        spacing: { after: 120 },
      });
    }).filter((p): p is Paragraph => p !== null);

    const doc = new Document({
      title: title || t("notes.untitled"),
      sections: [
        {
          headers: showHeader
            ? { default: new Header({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: title || t("notes.untitled"), size: 18, color: "888888" })],
                  }),
                ],
              }) }
            : undefined,
          footers: showFooter
            ? { default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" })],
                  }),
                ],
              }) }
            : undefined,
          children: paragraphs,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title || "untitled"}.docx`);
  };

  // Export as PDF via browser print
  const exportPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = getHtml();
    const styledHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title || t("notes.untitled")}</title>
        <style>
          @page { margin: 1.8cm 2cm 2.2cm 2cm; @bottom-center { content: counter(page); font-size: 9pt; color: #888; } }
          .print-header {
            position: fixed; top: 0.9cm; left: 2cm; right: 2cm;
            font-size: 9pt; color: #888; text-align: center;
            border-bottom: 0.5pt solid #ddd; padding-bottom: 4pt;
          }
          body {
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #1a1a1a;
            max-width: 21cm;
            margin: 0 auto;
            padding: 20px;
          }
          h1 { font-size: 24pt; margin-bottom: 8pt; }
          h2 { font-size: 20pt; margin-bottom: 6pt; }
          h3 { font-size: 16pt; margin-bottom: 4pt; }
          p { margin-bottom: 6pt; }
          blockquote {
            border-left: 3px solid #ccc;
            margin: 10pt 0;
            padding-left: 10pt;
            color: #555;
          }
          pre {
            background: #f5f5f5;
            padding: 10pt;
            border-radius: 4pt;
            font-family: monospace;
            font-size: 10pt;
          }
          ul, ol { margin-bottom: 6pt; padding-left: 20pt; }
          .meta { font-size: 10pt; color: #888; margin-bottom: 20pt; }
        </style>
      </head>
      <body>
        ${showHeader ? `<div class="print-header">${title || t("notes.untitled")}</div>` : ""}
        ${showHeader ? "" : `<h1>${title || t("notes.untitled")}</h1>`}
        ${html}
      </body>
      </html>
    `;

    printWindow.document.write(styledHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  // Copy to clipboard
  const copyPlainText = async () => {
    const text = getPlainText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show detected tasks, auto-hide after 20 seconds
  const setDetectedTasksTimed = (tasks: DetectedTask[]) => {
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    detectTimerRef.current = null;
    setDetectedTasks(tasks);
    if (tasks.length > 0) {
      detectTimerRef.current = setTimeout(() => {
        setDetectedTasks([]);
        detectTimerRef.current = null;
      }, 20000);
    }
  };

  // Noor (AI) task detection - catches what the local regex misses.
  // Rate-limited: at most one call per 10s, and only when text changed.
  const runNoorTaskDetection = (text: string) => {
    const plain = (text || '').trim();
    if (plain.length < 20) return;
    const now = Date.now();
    if (now - aiLastRunRef.current < 10000) return; // cooldown
    if (plain === aiTextRef.current) return; // no change since last run
    aiLastRunRef.current = now;
    aiTextRef.current = plain;
    setAiAnalyzing(true);
    fetch('/api/chat', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-super-120b-a12b',
        temperature: 0.2,
        maxTokens: 600,
        messages: [
          { role: 'system', content: NOOR_TASK_PROMPT },
          { role: 'user', content: plain },
        ],
      }),
    })
      .then((res: Response) => (res.ok ? res.json() : null))
      .then((data: { content?: string } | null) => {
        if (!data || typeof data.content !== "string") return;
        const parsed = parseTaskJson(data.content);
        if (!parsed || parsed.length === 0) return;
        const merged = Array.from(
          new Map<string, DetectedTask>(
            [...detectedTasksRefSafe.current, ...parsed].map((tk) => [tk.text.toLowerCase(), tk])
          ).values()
        ).slice(0, 6);
        setDetectedTasksTimed(merged); // restarts the 20s auto-hide
      })
      .catch(() => {})
      .finally(() => setAiAnalyzing(false));
  };
  // Debounced autosave - persist silently, never close the editor.
  useEffect(() => {
    if (!editor) return;
    if (dirtyTick === 0 && note) return; // untouched existing note: skip
    const html = editor.getHTML();
    const hasContent = html.replace(/<[^>]*>/g, "").trim().length > 0 || title.trim().length > 0;
    if (!hasContent) return;
    setSaveState("saving");
    const timer = setTimeout(() => {
      const payload = JSON.stringify(buildPayload());
      if (payload === lastSavedRef.current) { setSaveState("saved"); return; }
      lastSavedRef.current = payload;
      onAutoSave(buildPayload());
      setDetectedTasksTimed(detectTasks(editor.getText()));
      runNoorTaskDetection(editor.getText());
      setSaveState("saved");
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, dirtyTick, title, noteTags, attachments]);

  // Keyboard shortcut: Ctrl+S - flush a save without leaving the editor
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        const payload = JSON.stringify(buildPayload());
        lastSavedRef.current = payload;
        onAutoSave(buildPayload());
        setDetectedTasksTimed(detectTasks(editor?.getText() || ""));
        runNoorTaskDetection(editor?.getText() || "");
        setSaveState("saved");
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="btn-ghost p-2 -ml-2" title={t("notes.backToNotes")}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-5 w-px bg-border" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("notes.untitled")}
            className="w-24 min-[420px]:w-36 sm:w-44 md:w-64 rounded-lg bg-transparent px-2 py-1 text-sm font-medium text-foreground outline-none ring-1 ring-transparent transition-all placeholder:text-muted-foreground/50 hover:ring-border/70 focus:ring-primary-500/30"
          />
          <span className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground/60 shrink-0">
            {saveState === "saving" ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> {t("notes.saving")}</>
            ) : (
              <><Check className="h-3 w-3 text-green-500" /> {t("notes.saved")}</>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Attach image (paste / drop also work) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              files.forEach(addAttachment);
              e.target.value = "";
            }}
          />
          <button onClick={() => fileInputRef.current?.click()} className="btn-ghost p-2 hidden sm:flex" title={t("notes.attachImage")}>
            <ImagePlus className="h-4 w-4" />
          </button>

          {/* AI toggle */}
          <button onClick={() => { setShowAIPanel(!showAIPanel); setShowMeta(false); setShowRelated(false); }} className={cn("btn-ghost p-2 hidden sm:flex", showAIPanel && "bg-primary-500/10 text-primary-500")} title={t("notes.aiTools")}>
            <Bot className="h-4 w-4" />
          </button>

          {/* Related toggle */}
          <button onClick={() => { setShowRelated(!showRelated); setShowMeta(false); setShowAIPanel(false); }} className={cn("btn-ghost p-2 hidden sm:flex", showRelated && "bg-primary-500/10 text-primary-500")} title={t("notes.related")}>
            <Link2 className="h-4 w-4" />
          </button>

          {/* Meta toggle */}
          <button onClick={() => { setShowMeta(!showMeta); setShowAIPanel(false); setShowRelated(false); }} className={cn("btn-ghost p-2 hidden sm:flex", showMeta && "bg-secondary")} title={t("notes.tagsProperties")}>
            <Tag className="h-4 w-4" />
          </button>

          {/* Export menu */}
          <div className="relative hidden sm:block">
            <button onClick={() => setShowExport(!showExport)} className="btn-ghost p-2" title={t("notes.export")}>
              <Download className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {showExport && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-border bg-card shadow-2xl p-1.5 z-20"
                >
                  <button onClick={() => { exportPdf(); setShowExport(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary transition-colors">
                    <Printer className="h-4 w-4 text-muted-foreground" />
                    {t("notes.exportPdf")}
                  </button>
                  <button onClick={() => { exportDocx(); setShowExport(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary transition-colors">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {t("notes.exportDocx")}
                  </button>
                  <button onClick={() => { copyPlainText(); setShowExport(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary transition-colors">
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                    {copied ? t("notes.copied") : t("notes.copyText")}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Delete */}
          {note && (
            <button onClick={() => onDelete(note.id)} className="btn-ghost p-2 hover:text-red-500" title={t("notes.delete")}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            className="btn-primary text-sm px-5 py-2"
          >
            {note ? t("notes.save") : t("notes.create")}
          </button>
        </div>
      </div>

      <DrawingCanvas open={showDrawing} onClose={() => setShowDrawing(false)} onSave={(dataUrl) => {
            if (editor) editor.chain().focus().setImage({ src: dataUrl }).run();
          }} />
          {/* Editor Toolbar */}
      <EditorToolbar
        editor={editor}
        onInsertImage={() => fileInputRef.current?.click()}
        onDraw={() => setShowDrawing(true)}
        pageSize={pageSizeKey}
        onPageSize={setPageSizeKey}
        showHeader={showHeader}
        onShowHeader={setShowHeader}
        showFooter={showFooter}
        onShowFooter={setShowFooter}
        spellCheck={spellCheck}
        onSpellCheck={setSpellCheck}
      />
      <div className="hidden md:block">
        <EditorStatusBar
          editor={editor}
          zoom={zoom}
          onZoom={(z) => setZoom(Math.min(3, Math.max(0.3, Math.round(z * 100) / 100)))}
        />
      </div>

      {/* Editor + Meta Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Editor */}
        <div className="flex-1 overflow-y-auto lexis-backdrop" onPaste={handlePaste} onDrop={handleDrop}>
          <div className="mx-auto flex justify-center">
            {/* Vertical margin ruler */}
            <div className="hidden md:block shrink-0">
              <VerticalRuler margins={margins} onMargins={setMargins} pageHeight={pagesState.pageHeight} />
            </div>
            <div className="shrink-0" style={{ width: `min(100% - 24px, ${PAGE_SIZES[pageSizeKey]?.width || 816}px)` }}>
              <div className="hidden md:block">
                <HorizontalRuler editor={editor} margins={margins} onMargins={setMargins} />
              </div>
              <div className="relative my-6" style={{ zoom: zoom }}>
                {/* A4 sheet cards behind the editor */}
                {Array.from({ length: pagesState.pages }).map((_, i) => (
                  <div
                    key={i}
                    className="lexis-page-card"
                    style={{
                      top: i === 0 ? 0 : margins.top + i * (pagesState.pageHeight + PAGE_GAP),
                      height:
                        pagesState.pageHeight +
                        (i === 0 ? margins.top : 0) +
                        (i === pagesState.pages - 1 ? margins.bottom : 0),
                      width: "100%",
                    }}
                  >
                    {showHeader && margins.top > 56 && (
                      <div
                        className="lexis-page-header"
                        style={{ marginLeft: margins.left, marginRight: margins.right }}
                      >
                        {title.trim() || t("notes.untitled")}
                      </div>
                    )}
                    {showFooter && (
                      <div className="lexis-page-footer">
                        {i + 1} / {pagesState.pages}
                      </div>
                    )}
                  </div>
                ))}
                <div
                  className="relative z-10"
                  style={{
                    paddingTop: margins.top,
                    paddingBottom: margins.bottom,
                    paddingLeft: margins.left,
                    paddingRight: margins.right,
                    minHeight: margins.top + pagesState.pageHeight + margins.bottom,
                  }}
                >

          {/* Task detection banner */}
          {(detectedTasks.length > 0 || aiAnalyzing) && (
            <div className="pb-2">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-medium text-neutral-600 mb-2 flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5" />
                  {t("notes.detectTasks")}
                </p>
                {aiAnalyzing && (
                  <p className="text-xs text-neutral-500 flex items-center gap-1.5 mb-2">
                    <Sparkles className="h-3 w-3 animate-pulse text-primary-500" />
                    {t("notes.aiAnalyzing")}
                  </p>
                )}
                <div className="space-y-1.5">
                  {detectedTasks.map((dt) => {
                    const added = addedTaskTitles.has(dt.text.toLowerCase());
                    return (
                      <div key={dt.text} className="flex items-center gap-2 text-xs">
                        <span className="flex-1 min-w-0 truncate text-neutral-600">
                          {dt.text}
                          {dt.dueDate && (
                            <span className="ml-1.5 text-neutral-400">· {formatDate(dt.dueDate)}</span>
                          )}
                        </span>
                        {added ? (
                          <span className="flex items-center gap-1 text-green-500 shrink-0">
                            <Check className="h-3 w-3" /> {t("notes.addedToTasks")}
                          </span>
                        ) : (
                          <button
                            onClick={() => addDetectedTask(dt)}
                            className="shrink-0 rounded-md border border-neutral-300 bg-white px-2 py-0.5 font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                          >
                            <Plus className="h-3 w-3 inline mr-0.5" />
                            {t("notes.addToTasks")}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

              {/* TipTap Editor */}
              <EditorContent editor={editor} />
              {commentTip && (
                <div
                  className="fixed z-[100] pointer-events-none rounded-lg bg-neutral-900 text-white text-xs px-3 py-2 shadow-xl max-w-[260px]"
                  style={{ left: commentTip.x, top: commentTip.y, transform: "translateX(-50%)" }}
                >
                  {commentTip.text}
                </div>
              )}
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Sidebar Panel - Properties or AI */}
        <AnimatePresence>
          {(showMeta || showAIPanel || showRelated) && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-border bg-card overflow-y-auto overflow-x-hidden shrink-0"
            >
              {showRelated && (
                <div className="w-[300px] p-4 space-y-4">
                  <h3 className="text-sm font-semibold mb-4">{t("notes.related")}</h3>
                  {!note?.id ? (
                    <p className="text-xs text-muted-foreground">{t("notes.relatedUnsaved")}</p>
                  ) : (() => {
                    const key = "note:" + note.id;
                    const rel = relatedTo(key, { types: ["note", "task", "habit", "journal"], minWeight: 0.15, limit: 14 });
                    const titleFor = (k: string): string => {
                      if (k.startsWith("note:")) return storage.getNote(k.slice(5))?.title || t("notes.untitled");
                      if (k.startsWith("task:")) return storage.getTask(k.slice(5))?.title || t("common.untitled");
                      if (k.startsWith("habit:")) return storage.getHabit(k.slice(6))?.name || t("common.untitled");
                      if (k.startsWith("journal:")) {
                        const j = storage.getData().journalEntries.find((x) => x.id === k.slice(8));
                        return j ? j.title || j.date : t("common.untitled");
                      }
                      return k;
                    };
                    // Mention edges carry direction in the graph (source's title
                    // appears in target's content), so reword them per side.
                    const displayReason = (e: { type: string; reason: string; source: string; target: string }): string => {
                      if (e.type === "mention") return e.source === key ? t("notes.mentionsThis") : t("notes.mentionedIn");
                      return e.reason;
                    };
                    const groups: { kind: string; label: string; Icon: any; items: { other: string; reason: string }[] }[] = [
                      { kind: "note", label: t("notes.relatedNotes"), Icon: FileText, items: [] },
                      { kind: "task", label: t("notes.relatedTasks"), Icon: ListTodo, items: [] },
                      { kind: "habit", label: t("notes.relatedHabits"), Icon: Flame, items: [] },
                      { kind: "journal", label: t("notes.relatedJournal"), Icon: BookOpen, items: [] },
                    ];
                    // Backlinks: notes whose content mentions THIS document (stored
                    // as a mention edge with this note as source). Shown in their
                    // own section, so they don't duplicate in Related documents.
                    const backlinkNotes: { other: string }[] = [];
                    for (const r of rel) {
                      const g = groups.find((x) => r.other.startsWith(x.kind + ":"));
                      if (!g) continue;
                      if (g.kind === "note" && r.edge.type === "mention" && r.edge.source === key) {
                        backlinkNotes.push({ other: r.other });
                        continue;
                      }
                      g.items.push({ other: r.other, reason: displayReason(r.edge) });
                    }
                    const groupsWith = groups.filter((g) => g.items.length > 0);
                    if (groupsWith.length === 0 && backlinkNotes.length === 0) {
                      return <p className="text-xs text-muted-foreground">{t("notes.noRelated")}</p>;
                    }
                    return (
                      <>
                        {groupsWith.map((g) => (
                          <div key={g.kind}>
                            <p className="text-xs font-medium text-muted-foreground mb-2">{g.label}</p>
                            <div className="space-y-1">
                              {g.items.map((it) => (
                                <ConnectionRow
                                  key={it.other}
                                  Icon={g.Icon}
                                  title={titleFor(it.other)}
                                  reason={it.reason}
                                  href={g.kind === "note" ? undefined : "/" + (g.kind === "journal" ? "journal" : g.kind + "s")}
                                  onClick={g.kind === "note" ? () => onOpenNote(it.other.slice(5)) : undefined}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                        {backlinkNotes.length > 0 && (
                          <div className="pt-2">
                            <p className="text-xs font-medium text-muted-foreground mb-2">{t("notes.backlinks")}</p>
                            <div className="space-y-1">
                              {backlinkNotes.map((b) => (
                                <ConnectionRow
                                  key={b.other}
                                  Icon={FileText}
                                  title={titleFor(b.other)}
                                  reason={t("notes.mentionsThis")}
                                  onClick={() => onOpenNote(b.other.slice(5))}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {showMeta && (
                <div className="w-[300px] p-4 space-y-4">
                  <h3 className="text-sm font-semibold mb-4">{t("notes.properties")}</h3>

                  {/* Tags */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("notes.tags")}</label>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => setNoteTags(
                            noteTags.includes(tag.id)
                              ? noteTags.filter((id) => id !== tag.id)
                              : [...noteTags, tag.id]
                          )}
                          className={cn("tag text-[11px] transition-all", noteTags.includes(tag.id) ? "bg-foreground text-background border-transparent" : "bg-muted text-foreground border-border")}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pin */}
                  {note && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={note.pinned}
                        onChange={(e) => storage.updateNote(note.id, { pinned: e.target.checked })}
                        className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-sm">{t("notes.pinned")}</span>
                    </label>
                  )}

                  {/* Dates */}
                  {note && (
                    <div className="space-y-2 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        {t("notes.created")} {formatDate(note.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("notes.updated")} {formatDate(note.updatedAt)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {showAIPanel && (
                <AIPanelContent
                  editor={editor}
                  title={title}
                  currentTags={noteTags}
                  allTags={tags}
                  aiLoading={aiLoading}
                  aiResults={aiResults}
                  onAnalyze={(type) => {
                    if (!editor) return;
                    setAiLoading(type);
                    
                    const text = editor.getText();
                    if (!text.trim()) {
                      setAiResults(prev => ({ ...prev, [type]: "No content to analyze." }));
                      setAiLoading(null);
                      return;
                    }

                    // Simulate quick processing for UX
                    setTimeout(() => {
                      const result = runAIAnalysis(type, text, title, noteTags, tags);
                      setAiResults(prev => ({ ...prev, [type]: result }));
                      setAiLoading(null);
                    }, 300);
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
