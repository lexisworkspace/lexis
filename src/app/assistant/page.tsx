"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  Sparkles,
  BarChart3,
  Target,
  BookOpen,
  Lightbulb,
  Zap,
  Trash2,
  Plus,
  Download,
  Upload,
  MessageSquare,
  ChevronRight,
  Clock,
  FileText,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { storage } from "@/lib/storage";
import { ai } from "@/lib/ai";
import { cn, formatDate, getToday, generateId } from "@/lib/utils";
import { AIMessage, AIConversation } from "@/types";

export default function AssistantPage() {
  const [data, setData] = useState(storage.getData());
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refresh = () => setData({ ...storage.getData() });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewChat = () => {
    const conv = storage.createConversation();
    setConversationId(conv.id);
    setMessages([]);
    refresh();
  };

  const loadConversation = (id: string) => {
    const conv = data.aiConversations.find((c) => c.id === id);
    if (conv) {
      setConversationId(id);
      setMessages(conv.messages);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    if (!conversationId) {
      const conv = storage.createConversation();
      setConversationId(conv.id);
      refresh();
    }

    const userMsg: AIMessage = {
      id: generateId(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Simulate AI thinking delay
    await new Promise((r) => setTimeout(r, 800));

    const response = ai.chat(input);

    const aiMsg: AIMessage = {
      id: generateId(),
      role: "assistant",
      content: response,
      timestamp: new Date().toISOString(),
    };

    if (conversationId) {
      storage.addMessage(conversationId, userMsg);
      storage.addMessage(conversationId, aiMsg);
    } else {
      const conv = storage.createConversation();
      storage.addMessage(conv.id, userMsg);
      storage.addMessage(conv.id, aiMsg);
      setConversationId(conv.id);
    }

    setMessages((prev) => [...prev, aiMsg]);
    setLoading(false);
    refresh();
  };

  const getSuggestions = () => {
    const suggestions = storage.getSuggestions();
    return suggestions.filter((s) => !s.read).slice(0, 5);
  };

  const conversations = data.aiConversations;

  return (
    <div className="flex gap-6 h-[calc(100vh-6rem)]">
      {/* Conversations Sidebar */}
      <div className="hidden lg:flex w-64 flex-col shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Chats</h2>
          <button onClick={startNewChat} className="btn-ghost p-1">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={cn(
                "w-full text-left rounded-xl px-3 py-2 text-sm transition-colors",
                conversationId === conv.id
                  ? "bg-primary-500/10 text-primary-500"
                  : "hover:bg-secondary text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">{conv.title}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5 pl-6">
                {conv.messages.length} messages
              </p>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No conversations yet</p>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2 mb-4"
        >
          {[
            { label: "Weekly Review", icon: BarChart3, action: () => setInput("Give me a weekly review") },
            { label: "Monthly Report", icon: FileText, action: () => setInput("Give me a monthly report") },
            { label: "Daily Summary", icon: Zap, action: () => setInput("Give me a quick summary of my day") },
            { label: "Habit Plan", icon: Target, action: () => setInput("Help me create a habit plan") },
          ].map((action) => (
            <button
              key={action.label}
              onClick={action.action}
              className="btn-ghost text-xs gap-1.5"
            >
              <action.icon className="h-3.5 w-3.5 text-primary-500" />
              {action.label}
            </button>
          ))}
        </motion.div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-1">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center py-10"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary-subtle shadow-lg">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Ask me anything about your productivity, habits, notes, and tasks. I'm here to help you stay on track!
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md">
                {[
                  { label: "How are my habits today?", icon: Target },
                  { label: "Summarize my week", icon: Calendar },
                  { label: "What should I focus on?", icon: Lightbulb },
                  { label: "Find notes about...", icon: FileText },
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setInput(s.label)}
                    className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm hover:bg-secondary transition-colors text-left"
                  >
                    <s.icon className="h-4 w-4 text-primary-500 shrink-0" />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl gradient-primary-subtle">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  msg.role === "user"
                    ? "bg-primary-500 text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content.split("\n").map((line, i) => {
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return <p key={i} className="font-semibold mb-1">{line.slice(2, -2)}</p>;
                    }
                    if (line.startsWith("•") || line.startsWith("-")) {
                      return <p key={i} className="ml-3 mb-0.5">{line}</p>;
                    }
                    return <p key={i} className="mb-0.5">{line}</p>;
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-2">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl gradient-primary-subtle">
                <Bot className="h-4 w-4 text-zinc-200" />
              </div>
              <div className="rounded-2xl bg-muted px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask me anything about your productivity..."
            className="input-field flex-1"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="btn-primary p-3 aspect-square"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Insights Sidebar */}
      <div className="hidden xl:flex w-72 flex-col shrink-0">
        <h2 className="font-semibold text-sm mb-4">AI Insights</h2>
        <div className="flex-1 overflow-y-auto space-y-3">
          {getSuggestions().length > 0 ? (
            getSuggestions().map((s) => (
              <div
                key={s.id}
                className="rounded-xl bg-gradient-to-br from-zinc-500/5 to-zinc-700/5 border border-zinc-700/10 p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary-500" />
                  <span className="text-xs font-medium">{s.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{s.content}</p>
              </div>
            ))
          ) : (
            <>
              <div className="rounded-xl bg-muted p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-xs font-medium">Daily Tip</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ask me for a "weekly review" to get a comprehensive analysis of your productivity.
                </p>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-xs font-medium">Pro Tip</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Say "create a habit plan" and I'll generate a personalized routine based on your current habits.
                </p>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-3.5 w-3.5 text-primary-500" />
                  <span className="text-xs font-medium">Quick Action</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ask "find notes about [topic]" to search across all your notes instantly.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
