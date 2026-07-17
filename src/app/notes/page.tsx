"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  FileText,
  Tag,
  Folder,
  Pin,
  PinOff,
  Trash2,
  X,
  Sparkles,
  Star,
  MoreHorizontal,
  Clock,
  RefreshCw,
  AlignLeft,
  Type,
  Bold,
  Italic,
  List,
  Hash,
  Shrink,
  Expand,
  Copy,
  Check,
} from "lucide-react";
import { storage } from "@/lib/storage";
import { ai } from "@/lib/ai";
import { cn, formatDate, truncate, generateId } from "@/lib/utils";
import { Note, NoteTag, NoteFolder } from "@/types";

export default function NotesPage() {
  const [data, setData] = useState(storage.getData());
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showAIOptions, setShowAIOptions] = useState<string | null>(null);

  const refresh = () => setData({ ...storage.getData() });

  const notes = data.notes
    .filter((n) => !n.archived)
    .filter((n) => {
      if (search) {
        const q = search.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !n.content.toLowerCase().includes(q)) return false;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Notes</h1>
          <p className="text-muted-foreground mt-1">Capture your ideas, organized by AI</p>
        </div>
        <button
          onClick={() => { setEditingNote(null); setShowEditor(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Note</span>
        </button>
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
            className={cn("btn-ghost text-xs", !selectedFolder && "bg-primary-500/10 text-primary-500")}
          >
            All
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFolder(selectedFolder === f.id ? null : f.id)}
              className={cn("btn-ghost text-xs", selectedFolder === f.id && "bg-primary-500/10 text-primary-500")}
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
            className={cn(
              "tag transition-all",
              selectedTags.includes(tag.id)
                ? "ring-2 ring-offset-1 ring-offset-background"
                : ""
            )}
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

      {/* Notes Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {notes.map((note, i) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 * i }}
            className="card card-hover group relative"
          >
            {/* Pin badge */}
            {note.pinned && (
              <div className="absolute top-3 right-3">
                <Pin className="h-3.5 w-3.5 text-zinc-400 fill-zinc-400" />
              </div>
            )}

            {/* AI Badge */}
            {note.aiSummary && (
              <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-primary-500/10 px-2 py-0.5">
                <Sparkles className="h-3 w-3 text-primary-500" />
                <span className="text-[10px] text-primary-500">AI</span>
              </div>
            )}

            <div className="pt-4" />

            <div
              className="cursor-pointer"
              onClick={() => { setEditingNote(note); setShowEditor(true); }}
            >
              <h3 className="font-semibold mb-1 line-clamp-1">{note.title || "Untitled"}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {note.content.replace(/<[^>]*>/g, "").slice(0, 120)}
              </p>
            </div>

            {/* Tags */}
            {note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {note.tags.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  return tag ? (
                    <span
                      key={tag.id}
                      className="tag text-[10px]"
                      style={{ backgroundColor: `${tag.color}15`, color: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ) : null;
                })}
              </div>
            )}

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatDate(note.updatedAt)}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); storage.updateNote(note.id, { pinned: !note.pinned }); refresh(); }}
                  className="p-1 hover:text-zinc-400"
                >
                  {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAIOptions(showAIOptions === note.id ? null : note.id); }}
                  className="p-1 hover:text-primary-500"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); storage.deleteNote(note.id); refresh(); }}
                  className="p-1 hover:text-zinc-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* AI Options Dropdown */}
            <AnimatePresence>
              {showAIOptions === note.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-12 z-10 w-48 rounded-xl border border-border bg-card shadow-xl p-1"
                >
                  {[
                    { label: "Summarize", action: () => {
                      const summary = ai.summarizeNote(note);
                      storage.updateNote(note.id, { aiSummary: summary });
                      refresh();
                    }},
                    { label: "Extract Actions", action: () => {
                      const items = ai.extractActionItems(note);
                      storage.updateNote(note.id, { aiActionItems: items });
                      refresh();
                    }},
                    { label: "Generate Title", action: () => {
                      const title = ai.generateTitle(note.content);
                      storage.updateNote(note.id, { title });
                      refresh();
                    }},
                    { label: "Make Shorter", action: () => {
                      const content = ai.rewriteNote(note.content, "shorter");
                      storage.updateNote(note.id, { content });
                      refresh();
                    }},
                    { label: "Make Professional", action: () => {
                      const content = ai.rewriteNote(note.content, "professional");
                      storage.updateNote(note.id, { content });
                      refresh();
                    }},
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => { option.action(); setShowAIOptions(null); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-primary-500" />
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

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

      {/* Note Editor Modal */}
      <AnimatePresence>
        {showEditor && (
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
            }}
            onClose={() => setShowEditor(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NoteEditor({
  note,
  folders,
  tags,
  onSave,
  onClose,
}: {
  note: Note | null;
  folders: NoteFolder[];
  tags: NoteTag[];
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [folderId, setFolderId] = useState(note?.folderId || null);
  const [noteTags, setNoteTags] = useState<string[]>(note?.tags || []);
  const [showAI, setShowAI] = useState(false);

  const handleSave = () => {
    onSave({
      title: title || "Untitled",
      content,
      contentHtml: content,
      folderId,
      tags: noteTags,
      pinned: note?.pinned || false,
      archived: false,
      favorite: false,
      aiSummary: note?.aiSummary,
      aiActionItems: note?.aiActionItems,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <button className="btn-ghost p-1.5" title="Bold"><Bold className="h-4 w-4" /></button>
            <button className="btn-ghost p-1.5" title="Italic"><Italic className="h-4 w-4" /></button>
            <button className="btn-ghost p-1.5" title="List"><List className="h-4 w-4" /></button>
            <div className="w-px h-5 bg-border" />
            <button
              onClick={() => {
                const summary = ai.summarizeNote({ content, title } as Note);
                setContent(content + `\n\n**AI Summary:** ${summary}`);
              }}
              className="btn-ghost p-1.5 text-primary-500"
              title="AI Assist"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const t = ai.generateTitle(content);
                setTitle(t);
              }}
              className="btn-ghost text-xs gap-1"
            >
              <Sparkles className="h-3 w-3" />
              AI Title
            </button>
            <button onClick={handleSave} className="btn-primary text-xs px-4 py-1.5">
              Save
            </button>
            <button onClick={onClose} className="btn-ghost p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="w-full text-xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing... (Markdown supported)"
            className="w-full min-h-[300px] bg-transparent border-none outline-none resize-none text-sm leading-relaxed placeholder:text-muted-foreground/50"
          />

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setNoteTags(
                  noteTags.includes(tag.id)
                    ? noteTags.filter((t) => t !== tag.id)
                    : [...noteTags, tag.id]
                )}
                className={cn(
                  "tag text-xs transition-all",
                  noteTags.includes(tag.id) && "ring-2"
                )}
                style={{
                  backgroundColor: noteTags.includes(tag.id) ? `${tag.color}20` : undefined,
                  color: tag.color,
                  borderColor: noteTags.includes(tag.id) ? tag.color : "transparent",
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>

          {/* AI Section */}
          {note?.aiSummary && (
            <div className="rounded-xl bg-primary-500/5 border border-primary-500/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary-500" />
                <span className="text-sm font-medium">AI Summary</span>
              </div>
              <p className="text-sm text-muted-foreground">{note.aiSummary}</p>
            </div>
          )}

          {note?.aiActionItems && note.aiActionItems.length > 0 && (
            <div className="rounded-xl bg-zinc-500/5 border border-zinc-500/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <List className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium">Action Items</span>
              </div>
              <ul className="space-y-1">
                {note.aiActionItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
