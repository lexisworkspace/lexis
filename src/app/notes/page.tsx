"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Plus,
  Search,
  FileText,
  Tag,
  Pin,
  PinOff,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Link,
  Undo,
  Redo,
  Download,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  Grid3X3,
  Menu,
  Bot,
  Sparkles,
  Lightbulb,
  BarChart3,
  ListChecks,
  Heart,
  Hash,
  Loader2,
} from "lucide-react";
import { storage } from "@/lib/storage";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { cn, formatDate } from "@/lib/utils";
import { Note, NoteTag, NoteFolder } from "@/types";

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
  { id: "related", icon: Search, label: "Related Notes", desc: "Find notes with similar topics" },
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

  return (
    <div className="w-[300px] p-4 space-y-3 overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/20">
          <Sparkles className="h-3.5 w-3.5 text-primary-500" />
        </div>
        <h3 className="text-sm font-semibold">AI Tools</h3>
      </div>

      {!hasContent && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Write some content first, then use AI to analyze it.
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
                  <span className="font-medium">{action.label}</span>
                  <p className="text-[10px] text-muted-foreground/70 mt-px">{action.desc}</p>
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
          All analysis runs locally. No data leaves your device.
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
        { label: "Words", value: result.words },
        { label: "Characters", value: result.chars },
        { label: "Sentences", value: result.sentences },
        { label: "Paragraphs", value: result.paragraphs },
        { label: "Reading Time", value: `${result.readingTime} min` },
        { label: "Chars/Sentence", value: result.charsPerSentence },
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
            <span>😢 Negative</span>
            <span>😊 Positive</span>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground/70 mt-1">
            <span>{result.negativeCount} negative words</span>
            <span>{result.positiveCount} positive words</span>
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
              <p className="text-[10px] text-muted-foreground mb-1">Matched existing tags:</p>
              <div className="flex flex-wrap gap-1">
                {matchedTags.map((tag: { id: string; name: string; color: string }) => (
                  <span
                    key={tag.id}
                    className="tag text-[10px]"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: `${tag.color}40` }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {suggestedTags.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Suggested new tags:</p>
              <div className="flex flex-wrap gap-1">
                {suggestedTags.slice(0, 5).map((tag: string) => (
                  <span key={tag} className="tag text-[10px] bg-zinc-700/50 text-zinc-300 border-zinc-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {frequencies && frequencies.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Top keywords:</p>
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
            <p className="text-muted-foreground">No related notes found.</p>
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
  const [data, setData] = useState(storage.getData());
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const refresh = useCallback(() => setData({ ...storage.getData() }), []);

  const notes = data.notes
    .filter((n) => !n.archived)
    .filter((n) => {
      if (search) {
        const q = search.toLowerCase();
        const plainText = n.contentHtml ? n.contentHtml.replace(/<[^>]*>/g, "") : n.content;
        if (!n.title.toLowerCase().includes(q) && !plainText.toLowerCase().includes(q)) return false;
      }
      if (selectedFolder && n.folderId !== selectedFolder) return false;
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

  // If editing/creating a note, show full-page editor
  if (showEditor) {
    return (
      <NoteEditor
        note={editingNote}
        folders={folders}
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
        onClose={() => { setShowEditor(false); setEditingNote(null); }}
        onDelete={(id) => {
          storage.deleteNote(id);
          refresh();
          setShowEditor(false);
          setEditingNote(null);
        }}
      />
    );
  }

  return (
    <div className="relative space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex items-start justify-between relative"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight leading-none">Notes</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-xs">
            Capture your ideas, organize with tags
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-12">
          <div className="flex items-center rounded-md border border-border p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("rounded p-1.5 transition-all text-xs", viewMode === "grid" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("rounded p-1.5 transition-all text-xs", viewMode === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              <Menu className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={() => { setEditingNote(null); setShowEditor(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Note</span>
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
            placeholder="Search notes..."
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedFolder(null)}
            className={cn("btn-ghost text-xs shrink-0", !selectedFolder && "bg-primary-500/10 text-primary-500")}
          >
            All
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFolder(selectedFolder === f.id ? null : f.id)}
              className={cn("btn-ghost text-xs shrink-0", selectedFolder === f.id && "bg-primary-500/10 text-primary-500")}
            >
              {f.name}
            </button>
          ))}
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
            className={cn("tag transition-all", selectedTags.includes(tag.id) && "ring-2 ring-offset-1 ring-offset-background")}
            style={{
              backgroundColor: `${tag.color}15`,
              color: tag.color,
              borderColor: selectedTags.includes(tag.id) ? tag.color : "transparent",
            }}
          >
            {tag.name}
          </button>
        ))}
      </div>

      {/* Notes Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note, i) => (
            <NoteCard key={note.id} note={note} tags={tags} index={i} onEdit={() => { setEditingNote(note); setShowEditor(true); }} onRefresh={refresh} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note, i) => (
            <NoteListItem key={note.id} note={note} tags={tags} index={i} onEdit={() => { setEditingNote(note); setShowEditor(true); }} onRefresh={refresh} />
          ))}
        </div>
      )}

      {notes.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {search ? "No notes found" : "No notes yet"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? "Try a different search term" : "Start capturing your ideas!"}
          </p>
          {!search && (
            <button onClick={() => { setEditingNote(null); setShowEditor(true); }} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Note
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Note Card (Grid View)
// ============================================================

function NoteCard({ note, tags, index, onEdit, onRefresh }: { note: Note; tags: NoteTag[]; index: number; onEdit: () => void; onRefresh: () => void }) {
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
          <Pin className="h-3.5 w-3.5 text-zinc-400 fill-zinc-400" />
        </div>
      )}

      <div className="pt-4">
        <h3 className="font-semibold mb-1 line-clamp-1">{note.title || "Untitled"}</h3>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {plainText.slice(0, 150) || "No content"}
        </p>
      </div>

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {note.tags.map((tagId) => {
            const tag = tags.find((t) => t.id === tagId);
            return tag ? (
              <span key={tag.id} className="tag text-[10px]" style={{ backgroundColor: `${tag.color}15`, color: tag.color }}>
                {tag.name}
              </span>
            ) : null;
          })}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatDate(note.updatedAt)}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); storage.updateNote(note.id, { pinned: !note.pinned }); onRefresh(); }} className="p-1 hover:text-zinc-400">
            {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); storage.deleteNote(note.id); onRefresh(); }} className="p-1 hover:text-zinc-400">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Note List Item (List View)
// ============================================================

function NoteListItem({ note, tags, index, onEdit, onRefresh }: { note: Note; tags: NoteTag[]; index: number; onEdit: () => void; onRefresh: () => void }) {
  const plainText = note.contentHtml
    ? note.contentHtml.replace(/<[^>]*>/g, "").trim()
    : note.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.02 * index }}
      className="card p-4 flex items-start gap-3 group cursor-pointer hover:shadow-md transition-all"
      onClick={onEdit}
    >
      {note.pinned && <Pin className="h-4 w-4 text-zinc-400 fill-zinc-400 shrink-0 mt-1" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold truncate">{note.title || "Untitled"}</h3>
          {note.tags.length > 0 && (
            <div className="flex gap-1 shrink-0">
              {note.tags.slice(0, 2).map((tagId) => {
                const tag = tags.find((t) => t.id === tagId);
                return tag ? (
                  <span key={tag.id} className="tag text-[10px]" style={{ backgroundColor: `${tag.color}15`, color: tag.color }}>
                    {tag.name}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1">{plainText.slice(0, 200) || "No content"}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{formatDate(note.updatedAt)}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={(e) => { e.stopPropagation(); storage.updateNote(note.id, { pinned: !note.pinned }); onRefresh(); }} className="btn-ghost p-1">
          {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); storage.deleteNote(note.id); onRefresh(); }} className="btn-ghost p-1 hover:text-zinc-400">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================
// Rich Text Toolbar
// ============================================================

function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const ToolButton = ({ onClick, isActive, children, title }: { onClick: () => void; isActive?: boolean; children: React.ReactNode; title: string }) => (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded-lg transition-all text-xs",
        isActive ? "bg-primary-500/20 text-primary-500" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-5 bg-border" />;

  return (
    <div className="flex items-center gap-0.5 flex-wrap px-4 py-2 border-b border-border bg-muted/30 sticky top-0 z-10">
      {/* History */}
      <ToolButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
        <Undo className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
        <Redo className="h-4 w-4" />
      </ToolButton>

      <Divider />

      {/* Text Style */}
      <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Bold (Ctrl+B)">
        <Bold className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Italic (Ctrl+I)">
        <Italic className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} title="Underline (Ctrl+U)">
        <UnderlineIcon className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} title="Strikethrough">
        <Strikethrough className="h-4 w-4" />
      </ToolButton>

      <Divider />

      {/* Headings */}
      <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive("heading", { level: 1 })} title="Heading 1">
        <Heading1 className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })} title="Heading 2">
        <Heading2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive("heading", { level: 3 })} title="Heading 3">
        <Heading3 className="h-4 w-4" />
      </ToolButton>

      <Divider />

      {/* Lists */}
      <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} title="Bullet List">
        <List className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")} title="Ordered List">
        <ListOrdered className="h-4 w-4" />
      </ToolButton>

      <Divider />

      {/* Alignment */}
      <ToolButton onClick={() => editor.chain().focus().setTextAlign("left").run()} isActive={editor.isActive({ textAlign: "left" })} title="Align Left">
        <AlignLeft className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setTextAlign("center").run()} isActive={editor.isActive({ textAlign: "center" })} title="Align Center">
        <AlignCenter className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setTextAlign("right").run()} isActive={editor.isActive({ textAlign: "right" })} title="Align Right">
        <AlignRight className="h-4 w-4" />
      </ToolButton>

      <Divider />

      {/* Blocks */}
      <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive("blockquote")} title="Blockquote">
        <Quote className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive("codeBlock")} title="Code Block">
        <Code className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={addLink} isActive={editor.isActive("link")} title="Link">
        <Link className="h-4 w-4" />
      </ToolButton>
    </div>
  );
}

// ============================================================
// Full-Page Note Editor
// ============================================================

function NoteEditor({
  note,
  folders,
  tags,
  onSave,
  onClose,
  onDelete,
}: {
  note: Note | null;
  folders: NoteFolder[];
  tags: NoteTag[];
  onSave: (data: any) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(note?.title || "");
  const [folderId, setFolderId] = useState(note?.folderId || "");
  const [noteTags, setNoteTags] = useState<string[]>(note?.tags || []);
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<Record<string, any>>({});

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary-500 underline hover:text-primary-400" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Start writing..." }),
    ],
    content: note?.contentHtml || "",
    editorProps: {
      attributes: {
        class: "prose dark:prose-invert max-w-none focus:outline-none min-h-[50vh] px-4 sm:px-8 py-6 text-base leading-relaxed",
      },
    },
  });

  // Get plain text from editor for exports
  const getPlainText = () => {
    if (editor) return editor.getText();
    return note?.content || "";
  };

  const getHtml = () => {
    if (editor) return editor.getHTML();
    return note?.contentHtml || "";
  };

  const handleSave = () => {
    const html = getHtml();
    const plainText = html.replace(/<[^>]*>/g, "").trim();
    onSave({
      title: title || "Untitled",
      content: plainText,
      contentHtml: html,
      folderId: folderId || null,
      tags: noteTags,
      pinned: note?.pinned || false,
      archived: false,
      favorite: false,
    });
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
      title: title || "Untitled Note",
      description: "Exported from LEXIS",
      sections: [{ children: paragraphs }],
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
        <title>${title || "Untitled Note"}</title>
        <style>
          @page { margin: 2cm; }
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
        <h1>${title || "Untitled"}</h1>
        <div class="meta">Exported from LEXIS</div>
        <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 20pt;" />
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

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
          <button onClick={onClose} className="btn-ghost p-2 -ml-2" title="Back to notes">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-5 w-px bg-border" />
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {note ? "Editing" : "New Note"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Folder selector */}
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="bg-transparent text-xs text-muted-foreground border border-border rounded-lg px-2 py-1.5 hidden sm:block"
          >
            <option value="">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          {/* AI toggle */}
          <button onClick={() => { setShowAIPanel(!showAIPanel); setShowMeta(false); }} className={cn("btn-ghost p-2", showAIPanel && "bg-primary-500/10 text-primary-500")} title="AI Tools">
            <Bot className="h-4 w-4" />
          </button>

          {/* Meta toggle */}
          <button onClick={() => { setShowMeta(!showMeta); setShowAIPanel(false); }} className={cn("btn-ghost p-2", showMeta && "bg-secondary")} title="Tags & Properties">
            <Tag className="h-4 w-4" />
          </button>

          {/* Export menu */}
          <div className="relative">
            <button onClick={() => setShowExport(!showExport)} className="btn-ghost p-2" title="Export">
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
                    Export as PDF
                  </button>
                  <button onClick={() => { exportDocx(); setShowExport(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary transition-colors">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Export as DOCX
                  </button>
                  <button onClick={() => { copyPlainText(); setShowExport(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary transition-colors">
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                    {copied ? "Copied!" : "Copy Text"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Delete */}
          {note && (
            <button onClick={() => onDelete(note.id)} className="btn-ghost p-2 hover:text-red-500" title="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            className="btn-primary text-sm px-5 py-2"
          >
            {note ? "Save" : "Create"}
          </button>
        </div>
      </div>

      {/* Editor Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor + Meta Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Editor */}
        <div className="flex-1 overflow-y-auto">
          {/* Title Input */}
          <div className="px-4 sm:px-8 pt-6 pb-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className="w-full text-2xl sm:text-3xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/30"
            />
          </div>

          {/* TipTap Editor */}
          <EditorContent editor={editor} />
        </div>

        {/* Sidebar Panel - Properties or AI */}
        <AnimatePresence>
          {(showMeta || showAIPanel) && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-border bg-card overflow-y-auto overflow-x-hidden shrink-0"
            >
              {showMeta && (
                <div className="w-[300px] p-4 space-y-4">
                  <h3 className="text-sm font-semibold mb-4">Properties</h3>

                  {/* Folder */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Folder</label>
                    <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className="input-field text-sm">
                      <option value="">None</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tags</label>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => setNoteTags(
                            noteTags.includes(tag.id)
                              ? noteTags.filter((id) => id !== tag.id)
                              : [...noteTags, tag.id]
                          )}
                          className={cn("tag text-[11px] transition-all", noteTags.includes(tag.id) && "ring-2 ring-offset-1 ring-offset-background")}
                          style={{
                            backgroundColor: noteTags.includes(tag.id) ? `${tag.color}20` : "transparent",
                            color: tag.color,
                            borderColor: noteTags.includes(tag.id) ? tag.color : `${tag.color}40`,
                          }}
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
                      <span className="text-sm">Pinned</span>
                    </label>
                  )}

                  {/* Dates */}
                  {note && (
                    <div className="space-y-2 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Created: {formatDate(note.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated: {formatDate(note.updatedAt)}
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
