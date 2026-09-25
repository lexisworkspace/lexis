// ============================================================
// Word-style ribbon toolbar for the documents editor.
// Groups (like the Word Home tab): Font, Paragraph, Insert,
// Editing - plus voice dictation and a status bar with zoom.
// ============================================================

"use client";

import { useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { useEditorState } from "@tiptap/react";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlighter,
  RemoveFormatting,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Terminal,
  Link,
  Unlink,
  Table2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  ImagePlus,
  Search,
  Mic,
  Square,
  Loader2,
  ChevronDown,
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Type,
  Palette,
  Text,
  IndentIncrease,
  PenTool,
  IndentDecrease,
  Rows,
  ZoomIn,
  ZoomOut,
  Columns2,
  Columns3,
  SpellCheck,
  MessageSquarePlus,
  MessageSquareX,
  PanelTop,
  PanelBottom,
  Clock3,
  Rows3,
  Home,
  LayoutTemplate,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useVoiceDictation } from "@/lib/useVoiceDictation";
import { findMatches } from "@/lib/notes/find-replace";
import { getLivePages, PAGE_SIZES } from "@/lib/notes/page-breaks";
import { INDENT_STEP } from "@/lib/notes/indent";

const BTN = "flex h-7 w-7 items-center justify-center rounded-md transition-all text-xs shrink-0";
const BTN_ON = "bg-primary-500/20 text-primary-500";
const BTN_OFF = "text-muted-foreground hover:bg-secondary hover:text-foreground";

function T({
  onClick,
  isActive,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      className={cn(BTN, isActive ? BTN_ON : BTN_OFF)}
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const Divider = () => <div className="w-px self-stretch my-1.5 bg-border mx-1 shrink-0" />;

function ToolGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1">
      <div className="flex items-center gap-0.5 flex-wrap justify-center">{children}</div>
      <span className="hidden sm:block text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground/50 leading-none">
        {label}
      </span>
    </div>
  );
}

function Dropdown({
  trigger,
  children,
  align = "left",
  className,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <div
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        {trigger}
      </div>
      <div
        role="menu"
        inert={!open}
        className={cn(
          "absolute top-full mt-1 z-50 max-h-[55vh] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card shadow-2xl p-1.5 transition-all duration-150",
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none",
          align === "right" ? "right-0" : "left-0",
          className || "min-w-[180px]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function DropdownItem({
  active,
  label,
  onClick,
  icon,
  style,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={style}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
        active ? "bg-primary-500/15 text-primary-500 font-medium" : "text-foreground hover:bg-secondary"
      )}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {active && <Check className="h-3.5 w-3.5" />}
    </button>
  );
}

const TEXT_COLORS = [
  { name: "Default", value: null },
  { name: "Black", value: "#111827" },
  { name: "Gray", value: "#6b7280" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Amber", value: "#d97706" },
  { name: "Green", value: "#16a34a" },
  { name: "Teal", value: "#0d9488" },
  { name: "Blue", value: "#2563eb" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Purple", value: "#9333ea" },
  { name: "Pink", value: "#db2777" },
];

const HIGHLIGHTS = [
  { name: "None", value: null },
  { name: "Yellow", value: "#fde047" },
  { name: "Green", value: "#86efac" },
  { name: "Blue", value: "#93c5fd" },
  { name: "Pink", value: "#f9a8d4" },
  { name: "Orange", value: "#fdba74" },
  { name: "Red", value: "#fca5a5" },
  { name: "Purple", value: "#d8b4fe" },
  { name: "Cyan", value: "#67e8f9" },
];

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "44px"];

const FONTS = [
  "Calibri",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Trebuchet MS",
  "Courier New",
  "Palatino Linotype",
  "Garamond",
  "Comic Sans MS",
];

const LINE_HEIGHTS = ["1", "1.15", "1.5", "2", "2.5", "3"];

// ------------------------------------------------------------
// Find & Replace bar
// ------------------------------------------------------------
function FindReplaceBar({ editor, onClose }: { editor: any; onClose: () => void }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [idx, setIdx] = useState(-1);
  const [total, setTotal] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<any>(null);

  const recompute = useCallback(
    (force = false) => {
      const doc = editor.state.doc;
      if (!force && doc === docRef.current) return;
      docRef.current = doc;
      const matches = findMatches(doc, query, caseSensitive);
      setTotal(matches.length);
      setIdx(matches.length ? 0 : -1);
      (editor.commands as any).setFindState({
        query,
        replaceText,
        caseSensitive,
        matches,
        index: matches.length ? 0 : -1,
      });
    },
    [editor, query, replaceText, caseSensitive]
  );

  useEffect(() => {
    recompute(true);
    const onUpdate = () => recompute(false);
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
      (editor.commands as any).setFindState({ query: "", replaceText: "", caseSensitive: false, matches: [], index: -1 });
    };
  }, [recompute, editor]);

  useEffect(() => {
    findInputRef.current?.focus();
  }, []);

  const go = (dir: 1 | -1) => {
    if (total === 0) return;
    const next = (idx + dir + total) % total;
    (editor.commands as any).goToMatch(next);
    setIdx(next);
  };

  const replaceOne = () => {
    if (total === 0) return;
    (editor.commands as any).replaceCurrent(replaceText);
    recompute(false);
  };

  const replaceAllFn = () => {
    (editor.commands as any).replaceAllMatches(query, replaceText, caseSensitive);
    setTotal(0);
    setIdx(-1);
    recompute(false);
  };

  const inputCls =
    "h-7 w-40 rounded-lg border border-border bg-muted/40 px-2.5 text-xs text-foreground outline-none focus:border-primary-500/50 placeholder:text-muted-foreground/50";

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/20 flex-wrap">
      <div className="flex items-center gap-1.5">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          ref={findInputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go(e.shiftKey ? -1 : 1);
            if (e.key === "Escape") onClose();
          }}
          placeholder={t("notes.findPlaceholder")}
          className={inputCls}
        />
        <button
          className={cn(BTN, caseSensitive ? BTN_ON : BTN_OFF, "font-mono text-[10px] font-bold")}
          title="Aa"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setCaseSensitive((c) => !c)}
        >
          Aa
        </button>
        <span className="text-[11px] text-muted-foreground tabular-nums w-14 text-center">
          {total === 0 ? t("notes.noResults") : `${idx + 1} / ${total}`}
        </span>
        <T onClick={() => go(-1)} title={t("notes.prevMatch")}>
          <ArrowUp className="h-3.5 w-3.5" />
        </T>
        <T onClick={() => go(1)} title={t("notes.nextMatch")}>
          <ArrowDown className="h-3.5 w-3.5" />
        </T>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
          placeholder={t("notes.replacePlaceholder")}
          className={inputCls}
        />
        <button className="btn-ghost h-7 px-2.5 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={replaceOne}>
          {t("notes.replace")}
        </button>
        <button className="btn-ghost h-7 px-2.5 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={replaceAllFn}>
          {t("notes.replaceAll")}
        </button>
      </div>
      <button className={cn(BTN, BTN_OFF, "ml-auto")} onClick={onClose} title="Close">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// Main ribbon
// ------------------------------------------------------------
export function EditorToolbar({
  editor,
  onInsertImage,
  onDraw,
  pageSize = "a4portrait",
  onPageSize,
  showHeader = true,
  onShowHeader,
  showFooter = true,
  onShowFooter,
  spellCheck = true,
  onSpellCheck,
}: any) {
  const { t, lang } = useI18n();
  const [showFind, setShowFind] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [tab, setTab] = useState("home");
  const [lastFs, setLastFs] = useState<string | null>(null);
  const [lastFf, setLastFf] = useState<string | null>(null);
  const [lastLh, setLastLh] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowFind(true);
      }
      if (e.key === "Escape") setShowFind(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const {
    supported: voiceSupported,
    listening: voiceListening,
    processing: voiceProcessing,
    duration: voiceDuration,
    start: startVoice,
    stop: stopVoice,
    formatDuration,
  } = useVoiceDictation({
    lang,
    onFinal: (text) => {
      if (!text.trim()) return;
      editor.chain().focus().insertContent(text.trim() + " ").run();
    },
  });

  const s = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor)
        return {
          bold: false, italic: false, underline: false, strike: false, code: false,
          highlight: false, bulletList: false, orderedList: false, taskList: false,
          blockquote: false, codeBlock: false, link: false, heading: 0, align: "left",
          color: null, hl: null, fs: null, ff: null, lh: null, indent: 0, inTable: false,
          inComment: false, cols: 0,
        };
      let heading = 0;
      for (let l = 1; l <= 3; l++) if (editor.isActive("heading", { level: l })) heading = l;
      const align = editor.isActive({ textAlign: "right" })
        ? "right"
        : editor.isActive({ textAlign: "center" })
          ? "center"
          : "left";
      const block = editor.state.selection.$from?.parent?.attrs || {};
      return {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        strike: editor.isActive("strike"),
        code: editor.isActive("code"),
        highlight: editor.isActive("highlight"),
        bulletList: editor.isActive("bulletList"),
        orderedList: editor.isActive("orderedList"),
        taskList: editor.isActive("taskList"),
        blockquote: editor.isActive("blockquote"),
        codeBlock: editor.isActive("codeBlock"),
        link: editor.isActive("link"),
        heading,
        align,
        color: editor.getAttributes("color").color || null,
        hl: editor.getAttributes("highlight").color || null,
        fs: editor.getAttributes("textStyle").fontSize || null,
        ff: editor.getAttributes("textStyle").fontFamily || null,
        lh: block.lineHeight || null,
        indent: block.indent || 0,
        inTable: editor.isActive("table"),
        inComment: editor.isActive("comment"),
        cols: editor.isActive("columns") ? editor.getAttributes("columns").count || 2 : 0,
      };
    },
  });

  useEffect(() => {
    if (s.fs) setLastFs(s.fs);
  }, [s.fs]);
  useEffect(() => {
    if (s.ff) setLastFf(s.ff);
  }, [s.ff]);
  useEffect(() => {
    if (s.lh) setLastLh(s.lh);
  }, [s.lh]);

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt(t("notes.enterUrl"));
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const styleLabel =
    s.heading === 1 ? t("notes.heading1") : s.heading === 2 ? t("notes.heading2") : s.heading === 3 ? t("notes.heading3") : t("notes.paragraph");
  const StyleIcon = s.heading === 1 ? Heading1 : s.heading === 2 ? Heading2 : s.heading === 3 ? Heading3 : Pilcrow;

  const setIndent = (dir: 1 | -1) =>
    (editor.commands as any).setBlockIndent(Math.max(0, s.indent + dir * INDENT_STEP));

  const MicControl = (
    <div className="flex items-center gap-0.5 self-center">
      {voiceListening || voiceProcessing ? (
        <div className="flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1 ml-1">
          {voiceProcessing ? (
            <Loader2 className="h-4 w-4 text-red-500 animate-spin" />
          ) : (
            <Mic className="h-4 w-4 text-red-500 animate-pulse" />
          )}
          {voiceListening && (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatDuration(voiceDuration)}</span>
          )}
          <button
            onClick={stopVoice}
            aria-label={t("assistant.stop")}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white transition-transform duration-150 active:scale-90"
          >
            <Square className="h-2.5 w-2.5 fill-current" />
          </button>
        </div>
      ) : (
        <T onClick={startVoice} isActive={voiceListening} title={voiceSupported ? t("assistant.tapToSpeak") : t("assistant.voiceUnsupported")}>
          <Mic className="h-4 w-4" />
        </T>
      )}
    </div>
  );

  return (
    <div className="orleia-editor-toolbar relative z-50 mx-2 sm:mx-3 md:mx-4 mb-3 rounded-2xl border border-border bg-card/80 backdrop-blur">
      {showFind && <FindReplaceBar editor={editor} onClose={() => setShowFind(false)} />}

      {/* Mobile compact toolbar - essentials only */}
      <div className="flex md:hidden flex-wrap items-center gap-1 px-2 py-1.5">
        <T onClick={() => editor.chain().focus().undo().run()} title={t("notes.undo")}><Undo2 className="h-4 w-4" /></T>
        <T onClick={() => editor.chain().focus().redo().run()} title={t("notes.redo")}><Redo2 className="h-4 w-4" /></T>
        <Divider />
        <Dropdown
          trigger={
            <button className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title={t("notes.fontFamily")} onMouseDown={(e) => e.preventDefault()}>
              <Text className="h-3.5 w-3.5" />
              <span className="max-w-[56px] truncate">{s.ff || lastFf || "Calibri"}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          }
        >
          <DropdownItem active={!s.ff} label="Default" onClick={() => (editor.chain() as any).focus().unsetFontFamily().run()} />
          {FONTS.map((f) => (
            <DropdownItem key={f} active={s.ff === f} label={f} style={{ fontFamily: f }} onClick={() => (editor.chain() as any).focus().setFontFamily(f).run()} />
          ))}
        </Dropdown>
        <Dropdown
          trigger={
            <button className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title={t("notes.fontSize")} onMouseDown={(e) => e.preventDefault()}>
              <Type className="h-3.5 w-3.5" />
              <span className="tabular-nums">{s.fs ? s.fs.replace("px", "") : lastFs ? lastFs.replace("px", "") : "16"}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          }
        >
          <DropdownItem active={!s.fs} label="Default" onClick={() => (editor.commands as any).unsetFontSize().run()} />
          {FONT_SIZES.map((fs) => (
            <DropdownItem key={fs} active={s.fs === fs} label={fs} onClick={() => (editor.commands as any).setFontSize(fs)} />
          ))}
        </Dropdown>
        <Divider />
        <T onClick={() => editor.chain().focus().toggleBold().run()} isActive={s.bold} title={t("notes.bold")}><Bold className="h-4 w-4" /></T>
        <T onClick={() => editor.chain().focus().toggleItalic().run()} isActive={s.italic} title={t("notes.italic")}><Italic className="h-4 w-4" /></T>
        <T onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={s.underline} title={t("notes.underline")}><Underline className="h-4 w-4" /></T>
        <T onClick={() => editor.chain().focus().toggleStrike().run()} isActive={s.strike} title={t("notes.strikethrough")}><Strikethrough className="h-4 w-4" /></T>
        <Divider />
        <T onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={s.bulletList} title={t("notes.bulletList")}><List className="h-4 w-4" /></T>
        <T onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={s.orderedList} title={t("notes.orderedList")}><ListOrdered className="h-4 w-4" /></T>
        <Divider />
        <T onClick={onDraw} title="Draw"><PenTool className="h-4 w-4" /></T>
        <div className="ml-auto flex items-center gap-0.5 pl-2">{MicControl}</div>
      </div>

      {/* Desktop ribbon with tabs */}
      <div className="hidden md:block">
        <div className="flex items-center gap-1 px-2 pt-2 pb-1.5 border-b border-border/70">
          {[
            { id: "home", label: t("notes.tabHome"), Icon: Home },
            { id: "insert", label: t("notes.tabInsert"), Icon: ImagePlus },
            { id: "layout", label: t("notes.tabLayout"), Icon: LayoutTemplate },
            { id: "review", label: t("notes.tabReview"), Icon: Search },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as any)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                tab === id ? "bg-primary-500/15 text-primary-500" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-0.5">{MicControl}</div>
        </div>
        <div className="flex items-stretch gap-0.5 flex-wrap px-2 py-2">
          {tab === "home" && (
            <>
        {/* History */}
        <div className="flex items-center gap-0.5 self-center">
          <T onClick={() => editor.chain().focus().undo().run()} title={t("notes.undo")}>
            <Undo2 className="h-4 w-4" />
          </T>
          <T onClick={() => editor.chain().focus().redo().run()} title={t("notes.redo")}>
            <Redo2 className="h-4 w-4" />
          </T>
        </div>
        <Divider />

        {/* Font */}
        <ToolGroup label={t("notes.groupFont")}>
          <Dropdown
            trigger={
              <button className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title={t("notes.paragraph")} onMouseDown={(e) => e.preventDefault()}>
                <StyleIcon className="h-3.5 w-3.5" />
                <span className="max-w-[70px] truncate hidden lg:inline">{styleLabel}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            }
          >
            <DropdownItem active={s.heading === 0} icon={<Pilcrow className="h-3.5 w-3.5" />} label={t("notes.paragraph")} onClick={() => editor.chain().focus().setParagraph().run()} />
            <DropdownItem active={s.heading === 1} icon={<Heading1 className="h-3.5 w-3.5" />} label={t("notes.heading1")} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
            <DropdownItem active={s.heading === 2} icon={<Heading2 className="h-3.5 w-3.5" />} label={t("notes.heading2")} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
            <DropdownItem active={s.heading === 3} icon={<Heading3 className="h-3.5 w-3.5" />} label={t("notes.heading3")} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
          </Dropdown>

          <Dropdown
            trigger={
              <button className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title={t("notes.fontFamily")} onMouseDown={(e) => e.preventDefault()}>
                <Text className="h-3.5 w-3.5" />
                <span className="max-w-[64px] truncate">{s.ff || lastFf || "Calibri"}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            }
          >
            <DropdownItem active={!s.ff} label="Default" onClick={() => (editor.chain() as any).focus().unsetFontFamily().run()} />
            {FONTS.map((f) => (
              <DropdownItem key={f} active={s.ff === f} label={f} style={{ fontFamily: f }} onClick={() => (editor.chain() as any).focus().setFontFamily(f).run()} />
            ))}
          </Dropdown>

          <Dropdown
            trigger={
              <button className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title={t("notes.fontSize")} onMouseDown={(e) => e.preventDefault()}>
                <Type className="h-3.5 w-3.5" />
                <span className="tabular-nums">{s.fs ? s.fs.replace("px", "") : lastFs ? lastFs.replace("px", "") : "16"}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            }
          >
            <DropdownItem active={!s.fs} label="Default" onClick={() => (editor.commands as any).unsetFontSize().run()} />
            {FONT_SIZES.map((fs) => (
              <DropdownItem key={fs} active={s.fs === fs} label={fs} onClick={() => (editor.commands as any).setFontSize(fs)} />
            ))}
          </Dropdown>

          <T onClick={() => editor.chain().focus().toggleBold().run()} isActive={s.bold} title={t("notes.bold")}>
            <Bold className="h-4 w-4" />
          </T>
          <T onClick={() => editor.chain().focus().toggleItalic().run()} isActive={s.italic} title={t("notes.italic")}>
            <Italic className="h-4 w-4" />
          </T>
          <T onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={s.underline} title={t("notes.underline")}>
            <Underline className="h-4 w-4" />
          </T>
          <T onClick={() => editor.chain().focus().toggleStrike().run()} isActive={s.strike} title={t("notes.strikethrough")}>
            <Strikethrough className="h-4 w-4" />
          </T>
          <T onClick={() => editor.chain().focus().toggleCode().run()} isActive={s.code} title={t("notes.inlineCode")}>
            <Code className="h-4 w-4" />
          </T>

          <Dropdown
            trigger={
              <button className={cn(BTN, "relative", s.color ? BTN_ON : BTN_OFF)} title={t("notes.textColor")} onMouseDown={(e) => e.preventDefault()}>
                <Palette className="h-4 w-4" />
                <span className="absolute bottom-1 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full" style={{ background: s.color || "currentColor" }} />
              </button>
            }
            className="w-44"
          >
            <div className="grid grid-cols-4 gap-1 p-1">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.name}
                  title={c.name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (c.value) (editor.chain() as any).focus().setColor(c.value).run();
                    else (editor.chain() as any).focus().unsetColor().run();
                  }}
                  className="flex h-8 items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors"
                >
                  <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: c.value || "#111827" }} />
                </button>
              ))}
            </div>
          </Dropdown>

          <Dropdown
            trigger={
              <button className={cn(BTN, "relative", s.hl ? BTN_ON : BTN_OFF)} title={t("notes.highlightColor")} onMouseDown={(e) => e.preventDefault()}>
                <Highlighter className="h-4 w-4" />
                {s.hl && <span className="absolute bottom-1 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full" style={{ background: s.hl }} />}
              </button>
            }
            className="w-44"
          >
            <div className="grid grid-cols-4 gap-1 p-1">
              {HIGHLIGHTS.map((c) => (
                <button
                  key={c.name}
                  title={c.name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (c.value) editor.chain().focus().toggleHighlight({ color: c.value }).run();
                    else editor.chain().focus().unsetHighlight().run();
                  }}
                  className="flex h-8 items-center justify-center rounded-lg border border-border hover:bg-secondary transition-colors"
                >
                  <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: c.value || "transparent" }} />
                </button>
              ))}
            </div>
          </Dropdown>
          <T onClick={() => editor.chain().focus().unsetAllMarks().run()} title={t("notes.clearFormat")}>
            <RemoveFormatting className="h-4 w-4" />
          </T>
        </ToolGroup>
        <Divider />

        {/* Paragraph */}
        <ToolGroup label={t("notes.groupParagraph")}>
          <T onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={s.bulletList} title={t("notes.bulletList")}>
            <List className="h-4 w-4" />
          </T>
          <T onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={s.orderedList} title={t("notes.orderedList")}>
            <ListOrdered className="h-4 w-4" />
          </T>
          <T onClick={() => (editor.chain() as any).focus().toggleTaskList().run()} isActive={s.taskList} title={t("notes.taskList")}>
            <ListTodo className="h-4 w-4" />
          </T>

          <T onClick={() => editor.chain().focus().setTextAlign("left").run()} isActive={s.align === "left"} title={t("notes.alignLeft")}>
            <AlignLeft className="h-4 w-4" />
          </T>
          <T onClick={() => editor.chain().focus().setTextAlign("center").run()} isActive={s.align === "center"} title={t("notes.alignCenter")}>
            <AlignCenter className="h-4 w-4" />
          </T>
          <T onClick={() => editor.chain().focus().setTextAlign("right").run()} isActive={s.align === "right"} title={t("notes.alignRight")}>
            <AlignRight className="h-4 w-4" />
          </T>

          <T onClick={() => setIndent(-1)} title={t("notes.decreaseIndent")}>
            <IndentDecrease className="h-4 w-4" />
          </T>
          <T onClick={() => setIndent(1)} title={t("notes.increaseIndent")}>
            <IndentIncrease className="h-4 w-4" />
          </T>

          <Dropdown
            trigger={
              <button className={cn("flex h-7 items-center gap-1 rounded-md px-2 text-xs transition-all", s.lh ? BTN_ON : BTN_OFF)} title={t("notes.lineSpacing")} onMouseDown={(e) => e.preventDefault()}>
                <Rows className="h-4 w-4" />
                <span className="tabular-nums">{s.lh || lastLh || ""}</span>
              </button>
            }
          >
            <DropdownItem active={!s.lh} label="Default" onClick={() => (editor.chain() as any).focus().unsetLineHeight().run()} />
            {LINE_HEIGHTS.map((lh) => (
              <DropdownItem key={lh} active={s.lh === lh} label={lh} onClick={() => (editor.chain() as any).focus().setLineHeight(lh).run()} />
            ))}
          </Dropdown>

          <T onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={s.blockquote} title={t("notes.blockquote")}>
            <Quote className="h-4 w-4" />
          </T>
          <T onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={s.codeBlock} title={t("notes.codeBlock")}>
            <Terminal className="h-4 w-4" />
          </T>
        </ToolGroup>
            </>
          )}
          {tab === "insert" && (
            <>
        {/* Insert */}
        <ToolGroup label={t("notes.groupInsert")}>
          <T onClick={onDraw} title="Draw">
            <PenTool className="h-4 w-4" />
          </T>
          <T onClick={onInsertImage} title={t("notes.attachImage")}>
            <ImagePlus className="h-4 w-4" />
          </T>
          <Dropdown
            trigger={
              <button className={cn(BTN, s.inTable ? BTN_ON : BTN_OFF)} title={t("notes.insertTable")} onMouseDown={(e) => e.preventDefault()}>
                <Table2 className="h-4 w-4" />
              </button>
            }
            className="w-52"
          >
            {!s.inTable ? (
              <DropdownItem icon={<Table2 className="h-3.5 w-3.5" />} label={t("notes.insertTable")} onClick={() => (editor.chain() as any).focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
            ) : (
              <>
                <DropdownItem label={t("notes.addRowAfter")} onClick={() => (editor.chain() as any).focus().addRowAfter().run()} />
                <DropdownItem label={t("notes.addColAfter")} onClick={() => (editor.chain() as any).focus().addColumnAfter().run()} />
                <div className="my-1 h-px bg-border" />
                <DropdownItem label={t("notes.deleteRow")} onClick={() => (editor.chain() as any).focus().deleteRow().run()} />
                <DropdownItem label={t("notes.deleteCol")} onClick={() => (editor.chain() as any).focus().deleteColumn().run()} />
                <div className="my-1 h-px bg-border" />
                <DropdownItem label={t("notes.deleteTable")} onClick={() => (editor.chain() as any).focus().deleteTable().run()} />
              </>
            )}
          </Dropdown>
          <T onClick={addLink} isActive={s.link} title={t("notes.link")}>
            <Link className="h-4 w-4" />
          </T>
          {s.link && (
            <T onClick={() => editor.chain().focus().unsetLink().run()} title={t("notes.unlink")}>
              <Unlink className="h-4 w-4" />
            </T>
          )}
          <T onClick={() => editor.chain().focus().setHorizontalRule().run()} title={t("notes.horizontalRule")}>
            <Minus className="h-4 w-4" />
          </T>
        </ToolGroup>
            </>
          )}
          {tab === "review" && (
            <>
        {/* Editing */}
        <ToolGroup label={t("notes.groupEditing")}>
          <T onClick={() => setShowFind(true)} isActive={showFind} title={t("notes.findReplace")}>
            <Search className="h-4 w-4" />
          </T>
          <T onClick={() => onSpellCheck?.(!spellCheck)} isActive={spellCheck} title={t("notes.spellCheck")}>
            <SpellCheck className="h-4 w-4" />
          </T>
          <Dropdown
            trigger={
              <button className={cn(BTN, s.inComment ? BTN_ON : BTN_OFF)} title={t("notes.addComment")} onMouseDown={(e) => e.preventDefault()}>
                <MessageSquarePlus className="h-4 w-4" />
              </button>
            }
            className="w-72"
          >
            {s.inComment ? (
              <DropdownItem
                icon={<MessageSquareX className="h-3.5 w-3.5" />}
                label={t("notes.removeComment")}
                onClick={() => (editor.chain() as any).focus().unsetComment().run()}
              />
            ) : (
              <div className="p-2">
                <input
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && commentDraft.trim()) {
                      (editor.chain() as any).focus().setComment(commentDraft.trim()).run();
                      setCommentDraft("");
                    }
                    if (e.key === "Escape") setCommentDraft("");
                  }}
                  placeholder={t("notes.commentPlaceholder")}
                  className="h-8 w-full rounded-lg border border-border bg-muted/40 px-2.5 text-xs text-foreground outline-none focus:border-primary-500/50 placeholder:text-muted-foreground/50"
                />
                <button
                  disabled={!commentDraft.trim()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (!commentDraft.trim()) return;
                    (editor.chain() as any).focus().setComment(commentDraft.trim()).run();
                    setCommentDraft("");
                  }}
                  className="btn-primary mt-1.5 h-7 w-full text-xs"
                >
                  {t("notes.addComment")}
                </button>
              </div>
            )}
          </Dropdown>
        </ToolGroup>
            </>
          )}
          {tab === "layout" && (
            <>
        {/* Page Layout */}
        <ToolGroup label={t("notes.groupPage")}>
          <Dropdown
            trigger={
              <button className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title={t("notes.pageSize")} onMouseDown={(e) => e.preventDefault()}>
                <Rows3 className="h-3.5 w-3.5" />
                <span className="max-w-[72px] truncate hidden lg:inline">{PAGE_SIZES[pageSize]?.label || "A4"}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            }
          >
            {Object.entries(PAGE_SIZES).map(([key, ps]) => (
              <DropdownItem
                key={key}
                active={pageSize === key}
                label={`${ps.label} · ${ps.ratio > 1 ? t("notes.portrait") : t("notes.landscape")}`}
                onClick={() => onPageSize?.(key)}
              />
            ))}
          </Dropdown>
          <Dropdown
            trigger={
              <button className={cn("flex h-7 items-center gap-1 rounded-md px-2 text-xs transition-all", s.cols ? BTN_ON : BTN_OFF)} title={t("notes.columns")} onMouseDown={(e) => e.preventDefault()}>
                {s.cols === 3 ? <Columns3 className="h-4 w-4" /> : <Columns2 className="h-4 w-4" />}
                {s.cols > 0 && <span className="tabular-nums">{s.cols}</span>}
              </button>
            }
          >
            <DropdownItem active={s.cols === 0} icon={<Columns2 className="h-3.5 w-3.5" />} label={t("notes.oneColumn")} onClick={() => (editor.chain() as any).focus().unsetColumns().run()} />
            <DropdownItem active={s.cols === 2} icon={<Columns2 className="h-3.5 w-3.5" />} label={t("notes.twoColumns")} onClick={() => (editor.chain() as any).focus().setColumns(2).run()} />
            <DropdownItem active={s.cols === 3} icon={<Columns3 className="h-3.5 w-3.5" />} label={t("notes.threeColumns")} onClick={() => (editor.chain() as any).focus().setColumns(3).run()} />
          </Dropdown>
          <T onClick={() => onShowHeader?.(!showHeader)} isActive={showHeader} title={t("notes.showHeader")}>
            <PanelTop className="h-4 w-4" />
          </T>
          <T onClick={() => onShowFooter?.(!showFooter)} isActive={showFooter} title={t("notes.showFooter")}>
            <PanelBottom className="h-4 w-4" />
          </T>
        </ToolGroup>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Status bar (word count, pages, zoom)
// ------------------------------------------------------------
export function EditorStatusBar({
  editor,
  zoom,
  onZoom,
}: {
  editor: any;
  zoom: number;
  onZoom: (z: number) => void;
}) {
  const { t } = useI18n();
  const [pages, setPages] = useState(getLivePages());
  useEffect(() => {
    const onPages = (e: any) => setPages(e.detail?.pages ?? getLivePages());
    window.addEventListener("orleia:pages", onPages);
    return () => window.removeEventListener("orleia:pages", onPages);
  }, []);
  const count = useEditorState({
    editor,
    selector: ({ editor }) => {
      const text = editor ? editor.getText() : "";
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const paras = text.trim() ? text.trim().split(/\n+/).filter(Boolean).length : 0;
      const sents = text.trim() ? text.split(/[.!?]+/).filter((s: string) => s.trim().length > 1).length : 0;
      return `${words}|${text.length}|${paras}|${sents}`;
    },
  });
  const [words, chars, paras, sents] = count.split("|").map(Number);
  const readingMin = Math.max(1, Math.round(words / 200));
  return (
    <div className="orleia-status-bar flex items-center justify-between px-4 py-1 border-b border-border bg-card/70 text-[11px] text-muted-foreground shrink-0 select-none">
      <div className="flex items-center gap-3">
        <span>
          {words} {t("notes.words")}
        </span>
        <span>
          {chars} {t("notes.chars")}
        </span>
        <span className="hidden sm:inline-flex items-center gap-1">
          <Clock3 className="h-3 w-3" /> {readingMin} {t("notes.readingTime")}
        </span>
        <span className="hidden md:inline">
          {paras} {t("notes.paragraphs")}
        </span>
        <span className="hidden md:inline">
          {sents} {t("notes.sentences")}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="hidden sm:inline mr-1 tabular-nums">
          {pages} {t("notes.pages")}
        </span>
        <button className={cn(BTN, BTN_OFF, "h-6 w-6")} title={t("notes.zoomOut")} onMouseDown={(e) => e.preventDefault()} onClick={() => onZoom(zoom - 0.1)}>
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          className="min-w-[46px] rounded-md px-1 py-0.5 text-center tabular-nums hover:bg-secondary transition-colors"
          title={t("notes.zoomReset")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onZoom(1)}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button className={cn(BTN, BTN_OFF, "h-6 w-6")} title={t("notes.zoomIn")} onMouseDown={(e) => e.preventDefault()} onClick={() => onZoom(zoom + 0.1)}>
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
