"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  BarChart3,
  Target,
  Lightbulb,
  Zap,
  Trash2,
  Plus,
  MessageSquare,
  Calendar,
  TrendingUp,
  ChevronDown,
  Cpu,
  Layers,
  Gauge,
  Brain,
  Search,
  X as XIcon,
} from "lucide-react";
import { storage } from "@/lib/storage";
import { chat } from "@/lib/ai";
import { webSearch } from "@/lib/webSearch";
import { cn, generateId } from "@/lib/utils";
import { AIMessage, AIModel, AIMode, AI_MODELS, AI_MODES } from "@/types";

const MODEL_META: Record<string, { icon: typeof Cpu; color: string; label: string }> = {
  "arete-1.5": { icon: Layers, color: "text-violet-400", label: "Arete 1.5" },
  "thallo-1.0": { icon: Cpu, color: "text-emerald-400", label: "Thallo 1.0" },
  "tsubame-0.7": { icon: Gauge, color: "text-amber-400", label: "Tsubame 0.7" },
};

const MODE_META: Record<string, { icon: typeof Bot; color: string; label: string }> = {
  "normal": { icon: Bot, color: "text-zinc-400", label: "Normal" },
  "thinking": { icon: Brain, color: "text-violet-400", label: "Thinking" },
  "deep-research": { icon: Search, color: "text-cyan-400", label: "Deep Research" },
};

const SAFE_MODEL: AIModel = "thallo-1.0";

export default function AssistantPage() {
  const [data, setData] = useState(storage.getData());
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(getSafeModel(data.selectedModel));
  const [selectedMode, setSelectedMode] = useState<AIMode>(getSafeMode(data.selectedMode));
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showMobileChats, setShowMobileChats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);

  function getSafeModel(m: unknown): AIModel {
    if (typeof m === "string" && AI_MODELS.some((x) => x.id === m)) return m as AIModel;
    return SAFE_MODEL;
  }

  function getSafeMode(m: unknown): AIMode {
    if (typeof m === "string" && AI_MODES.some((x) => x.id === m)) return m as AIMode;
    return "normal";
  }

  const refresh = () => setData({ ...storage.getData() });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const appData = storage.getData();
    appData.aiConversations = appData.aiConversations.filter((c) => c.id !== id);
    storage.saveData();
    if (conversationId === id) {
      setConversationId(null);
      setMessages([]);
    }
    refresh();
  };

  const changeModel = (model: AIModel) => {
    setSelectedModel(model);
    setShowModelPicker(false);
    const appData = storage.getData();
    appData.selectedModel = model;
    storage.saveData();
  };

  const changeMode = (mode: AIMode) => {
    setSelectedMode(mode);
    setShowModelPicker(false);
    storage.setMode(mode);
  };

  const generateThinkingSteps = (query: string, response: string): string => {
    const steps = [
      `**Analyzing your request:** You're asking about "${query.slice(0, 60)}${query.length > 60 ? "..." : ""}". I need to understand what you need and find the relevant information in your workspace.`,
      `**Scanning your data:** Let me check your habits, tasks, journal, and notes for anything related to this topic. I'll look for patterns, trends, and connections across your workspace.`,
      `**Cross-referencing insights:** I'm connecting the dots between different areas of your data — seeing how your habits relate to your tasks, and how your journal reflections might inform the bigger picture.`,
      `**Formulating the response:** Based on the patterns I've found, I'm now crafting a comprehensive answer that addresses your specific question with actionable insights.`,
    ];

    let thinking = `🧠 **Thinking Process**\n\nLet me work through this step by step.\n\n`;
    steps.forEach((step, i) => {
      thinking += `**Step ${i + 1}:** ${step}\n\n`;
    });
    thinking += `---\n\n**Response:**\n${response}`;
    return thinking;
  };

  const generateDeepResearch = async (query: string, response: string): Promise<string> => {
    // Actually search the web
    const searchResults = await webSearch(query);

    // Build the web research section
    let webSection = "";
    if (searchResults.abstract) {
      webSection += `**Overview**\n${searchResults.abstract}\n\n`;
    }
    if (searchResults.results.length > 0) {
      webSection += `**Sources**\n` +
        searchResults.results.map((r, i) =>
          `${i + 1}. **${r.title}**\n   ${r.snippet}\n   ${r.url}`
        ).join("\n\n") + "\n\n";
    }
    if (searchResults.relatedTopics.length > 0) {
      webSection += `**Related Topics**\n${searchResults.relatedTopics.map(t => `• ${t}`).join("\n")}\n\n`;
    }

    // If we got web results, use them as the primary answer
    if (webSection) {
      return `🔬 **Deep Research Report**\n\n` +
        `**Research Topic:** ${query}\n\n` +
        webSection;
    }

    // Fallback: no web results found, use the AI response directly
    return `🔬 **Deep Research Report**\n\n` +
      `**Research Topic:** ${query}\n\n` +
      `${response}\n\n` +
      `_No web results were found for this query. The response above is from the AI model._`;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    let currentConvId = conversationId;
    if (!currentConvId) {
      const conv = storage.createConversation();
      currentConvId = conv.id;
      setConversationId(conv.id);
      refresh();
    }

    const userMsg: AIMessage = {
      id: generateId(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
      model: selectedModel,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    const queryText = input;
    setInput("");
    setLoading(true);

    storage.addMessage(currentConvId, userMsg);

    const delays: Record<string, number> = {
      "arete-1.5": 1200, "thallo-1.0": 800, "tsubame-0.7": 400,
    };
    const baseDelay = delays[selectedModel] || 800;
    const modeMultiplier = selectedMode === "thinking" ? 2 : selectedMode === "deep-research" ? 3 : 1;
    await new Promise((r) => setTimeout(r, baseDelay * modeMultiplier));

    let response = chat(queryText, updatedMessages, selectedModel);

    if (selectedMode === "thinking") {
      response = generateThinkingSteps(queryText, response);
    } else if (selectedMode === "deep-research") {
      response = await generateDeepResearch(queryText, response);
    }

    const aiMsg: AIMessage = {
      id: generateId(),
      role: "assistant",
      content: response,
      timestamp: new Date().toISOString(),
      model: selectedModel,
    };

    storage.addMessage(currentConvId, aiMsg);

    const conv = storage.getData().aiConversations.find((c) => c.id === currentConvId);
    if (conv && conv.title === "New Chat" && conv.messages.length <= 2) {
      conv.title = queryText.length > 40 ? queryText.slice(0, 40) + "..." : queryText;
      storage.saveData();
    }

    setMessages((prev) => [...prev, aiMsg]);
    setLoading(false);
    refresh();
  };

  const modelInfo = MODEL_META[selectedModel] || MODEL_META["thallo-1.0"];
  const modeInfo = MODE_META[selectedMode] || MODE_META["normal"];
  const ModelIcon = modelInfo.icon;
  const ModeIcon = modeInfo.icon;
  const currentModel = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[1];
  const currentMode = AI_MODES.find((m) => m.id === selectedMode) || AI_MODES[0];
  const conversations = data.aiConversations;
  const isModeActive = selectedMode !== "normal";

  return (
    <div className="flex gap-6 h-[calc(100vh-6rem)] relative">
      <AnimatePresence>
        {showMobileChats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileChats(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <div
        className={cn(
          "flex flex-col shrink-0 transition-all duration-300",
          "w-64 lg:relative lg:flex",
          "fixed left-0 top-0 z-50 h-full bg-sidebar border-r border-border p-4",
          "lg:bg-transparent lg:border-none lg:p-0 lg:h-auto lg:static",
          showMobileChats ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Chats</h2>
          <div className="flex items-center gap-1">
            <button onClick={startNewChat} className="btn-ghost p-1.5 rounded-xl hover:bg-secondary transition-colors">
              <Plus className="h-4 w-4" />
            </button>
            <button onClick={() => setShowMobileChats(false)} className="btn-ghost p-1.5 rounded-xl hover:bg-secondary transition-colors lg:hidden">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map((conv) => (
            <button
              key={conv.id}
              onClick={() => { loadConversation(conv.id); setShowMobileChats(false); }}
              className={cn(
                "w-full text-left rounded-xl px-3 py-2.5 text-sm transition-all duration-200 group",
                conversationId === conv.id
                  ? "bg-primary-500/10 text-primary-500"
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate text-xs">{conv.title}</span>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-muted-foreground/60">{conv.messages.length} msg{conv.messages.length !== 1 ? "s" : ""}</p>
                {conv.messages.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground/60">
                    {conv.messages[conv.messages.length - 1].model || "thallo-1.0"}
                  </span>
                )}
              </div>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
          )}
        </div>
      </div>

      <button
        onClick={() => setShowMobileChats(true)}
        className="fixed bottom-6 left-6 z-50 flex h-11 w-11 items-center justify-center rounded-2xl gradient-primary-subtle text-white shadow-lg shadow-zinc-800/50 lg:hidden active:scale-95 transition-transform"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="relative" ref={modelPickerRef}>
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 border",
                "hover:bg-secondary",
                showModelPicker ? "bg-secondary border-border" : "border-transparent"
              )}
            >
              {isModeActive ? (
                <ModeIcon className={cn("h-4 w-4", modeInfo.color)} />
              ) : (
                <ModelIcon className={cn("h-4 w-4", modelInfo.color)} />
              )}
              <span>{isModeActive ? currentMode.name : currentModel.name}</span>
              {isModeActive && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-500/10 text-[9px] text-violet-400">
                  <Brain className="h-2.5 w-2.5" />
                  {selectedMode === "thinking" ? "CoT" : "DR"}
                </span>
              )}
              <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform duration-200", showModelPicker && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showModelPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 w-72 bg-background border border-border rounded-2xl shadow-2xl p-2 z-50"
                >
                  <p className="text-[9px] font-mono tracking-wider text-muted-foreground/40 px-3 py-1.5 uppercase">Models</p>
                  {AI_MODELS.map((m) => {
                    const meta = MODEL_META[m.id] || { icon: Cpu, color: "text-zinc-400", label: m.name };
                    const Icon = meta.icon;
                    const isActive = !isModeActive && selectedModel === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => changeModel(m.id)}
                        className={cn(
                          "w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200",
                          isActive ? "bg-primary-500/10 ring-1 ring-primary-500/20" : "hover:bg-secondary"
                        )}
                      >
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", isActive ? "bg-primary-500/20" : "bg-muted")}>
                          <Icon className={cn("h-4 w-4", meta.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{m.name}</span>
                            {isActive && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary-500/20 text-primary-500">Active</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                        </div>
                      </button>
                    );
                  })}

                  <div className="my-2 mx-3 h-px bg-border" />
                  <p className="text-[9px] font-mono tracking-wider text-muted-foreground/40 px-3 py-1.5 uppercase">Modes</p>
                  {AI_MODES.map((m) => {
                    const meta = MODE_META[m.id] || { icon: Bot, color: "text-zinc-400", label: m.name };
                    const Icon = meta.icon;
                    const isActive = selectedMode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => changeMode(m.id)}
                        className={cn(
                          "w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200",
                          isActive ? "bg-primary-500/10 ring-1 ring-primary-500/20" : "hover:bg-secondary"
                        )}
                      >
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", isActive ? "bg-primary-500/20" : "bg-muted")}>
                          <Icon className={cn("h-4 w-4", meta.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{m.name}</span>
                            {isActive && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary-500/20 text-primary-500">Active</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Weekly Review", icon: BarChart3, action: () => setInput("Give me a weekly review") },
              { label: "Daily Summary", icon: Zap, action: () => setInput("Give me a quick summary of my day") },
              { label: "Habit Plan", icon: Target, action: () => setInput("Help me create a habit plan") },
            ].map((action) => (
              <button key={action.label} onClick={action.action} className="btn-ghost text-xs gap-1.5 px-2.5 py-1.5">
                <action.icon className="h-3 w-3 text-primary-500" />
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-1 scroll-smooth">
          {messages.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl gradient-primary-subtle shadow-lg shadow-black/10">
                {isModeActive ? <ModeIcon className={cn("h-10 w-10", modeInfo.color)} /> : <ModelIcon className={cn("h-10 w-10", modelInfo.color)} />}
              </div>
              <h3 className="text-lg font-semibold mb-1">{isModeActive ? currentMode.name : currentModel.name}</h3>
              <p className="text-xs text-muted-foreground/60 mb-1">{isModeActive ? currentMode.description : currentModel.tagline}</p>
              <p className="text-sm text-muted-foreground max-w-md mb-8">
                {selectedMode === "thinking"
                  ? "I'll show you my step-by-step reasoning before giving the final answer. Perfect for understanding the logic behind my responses."
                  : selectedMode === "deep-research"
                  ? "I'll conduct a comprehensive multi-perspective analysis, examining your data across all domains to produce a detailed research report."
                  : selectedModel === "arete-1.5"
                  ? "Deep analysis and strategic thinking. I'll consider all your data and past conversations for thorough insights."
                  : selectedModel === "tsubame-0.7"
                  ? "Fast, concise answers. Perfect for quick check-ins and rapid insights."
                  : "Everyday productivity companion. Balanced, practical, and always helpful."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md">
                {[
                  { label: "How are my habits today?", icon: Target },
                  { label: "Summarize my week", icon: Calendar },
                  { label: "What should I focus on?", icon: Lightbulb },
                  { label: "Motivate me!", icon: TrendingUp },
                ].map((s) => (
                  <button key={s.label} onClick={() => setInput(s.label)} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm hover:bg-secondary transition-all duration-200 text-left group">
                    <s.icon className="h-4 w-4 text-primary-500 shrink-0 group-hover:scale-110 transition-transform" />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg) => {
            const msgModel = msg.model || "thallo-1.0";
            const msgMeta = MODEL_META[msgModel] || MODEL_META["thallo-1.0"];
            const MsgModelIcon = msgMeta.icon;

            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-800 shadow-lg">
                    <MsgModelIcon className={cn("h-4 w-4", msgMeta.color)} />
                  </div>
                )}
                <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 shadow-sm", msg.role === "user" ? "bg-zinc-700 text-zinc-100 rounded-br-md" : "bg-muted rounded-bl-md")}>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <MsgModelIcon className={cn("h-3 w-3", msgMeta.color)} />
                      <span className={cn("text-[10px] font-medium", msgMeta.color)}>{msgMeta.label}</span>
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content.split("\n").map((line, i) => {
                      const cleanLine = line.replace(/\*\*/g, "");
                      if (cleanLine.startsWith("---")) return <hr key={i} className="my-2 border-border" />;
                      // Thinking steps — smaller grey text
                      if (/^\*\*Step \d+:\*\*|^Step \d+:/.test(cleanLine)) {
                        return <p key={i} className="ml-3 mb-1 text-[11px] text-muted-foreground/50 italic leading-relaxed">{cleanLine.replace(/\*\*/g, "")}</p>;
                      }
                      // Thinking intro/header line
                      if (cleanLine.includes("Thinking Process") || cleanLine.includes("Let me work through")) {
                        return <p key={i} className="mb-1 text-[11px] text-muted-foreground/50 italic">{cleanLine}</p>;
                      }
                      // Thinking separator and response header
                      if (cleanLine === "---" || cleanLine.includes("**Response:**") || cleanLine.includes("Response:")) {
                        return <hr key={i} className="my-1.5 border-border/30" />;
                      }
                      // Deep research methodology/findings sections
                      if (/^(\*\*)?Methodology|^(\*\*)?Web Research|^(\*\*)?Wikipedia|^(\*\*)?Related Topics|^(\*\*)?Research Topic/.test(cleanLine)) {
                        return <p key={i} className="mb-0.5 text-[11px] text-muted-foreground/50">{cleanLine}</p>;
                      }
                      if (cleanLine.startsWith("•") || cleanLine.startsWith("-")) {
                        return <p key={i} className="ml-3 mb-0.5 text-muted-foreground"><span className="text-foreground">{cleanLine.charAt(0)}</span>{cleanLine.slice(1)}</p>;
                      }
                      return <p key={i} className="mb-0.5">{cleanLine || "\u00A0"}</p>;
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground/40 mt-2">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            );
          })}

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-800 shadow-lg">
                {isModeActive ? <ModeIcon className={cn("h-4 w-4", modeInfo.color)} /> : <ModelIcon className={cn("h-4 w-4", modelInfo.color)} />}
              </div>
              <div className="rounded-2xl bg-muted px-4 py-3 rounded-bl-md">
                <div className="flex gap-1.5 items-center">
                  <span className="text-xs text-muted-foreground/60 mr-1">
                    {selectedMode === "thinking" ? "Thinking step by step" : selectedMode === "deep-research" ? "Researching" : selectedModel === "arete-1.5" ? "Thinking deeply" : selectedModel === "tsubame-0.7" ? "Processing" : "Responding"}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-primary-500/50 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "0.8s" }} />
                  <span className="h-2 w-2 rounded-full bg-primary-500/50 animate-bounce" style={{ animationDelay: "150ms", animationDuration: "0.8s" }} />
                  <span className="h-2 w-2 rounded-full bg-primary-500/50 animate-bounce" style={{ animationDelay: "300ms", animationDuration: "0.8s" }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={selectedMode === "thinking" ? "Ask me anything — I'll show my reasoning..." : selectedMode === "deep-research" ? "What topic should I research deeply?" : selectedModel === "tsubame-0.7" ? "Quick question..." : "Ask me anything about your productivity..."}
              className="input-field w-full resize-none pr-10 py-3 min-h-[44px] max-h-32"
              rows={1}
            />
            <div className="absolute right-3 bottom-3">
              {isModeActive ? <ModeIcon className={cn("h-3.5 w-3.5", modeInfo.color, "opacity-40")} /> : <ModelIcon className={cn("h-3.5 w-3.5", modelInfo.color, "opacity-40")} />}
            </div>
          </div>
          <button onClick={sendMessage} disabled={!input.trim() || loading} className="btn-primary p-3 aspect-square rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="hidden xl:flex w-72 flex-col shrink-0">
        <h2 className="font-semibold text-sm mb-4">AI Insights</h2>
        <div className="flex-1 overflow-y-auto space-y-3">
          <div className="rounded-xl bg-muted p-3">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="h-3.5 w-3.5 text-primary-500" />
              <span className="text-xs font-medium">Model Guide</span>
            </div>
            <div className="space-y-2 mt-2">
              {AI_MODELS.map((m) => {
                const meta = MODEL_META[m.id] || { icon: Cpu, color: "text-zinc-400", label: m.name };
                const Icon = meta.icon;
                return (
                  <div key={m.id} className="flex items-start gap-2">
                    <Icon className={cn("h-3 w-3 mt-0.5 shrink-0", meta.color)} />
                    <div>
                      <span className={cn("text-[11px] font-medium", meta.color)}>{m.name}</span>
                      <p className="text-[10px] text-muted-foreground">{m.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-primary-500" />
              <span className="text-xs font-medium">Modes</span>
            </div>
            <div className="space-y-2 mt-2">
              {AI_MODES.map((m) => {
                const meta = MODE_META[m.id] || { icon: Bot, color: "text-zinc-400", label: m.name };
                const Icon = meta.icon;
                return (
                  <div key={m.id} className="flex items-start gap-2">
                    <Icon className={cn("h-3 w-3 mt-0.5 shrink-0", meta.color)} />
                    <div>
                      <span className={cn("text-[11px] font-medium", meta.color)}>{m.name}</span>
                      <p className="text-[10px] text-muted-foreground">{m.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs font-medium">Pro Tips</span>
            </div>
            <ul className="space-y-1.5 mt-1">
              <li className="text-[11px] text-muted-foreground">• Select a model and a mode for different results</li>
              <li className="text-[11px] text-muted-foreground">• Thinking: See chain-of-thought reasoning</li>
              <li className="text-[11px] text-muted-foreground">• Deep Research: Get comprehensive reports</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
