"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  pinned?: boolean;
  messageCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en", { month: "short" });
}

function ConversationItem({
  conversation,
  isActive,
  onHover,
  onSelect,
  onDelete,
}: {
  conversation: Conversation;
  isActive: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      initial={false}
      onMouseEnter={() => { setHovered(true); onHover(conversation.id); }}
      onMouseLeave={() => { setHovered(false); onHover(null); }}
      onClick={() => onSelect(conversation.id)}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all duration-150",
        isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
      )}
    >
      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", isActive ? "bg-primary/10" : "bg-secondary")}>
        <MessageSquare className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-muted-foreground/50")} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{conversation.title || "New chat"}</p>
        <p className="truncate text-[10px] text-muted-foreground/50 mt-0.5">
          {conversation.messageCount} messages · {formatTime(conversation.updatedAt)}
        </p>
      </div>
      <AnimatePresence>
        {hovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.1 }}
            onClick={(e) => { e.stopPropagation(); onDelete(conversation.id); }}
            className="shrink-0 rounded-md p-1 text-muted-foreground/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function ConversationList({ conversations, activeId, onSelect, onNew, onDelete }: ConversationListProps) {
  const [search, setSearch] = useState("");
  const filtered = conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));
  const pinned = filtered.filter(c => c.pinned);
  const recent = filtered.filter(c => !c.pinned);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <h2 className="text-sm font-semibold text-foreground/80">Conversations</h2>
        <button onClick={onNew} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg bg-secondary/60 py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors focus:bg-secondary" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-1.5 pb-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-6 w-6 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground/50">{search ? "No matches" : "Start a conversation"}</p>
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <div className="mb-1">
                <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground/40 uppercase tracking-wider">Pinned</p>
                {pinned.map(c => <ConversationItem key={c.id} conversation={c} isActive={c.id === activeId} onHover={() => {}} onSelect={onSelect} onDelete={onDelete} />)}
              </div>
            )}
            <div>
              {pinned.length > 0 && <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground/40 uppercase tracking-wider">Recent</p>}
              {recent.map(c => <ConversationItem key={c.id} conversation={c} isActive={c.id === activeId} onHover={() => {}} onSelect={onSelect} onDelete={onDelete} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
