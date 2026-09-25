"use client";

// ============================================================
// Noor Memory System
// Learns facts about the user across conversations and remembers
// context from past interactions. Fully local — nothing leaves the device.
// ============================================================

import { storage } from "./storage";
import type { AIConversation } from "@/types";

// ---- User Facts ----
export interface UserFact {
  id: string;
  fact: string;
  source: string;
  confidence: number;
  createdAt: string;
}

const FACTS_KEY = "noor-facts";

export function getFacts(): UserFact[] {
  try {
    return JSON.parse(localStorage.getItem(FACTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveFact(fact: string, source: string, confidence = 0.8) {
  const facts = getFacts();
  const existing = facts.find(f => f.fact.toLowerCase() === fact.toLowerCase());
  if (existing) return;
  facts.push({ id: `fact-${Date.now()}`, fact, source, confidence, createdAt: new Date().toISOString() });
  if (facts.length > 50) {
    facts.sort((a, b) => b.confidence - a.confidence);
    facts.length = 50;
  }
  localStorage.setItem(FACTS_KEY, JSON.stringify(facts));
}

export function removeFact(id: string) {
  const facts = getFacts().filter(f => f.id !== id);
  localStorage.setItem(FACTS_KEY, JSON.stringify(facts));
}

// ---- Conversation Memory ----
export interface ConversationMemory {
  id: string;
  conversationId: string;
  summary: string;
  topics: string[];
  userSentiment: string;
  keyDecisions: string[];
  createdAt: string;
}

const MEMORY_KEY = "noor-memories";

export function getMemories(): ConversationMemory[] {
  try {
    return JSON.parse(localStorage.getItem(MEMORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveMemory(conversation: AIConversation) {
  const memories = getMemories();
  if (conversation.messages.length < 4) return;
  const userMessages = conversation.messages.filter(m => m.role === "user");
  const topics = extractTopics(userMessages.map(m => m.content).join(" "));
  const firstUser = userMessages[0];
  const summary = firstUser ? (firstUser.content.slice(0, 150) + (firstUser.content.length > 150 ? "..." : "")) : "Empty conversation";
  const sentiment = analyzeSentiment(userMessages.map(m => m.content).join(" "));
  const filtered = memories.filter(m => m.conversationId !== conversation.id);
  filtered.push({ id: `mem-${Date.now()}`, conversationId: conversation.id, summary, topics, userSentiment: sentiment, keyDecisions: extractDecisions(conversation.messages), createdAt: new Date().toISOString() });
  if (filtered.length > 30) {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    filtered.length = 30;
  }
  localStorage.setItem(MEMORY_KEY, JSON.stringify(filtered));
}

export function searchMemories(query: string): ConversationMemory[] {
  const q = query.toLowerCase();
  return getMemories().filter(m => m.topics.some(t => t.includes(q)) || m.summary.toLowerCase().includes(q)).slice(0, 5);
}

// ---- Helpers ----
function extractTopics(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const topicMap: Record<string, number> = {};
  const stopWords = new Set(['i','me','my','the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','can','to','of','in','for','on','with','at','by','from','as','into','through','during','before','after','and','but','or','so','yet','not','only','own','same','than','too','very','just','also','now','then','here','there','when','where','why','how','all','each','every','few','more','most','other','some','such','no','nor','this','that','these','those','what','which','who','whom','it','its','you','your','we','our','they','their','he','she','like','make','want','need','help','know','think','get','go','create','add','delete','show','find','search','please']);
  for (const word of words) {
    const clean = word.replace(/[^a-z0-9]/g, '');
    if (clean.length > 3 && !stopWords.has(clean)) topicMap[clean] = (topicMap[clean] || 0) + 1;
  }
  return Object.entries(topicMap).sort(([, a], [, b]) => b - a).slice(0, 5).map(([w]) => w);
}

function analyzeSentiment(text: string): string {
  const words = text.toLowerCase().split(/\s+/);
  const pos = ['happy','great','good','love','amazing','awesome','excellent','wonderful','fantastic','perfect','best','better','glad','excited','thank','thanks','appreciate','yes','sure','okay'];
  const neg = ['sad','bad','hate','terrible','awful','horrible','worst','worse','angry','frustrated','annoyed','upset','worried','anxious','stressed','problem','issue','help','fail'];
  let p = 0, n = 0;
  for (const w of words) { if (pos.includes(w)) p++; if (neg.includes(w)) n++; }
  if (p > n + 2) return 'positive';
  if (n > p + 2) return 'negative';
  return 'neutral';
}

function extractDecisions(messages: { role: string; content: string }[]): string[] {
  const d: string[] = [];
  for (const m of messages) {
    if (m.role === "assistant" && m.content.includes("ORLEIA_ACTION")) {
      const match = m.content.match(/"action":"([^"]+)"/);
      if (match) d.push(match[1].replace(/_/g, ' '));
    }
  }
  return [...new Set(d)].slice(0, 5);
}

// ---- Proactive Suggestions ----
export interface ProactiveSuggestion {
  id: string;
  type: 'streak_risk' | 'missed_habit' | 'overdue_task' | 'mood_insight' | 'motivation' | 'daily_digest' | 'weekly_recap';
  title: string;
  body: string;
  icon: string;
  priority: number;
  dismissed: boolean;
  createdAt: string;
}

export function generateProactiveSuggestions(): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];
  const data = storage.getData();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  data.habits.filter(h => !h.archived).forEach(habit => {
    const logDates = storage.getHabitLogDates(habit.id);
    const lastLog = logDates.length > 0 ? logDates.sort().reverse()[0] : null;
    if (lastLog === yesterday && new Date().getHours() >= 20) {
      suggestions.push({ id: `streak-${habit.id}`, type: 'streak_risk', title: `Don't break your ${habit.name} streak!`, body: `You logged ${habit.name} yesterday but haven't today. Do it now to keep your streak alive.`, icon: '🔥', priority: 5, dismissed: false, createdAt: new Date().toISOString() });
    }
    if (!lastLog || (lastLog !== today && lastLog !== yesterday)) {
      suggestions.push({ id: `missed-${habit.id}`, type: 'missed_habit', title: `You missed ${habit.name}`, body: `It's been a while since you logged ${habit.name}. Want to get back on track?`, icon: '💤', priority: 3, dismissed: false, createdAt: new Date().toISOString() });
    }
  });

  const overdue = data.tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < today);
  if (overdue.length > 0) {
    suggestions.push({ id: 'overdue-tasks', type: 'overdue_task', title: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`, body: overdue.length === 1 ? `"${overdue[0].title}" is overdue. Let's knock it out!` : `You have ${overdue.length} overdue tasks. The oldest is "${overdue[0].title}".`, icon: '⏰', priority: 4, dismissed: false, createdAt: new Date().toISOString() });
  }

  const recentJournal = data.journalEntries.slice(0, 7);
  if (recentJournal.length >= 3) {
    const moodScores: Record<string, number> = { amazing: 100, good: 75, neutral: 50, bad: 25, terrible: 0 };
    const avgMood = recentJournal.reduce((sum, e) => sum + (moodScores[e.mood] || 50), 0) / recentJournal.length;
    if (avgMood < 40) {
      suggestions.push({ id: 'mood-low', type: 'mood_insight', title: 'Your mood has been low lately', body: `Your average mood over the last ${recentJournal.length} entries is below average. Consider taking time for self-care today.`, icon: '💙', priority: 3, dismissed: false, createdAt: new Date().toISOString() });
    } else if (avgMood > 75) {
      suggestions.push({ id: 'mood-high', type: 'motivation', title: "You're on a roll!", body: `Your mood has been consistently positive over the last ${recentJournal.length} entries. Whatever you're doing is working — keep it up!`, icon: '🌟', priority: 2, dismissed: false, createdAt: new Date().toISOString() });
    }
  }

  const totalLogs = data.habitLogs.length;
  const totalTasks = data.tasks.filter(t => t.status === 'done').length;
  if (totalLogs === 0 && totalTasks === 0 && data.habits.length > 0) {
    suggestions.push({ id: 'get-started', type: 'motivation', title: "Let's get started!", body: "You have habits set up but haven't logged any yet. Even one check-in today counts. Let's go!", icon: '🚀', priority: 5, dismissed: false, createdAt: new Date().toISOString() });
  }

  return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

// ---- Auto-Extract Facts from Messages ----
export function extractFactsFromMessages(messages: { role: string; content: string }[], conversationTitle: string) {
  for (const msg of messages) {
    if (msg.role !== "user") continue;
    const c = msg.content.toLowerCase();
    const tryExtract = (re: RegExp, prefix: string) => {
      const m = c.match(re);
      if (m && m[1]) saveFact(`${prefix}${m[1].trim()}`, conversationTitle, 0.7);
    };
    tryExtract(/(?:i am|i'm|my name is)\s+(.{3,50}?)[\s.!,]/, "User is ");
    tryExtract(/(?:i (?:like|love|enjoy))\s+(.{3,50}?)[\s.!,]/, "User likes ");
    tryExtract(/i (?:work|study)\s+(.{3,50}?)[\s.!,]/, "User ");
    tryExtract(/(?:i (?:want|need) to|my goal is)\s+(.{3,80}?)[\s.!,]/, "User wants: ");
    tryExtract(/(?:i(?:'m| am) from|i live in)\s+(.{3,50}?)[\s.!,]/, "User is from ");
    tryExtract(/my (?:favorite|favourite)\s+(.{3,50}?)[\s.!,]/, "User's favorite: ");
  }
}

// ---- Build Memory Context for AI ----
export function buildMemoryContext(): string {
  const facts = getFacts();
  const memories = getMemories();
  const parts: string[] = [];
  if (facts.length > 0) {
    parts.push("THINGS I KNOW ABOUT THE USER:");
    for (const f of facts.slice(0, 20)) parts.push(`- ${f.fact}`);
  }
  if (memories.length > 0) {
    const recent = memories.slice(-5);
    parts.push("\nRECENT CONVERSATIONS:");
    for (const m of recent) parts.push(`- "${m.summary.slice(0, 80)}" (topics: ${m.topics.slice(0, 3).join(", ")})`);
  }
  return parts.join("\n");
}
