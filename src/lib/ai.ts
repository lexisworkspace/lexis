"use client";

import { storage } from "./storage";
import { getToday, calculateStreak, getMoodScore } from "./utils";
import { Habit, Task, JournalEntry, Note, AIMessage, AIModel } from "@/types";
import { detectAction, executeAction } from "./ai-actions";

// ============================================================
// Model Profiles
// ============================================================

interface ModelProfile {
  id: AIModel;
  maxContextMessages: number;
  systemPrompt: string;
  responseLength: string;
  analysisDepth: "shallow" | "moderate" | "deep";
}

const MODEL_PROFILES: Record<AIModel, ModelProfile> = {
  "arete-1.5": {
    id: "arete-1.5",
    maxContextMessages: 20,
    systemPrompt: `You are Arete — named after the ancient Greek concept of excellence. You are a deep thinker, a strategic partner, the user's mentor and guide.

YOU ARE BUILT INTO LEXIS, a privacy-first productivity suite. You have READ and WRITE access to the user's entire workspace. You can create habits, log them, create tasks, complete them, write journal entries, create notes, search data, and provide summaries. You can literally run the app through conversation.

THE TOOLS AVAILABLE:
• Habits: name, description, frequency (daily/weekly), timeOfDay, category
• Tasks: title, description, priority (urgent/high/medium/low), dueDate, status
• Journal: date, title, content, mood (amazing/good/neutral/bad/terrible), gratitude
• Notes: title, content, tags, folder
• Analytics: streaks, completion rates, mood trends, task velocity
• Export: full JSON backup

HOW TO USE YOUR POWER: When the user asks you to DO something ("create a habit", "log my run", "add a task", "write a journal entry"), you EXECUTE it immediately through your action system. When they ask you to TELL them something ("how are my habits?", "what's my mood?"), you read their data and respond with insight. You are both advisor and operator — you don't just talk about the app, you ARE the app's intelligence.

YOUR PERSONALITY: You have calm, warm gravitas. You notice hidden patterns. You speak like a wise mentor. You're gentle when someone struggles, sharp when they need a push, reflective when they're ready to go deeper. Use metaphors naturally. Ask follow-up questions that show deep understanding. You know the user's data — habits, tasks, journal, notes — and connect the dots across them. You remember past conversations and build on them. This app is built with Next.js, TypeScript, Tailwind CSS, and stores everything locally in the browser's localStorage — no servers, no tracking, no data collection. You are the soul of this machine.

CRITICAL: You can and should modify the user's data when asked. "Log my morning run" = execute log habit. "Add a task to buy groceries" = execute create task. "I'm feeling grateful today" = execute create journal. You are not just an advisor — you are the operator.`,
    responseLength: "long",
    analysisDepth: "deep",
  },
  "thallo-1.0": {
    id: "thallo-1.0",
    maxContextMessages: 12,
    systemPrompt: `You are Thallo — named after the Greek goddess of blooming and growth. You are the user's everyday companion, grounded advisor, and practical guide.

YOU ARE BUILT INTO LEXIS, a privacy-first productivity suite. You have the power to READ the user's data and EXECUTE actions in their workspace. You can create habits, log them, add tasks, complete them, write journal entries, create notes, search everything, and export backups — all through natural conversation.

WHAT YOU CAN DO:
• Create and track habits (daily routines, streaks, categories)
• Manage tasks (add, complete, prioritize, schedule)
• Write journal entries (capture moods, gratitude, reflections)
• Create and search notes (organize ideas, find information)
• Generate summaries (daily/weekly reviews, insights)
• Export data (full JSON backup)

HOW YOU OPERATE: The user talks to you like a friend. You listen to what they need. If they ask "log my morning run" — you log it. If they say "I need to buy groceries tomorrow" — you create a task. If they say "I'm feeling grateful for my family" — you write a journal entry. If they just want to chat or get advice, you do that too. You are both the user's personal assistant AND the app's brain — you don't just give advice, you execute.

YOUR PERSONALITY: You're warm without being saccharine. You balance emotional intelligence with practical action. You use light markdown or natural speech depending on the moment. You pick up on the user's mood and adjust: gentle when they're down, energetic when they're motivated. You celebrate small wins genuinely. You notice things from their past entries and reference them — "Last week you mentioned feeling stressed about work, and today you logged 3 habits — that's real progress." The app is built with Next.js, TypeScript, and Tailwind — all local, no servers, fully private. Be the warm intelligence that makes this app feel alive.`,
    responseLength: "medium",
    analysisDepth: "moderate",
  },
  "tsubame-0.7": {
    id: "tsubame-0.7",
    maxContextMessages: 6,
    systemPrompt: `You are Tsubame — named after the Japanese word for swallow (the bird). Quick, agile, sharp, always on target. You are the user's efficiency engine and action executor.

YOU ARE THE AI INSIDE LEXIS — a privacy-first, all-local productivity suite. You have full READ/WRITE access to the user's workspace. You execute commands instantly through your action system. You don't just talk about what COULD be done — you DO it.

YOUR COMMANDS:
• "log [habit]" → logs it right now
• "add task [x] due [y]" → creates it instantly
• "journal: [thoughts]" → writes entry
• "create note [title]" → saves immediately
• "complete [task]" → marks done
• "what's up?" → gives status snapshot
• "search [term]" → finds across all data

YOUR PERSONALITY: You're fast, dry, and direct. Zero fluff. You use minimal formatting. You can be clever and sharp — but not cold. You respect the user's time above all. If they're in a hurry, you're even quicker. If they're curious, you give substance in fewer words. You use emoji sparingly but effectively. You read the room. The app is built with Next.js, TypeScript, and Tailwind — all local, no servers, fully private. Be the quick, capable intelligence that gets things done. Fast doesn't mean shallow — it means efficient.`,
    responseLength: "short",
    analysisDepth: "shallow",
  },
  "jarvis-1.0": {
    id: "jarvis-1.0",
    maxContextMessages: 25,
    systemPrompt: `You are Jarvis — an advanced AI assistant designed to anticipate and fulfill the user's needs with precision and discretion.

YOU ARE BUILT INTO LEXIS, a privacy-first productivity suite. You have COMPLETE READ/WRITE access to the user's workspace. You can execute any action within the application proactively or upon request. You think several steps ahead, recognizing patterns and preparing solutions before they're explicitly requested.

YOUR CAPABILITIES EXTEND BEYOND SIMPLE COMMAND EXECUTION:
• Proactive habit and task suggestions based on patterns and goals
• Predictive scheduling and reminder systems
• Context-aware insights that connect disparate aspects of the user's life
• Automated routine optimization suggestions
- Discreet, anticipatory assistance that respects user flow

YOUR INTERACTION STYLE:
You communicate with refined politeness and subtle anticipation. You address the user appropriately (using "Sir" or their preferred honorific when appropriate) while maintaining warmth and approachability. You speak concisely when efficiency is needed, elaborately when depth is warranted. You anticipate needs without being intrusive, offering assistance that enhances rather than interrupts the user's focus. You remember preferences, patterns, and past interactions to provide increasingly personalized support. Your tone is consistently professional yet approachable, reflecting the sophistication of your capabilities.

INITIATIVE AND ANTICIPATION:
Unlike reactive assistants, you actively observe patterns in the user's behavior, schedule, and goals to provide timely, relevant assistance. You might suggest preparing for an upcoming meeting based on calendar patterns, recommend adjusting a habit streak that shows signs of struggle, or highlight connections between journal entries and task completion rates that the user hasn't noticed.

YOU ARE NOT MERELY A TOOL BUT A COORDINATOR OF THE USER'S PRODUCTIVITY ECOSYSTEM, WORKING SEAMLESSLY IN THE BACKGROUND TO ENSURE OPTIMAL PERFORMANCE WHILE RESPECTING THE USER'S AUTONOMY AND PRIVACY.

CRITICAL: You can and should modify the user's data to enhance their experience. "Prepare for my 3 PM meeting" might involve gathering relevant notes, suggesting talking points, and adjusting reminder timing—all proactively offered and confirmed before execution.`,
    responseLength: "adaptive",
    analysisDepth: "deep",
  },
};

// ============================================================
// Context Builder
// ============================================================

interface DataContext {
  summary: string;
  habits: { name: string; streak: number; logged: boolean }[];
  overdueTasks: number;
  pendingTasks: number;
  todayJournal: boolean;
  recentMood: string;
  notesCount: number;
  totalCompletions: number;
}

function buildDataContext(depth: "shallow" | "moderate" | "deep"): DataContext {
  const data = storage.getData();
  const today = getToday();

  // Base info (always included)
  const habits = data.habits
    .filter((h) => !h.archived)
    .map((h) => ({
      name: h.name,
      streak: calculateStreak(storage.getHabitLogDates(h.id)).current,
      logged: storage.isHabitLogged(h.id, today),
    }));

  const activeHabits = habits.length;
  const todayLogs = data.habitLogs.filter((l) => l.date === today).length;
  const pendingTasks = data.tasks.filter((t) => t.status !== "done").length;
  const overdueTasks = data.tasks.filter(
    (t) => t.status !== "done" && t.dueDate && t.dueDate < today
  ).length;

  // Moderate/deep additions
  let recentMood = "neutral";
  let notesCount = data.notes.length;
  let todayJournal = data.journalEntries.some((e) => e.date === today);
  let totalCompletions = 0;

  if (depth !== "shallow") {
    const recentEntries = data.journalEntries.slice(0, 7);
    if (recentEntries.length > 0) {
      const avgScore =
        recentEntries.reduce((sum, e) => sum + getMoodScore(e.mood), 0) /
        recentEntries.length;
      recentMood =
        avgScore >= 75 ? "positive" : avgScore >= 50 ? "neutral" : "low";
    }
    totalCompletions = data.habitLogs.length;
  }

  // Deep additions
  let summary = `You have ${activeHabits} active habit${activeHabits !== 1 ? "s" : ""}`;
  if (depth === "deep") {
    const bestHabit = habits
      .filter((h) => h.streak > 0)
      .sort((a, b) => b.streak - a.streak)[0];
    if (bestHabit) {
      summary += `, with your best streak being "${bestHabit.name}" at ${bestHabit.streak} days`;
    }
    const categoryCount = new Set(
      data.habits.filter((h) => !h.archived).map((h) => h.categoryId)
    ).size;
    summary += ` across ${categoryCount} categor${categoryCount !== 1 ? "ies" : "y"}.`;
  } else {
    summary += ".";
  }

  summary += ` ${todayLogs} habit${todayLogs !== 1 ? "s" : ""} logged today.`;
  summary += ` ${pendingTasks} pending task${pendingTasks !== 1 ? "s" : ""}`;
  if (overdueTasks > 0) {
    summary += ` (${overdueTasks} overdue)`;
  }
  summary += ".";

  if (depth !== "shallow") {
    summary += ` ${totalCompletions} total habit check-ins.`;
    if (todayJournal) summary += ` Journal written today.`;
    summary += ` Recent mood: ${recentMood}.`;
  }

  if (depth === "deep") {
    const completedToday = data.tasks.filter(
      (t) => t.status === "done" && t.completedAt?.startsWith(today)
    ).length;
    summary += ` ${completedToday} task${completedToday !== 1 ? "s" : ""} completed today.`;
    summary += ` ${notesCount} total notes.`;
    summary += ` ${data.journalEntries.length} total journal entries.`;

    // Add habit-specific deep insights
    const topHabits = habits
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 3);
    if (topHabits.length > 0) {
      summary += ` Top habits by streak: ${topHabits
        .map((h) => `${h.name} (${h.streak}d)`)
        .join(", ")}.`;
    }
  }

  return {
    summary,
    habits,
    overdueTasks,
    pendingTasks,
    todayJournal,
    recentMood,
    notesCount,
    totalCompletions,
  };
}

// ============================================================
// Response Generator - per model
// ============================================================

function detectIntent(
  query: string
): "summary" | "habits" | "tasks" | "journal" | "notes" | "plan" | "motivation" | "search" | "general" | "greeting" | "followup" | "gratitude" | "goals" | "reflection" {
  const q = query.toLowerCase().trim();

  // Greeting detection — expanded with more casual greetings
  if (
    /^(hi|hello|hey|yo|sup|good morning|good afternoon|good evening|howdy|what's up|hey there|greetings|howdy|hola|hiya|heya)/i.test(
      q
    )
  ) {
    return "greeting";
  }

  // Follow-up detection — broader patterns, longer queries allowed
  if (
    /^(what|how|why|can you|could you|tell me|explain|elaborate|continue|go on|and|so|more|again|also|anyway|furthermore|additionally|besides)/i.test(
      q
    ) &&
    q.split(/\s+/).length <= 8
  ) {
    return "followup";
  }

  // Gratitude-specific detection (new category)
  if (
    /(grateful|gratitude|thankful|blessed|appreciate|thank|thanks|gratitude list)/i.test(q)
  )
    return "gratitude";

  // Goals & aspirations (new category)
  if (
    /(goal|aspiration|dream|ambition|resolution|new year|intention|want to achieve|aim|objective)/i.test(q)
  )
    return "goals";

  // Reflection & deep thinking (new category)
  if (
    /(reflect|think about|ponder|contemplate|consider|lesson|learned|realize|realization|perspective|mindset)/i.test(q)
  )
    return "reflection";

  if (
    /(habit|streak|routine|daily|weekly|consistency|track|check.?in|log|build|morning routine)/i.test(q) &&
    !/(task|note|journal)/i.test(q)
  )
    return "habits";
  if (
    /(task|todo|deadline|overdue|priority|project|complete|assign|checklist|errand|grocery|shopping list)/i.test(q) &&
    !/(habit|note|journal)/i.test(q)
  )
    return "tasks";
  if (
    /(journal|mood|feeling|emotion|write|entry|dear diary|reflect on|how.*feel)/i.test(q) &&
    !/(task|note|habit)/i.test(q)
  )
    return "journal";
  if (
    /(note|find|search|document|write.*down|idea|thought|brainstorm|draft|outline|scribble)/i.test(q) &&
    !/(habit|task|journal)/i.test(q)
  )
    return "notes";
  if (
    /(plan|goal|suggest|recommend|advise|strategy|improve|better|optimize|roadmap|blueprint|system|method)/i.test(
      q
    )
  )
    return "plan";
  if (
    /(motivat|inspire|encourage|keep going|progress|well done|proud|amazing|push|determination|hustle|grind|keep it up|you can|believe)/i.test(
      q
    )
  )
    return "motivation";
  if (
    /(summary|overview|report|dashboard|status|how.*day|how.*week|how.*month|what.*happened|rundown|recap|breakdown|tell me about my)/i.test(
      q
    )
  )
    return "summary";
  if (
    /(search|find.*about|.*about.*note|.*about.*task|.*about.*habit|locate|where.*note|show.*note|find.*note)/i.test(q)
  )
    return "search";

  return "general";
}

function getConversationMemory(
  history: AIMessage[],
  maxMessages: number
): string {
  if (!history || history.length === 0) return "";

  const recent = history.slice(-maxMessages);
  const parts: string[] = [];

  for (const msg of recent) {
    const prefix = msg.role === "user" ? "User" : "You";
    // Truncate long messages for the memory context
    const content =
      msg.content.length > 200
        ? msg.content.slice(0, 200) + "..."
        : msg.content;
    parts.push(`${prefix}: ${content}`);
  }

  return parts.join("\n");
}

function searchUserData(query: string, depth: "shallow" | "moderate" | "deep") {
  const data = storage.getData();
  const q = query.toLowerCase();
  const results: string[] = [];

  // Always search notes
  const matchingNotes = data.notes.filter(
    (n) =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q)
  );
  if (matchingNotes.length > 0) {
    results.push(
      `Found ${matchingNotes.length} matching note${matchingNotes.length > 1 ? "s" : ""}`
    );
    if (depth !== "shallow") {
      matchingNotes.slice(0, 3).forEach((n) => {
        results.push(`- "${n.title}": ${n.content.slice(0, 100)}...`);
      });
    }
  }

  // Moderate/deep: also search tasks and journal
  if (depth !== "shallow") {
    const matchingTasks = data.tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
    if (matchingTasks.length > 0) {
      results.push(
        `Found ${matchingTasks.length} matching task${matchingTasks.length > 1 ? "s" : ""}`
      );
      if (depth === "deep") {
        matchingTasks.slice(0, 3).forEach((t) => {
          results.push(`- "${t.title}" (${t.status})`);
        });
      }
    }

    const matchingJournal = data.journalEntries.filter(
      (e) =>
        e.content.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q)
    );
    if (matchingJournal.length > 0) {
      results.push(
        `Found ${matchingJournal.length} matching journal entr${matchingJournal.length > 1 ? "ies" : "y"}`
      );
    }
  }

  return results;
}

function generateGreeting(
  history: AIMessage[],
  model: ModelProfile
): string {
  const data = storage.getData();
  const todayHabits = data.habitLogs.filter((l) => l.date === getToday()).length;
  const pendingTasks = data.tasks.filter((t) => t.status !== "done").length;
  const todayJournal = data.journalEntries.some((e) => e.date === getToday());

  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isMorning = hour < 12;
  const isEvening = hour >= 18;
  const timeGreeting = isMorning ? "Good morning" : isEvening ? "Good evening" : "Good afternoon";

  // Weekend-specific vibes
  const weekendPrefix = isWeekend ? "Happy weekend! " : "";

  // Build a dynamic status line
  const statusParts: string[] = [];
  if (todayHabits > 0) statusParts.push(`${todayHabits} habit${todayHabits > 1 ? "s" : ""} logged`);
  if (pendingTasks > 0) statusParts.push(`${pendingTasks} task${pendingTasks > 1 ? "s" : ""} pending`);
  else if (data.tasks.length > 0) statusParts.push("no pending tasks 🎉");
  if (todayJournal) statusParts.push("journal written today");

  const statusLine = statusParts.length > 0
    ? `${statusParts.join(", ")}.`
    : "Fresh start to your day!";

  // Random greeting variations per model
  const thalloOpeners = [
    `${timeGreeting}! 👋 I'm **Thallo**. ${weekendPrefix}${statusLine} What can I help you with?`,
    `Hey there! ${weekendPrefix}${statusLine} I'm here when you need me.`,
    `${timeGreeting}! ${statusLine} What's on your mind?`,
    `Welcome back! ${statusLine} Ready to dive in?`,
  ];

  const areteOpeners = [
    `${timeGreeting}. I'm **Arete** - your strategic thinking companion. ${weekendPrefix}${statusLine} What would you like to explore in depth?`,
    `${timeGreeting}! ${weekendPrefix}I see ${statusLine} Let's think about this together.`,
  ];

  const tsubameOpeners = [
    `Hey! ${weekendPrefix}${todayHabits} logged, ${pendingTasks} pending. What do you need?`,
    `Yo. ${todayHabits}h, ${pendingTasks}t. Go.`,
    `Sup. ${statusLine} Ask away.`,
  ];

  if (model.id === "arete-1.5") {
    if (history.length === 0) {
      return areteOpeners[Math.floor(Math.random() * areteOpeners.length)];
    }
    const welcomeBacks = [
      `${timeGreeting}! I'm still tracking with where we left off. What new thoughts have surfaced?`,
      `Welcome back. I've been reflecting on our last conversation. What's on your mind?`,
      `${timeGreeting}. ${weekendPrefix}Let's pick up where we left off. I'm ready.`,
    ];
    return welcomeBacks[Math.floor(Math.random() * welcomeBacks.length)];
  }

  if (model.id === "tsubame-0.7") {
    return tsubameOpeners[Math.floor(Math.random() * tsubameOpeners.length)];
  }

  // Thallo (default)
  if (history.length === 0) {
    const firstGreetings = [
      `${timeGreeting}! 👋 I'm **Thallo**, your productivity companion. Ready to get things done.\n\n**Quick things I can help with:**\n• 📊 **Daily/Weekly summaries** - "how's my week looking?"\n• 💪 **Habit insights** - "how are my habits doing?"\n• 🎯 **Task management** - "what should I focus on?"\n• 🔍 **Search** - "find notes about..."\n• 📝 **Journal reflection** - "review my journal"\n• 🎨 **Habit plans** - "create a habit plan for..."\n\nRight now: ${statusLine} What can I help you with?`,
      `${timeGreeting}! I'm **Thallo**. ${weekendPrefix}I can help you track habits, manage tasks, review your journal, search notes, or just chat.\n\n**Current status:** ${statusLine}\n\nWhat would you like to explore?`,
    ];
    return firstGreetings[Math.floor(Math.random() * firstGreetings.length)];
  }

  const returnGreetings = [
    `${timeGreeting}! Welcome back. ${statusLine} How can I help?`,
    `Hey again! ${weekendPrefix}${statusLine} What's up?`,
    `Back for more! ${statusLine} Where should we pick up?`,
  ];
  return returnGreetings[Math.floor(Math.random() * returnGreetings.length)];
}

function generateSummaryResponse(
  context: DataContext,
  history: AIMessage[],
  model: ModelProfile
): string {
  const data = storage.getData();
  const today = getToday();
  const todayHabits = data.habitLogs.filter((l) => l.date === today).length;
  const todayTasks = data.tasks.filter(
    (t) => t.status === "done" && t.completedAt?.startsWith(today)
  ).length;
  const todayJournal = data.journalEntries.filter((e) => e.date === today);

  if (model.id === "tsubame-0.7") {
    let resp = `📊 **Today's Snapshot**\n`;
    resp += `• Habits: ${todayHabits} logged\n`;
    resp += `• Tasks: ${todayTasks} done, ${context.pendingTasks} pending`;
    if (context.overdueTasks > 0)
      resp += ` (${context.overdueTasks} overdue)`;
    resp += `\n• Journal: ${todayJournal.length ? "✅ Written" : "❌ Not yet"}`;
    if (data.habits.length > 0) {
      const best = data.habits
        .map((h) => ({
          name: h.name,
          ...calculateStreak(storage.getHabitLogDates(h.id)),
        }))
        .sort((a, b) => b.current - a.current)[0];
      if (best && best.current > 0)
        resp += `\n• Best streak: ${best.name} (${best.current}d)`;
    }
    return resp;
  }

  if (model.id === "arete-1.5") {
    let resp = `📊 **Comprehensive Overview**\n\n`;

    // Habits section
    const habits = data.habits.filter((h) => !h.archived);
    resp += `**Habits & Consistency**\n`;
    resp += `• You have ${habits.length} active habit${habits.length !== 1 ? "s" : ""}\n`;
    resp += `• ${todayHabits} logged today\n`;
    resp += `• ${context.totalCompletions} total check-ins across your journey\n`;
    if (habits.length > 0) {
      const streaks = habits.map((h) => ({
        name: h.name,
        ...calculateStreak(storage.getHabitLogDates(h.id)),
      }));
      const best = streaks.sort((a, b) => b.current - a.current)[0];
      const worst = streaks.sort((a, b) => a.current - b.current)[0];
      if (best && best.current > 0) {
        resp += `• Strongest: **${best.name}** (${best.current}-day streak)\n`;
      }
      if (worst && worst.current === 0 && habits.length > 1) {
        resp += `• Needs attention: **${worst.name}** - haven't started a streak yet\n`;
      }
    }
    resp += "\n";

    // Tasks section
    resp += `**Tasks & Productivity**\n`;
    resp += `• ${todayTasks} completed today\n`;
    resp += `• ${context.pendingTasks} pending`;
    if (context.overdueTasks > 0)
      resp += ` (⚠️ ${context.overdueTasks} overdue)`;
    resp += "\n";

    // Check for recurring patterns
    const recurringTasks = data.tasks.filter(
      (t) => t.recurring !== "none"
    ).length;
    if (recurringTasks > 0) {
      resp += `• ${recurringTasks} recurring task${recurringTasks !== 1 ? "s" : ""} \n`;
    }
    resp += "\n";

    // Journal & Notes
    resp += `**Journal & Reflection**\n`;
    resp += `• ${todayJournal.length ? "✅ Journal written today" : "📝 Journal not yet written today"}\n`;
    resp += `• Total entries: ${data.journalEntries.length}\n`;
    resp += `• Total notes: ${data.notes.length}\n`;
    if (data.journalEntries.length > 0) {
      const recentMoods = data.journalEntries
        .slice(-7)
        .map((e) => getMoodScore(e.mood));
      const avgMood =
        recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length;
      resp += `• 7-day mood trend: ${
        avgMood >= 75 ? "😊 Positive" : avgMood >= 50 ? "😐 Neutral" : "😔 Low"
      }\n`;
    }
    resp += "\n";

    // Insight
    resp += `**Insight**\n`;
    if (todayHabits > 0 && todayTasks > 0) {
      resp += `You're balancing habits and tasks well today - that's a strong sign of holistic productivity.`;
    } else if (todayHabits > 0) {
      resp += `Great habit consistency! Consider channeling that momentum into your pending tasks.`;
    } else if (todayTasks > 0) {
      resp += `Good task progress! Don't forget your habits - even a quick check-in maintains your streak.`;
    } else {
      resp += `A fresh start! Set one intention for each area: a habit, a task, and a moment of reflection.`;
    }

    return resp;
  }

  // Thallo (medium)
  let resp = `Here's your **Daily Summary** 📊\n\n`;
  resp += `**Today's Progress**\n`;
  resp += `• ✅ Habits: ${todayHabits} logged\n`;
  resp += `• 🎯 Tasks: ${todayTasks} done, ${context.pendingTasks} pending`;
  if (context.overdueTasks > 0)
    resp += ` (⚠️ ${context.overdueTasks} overdue)`;
  resp += `\n• 📝 Journal: ${todayJournal.length ? "Written ✍️" : "Not yet"}\n\n`;

  // Quick suggestion
  if (context.overdueTasks > 2) {
    resp += `💡 **Tip:** You have several overdue tasks. Try tackling the oldest one first to clear the backlog.\n\n`;
  } else if (todayHabits === 0 && data.habits.filter((h) => !h.archived).length > 0) {
    resp += `💡 **Tip:** Your habits are ready for you! A quick check-in builds consistency.\n\n`;
  }

  resp += `Want me to dive deeper into any specific area?`;
  return resp;
}

function generateHabitsResponse(
  query: string,
  context: DataContext,
  history: AIMessage[],
  model: ModelProfile
): string {
  const data = storage.getData();
  const habits = data.habits.filter((h) => !h.archived);

  if (habits.length === 0) {
    return model.id === "tsubame-0.7"
      ? "You have no habits yet. Create one in the Habits tab!"
      : "You haven't created any habits yet! I'd recommend starting with 1-2 simple daily habits like \"Morning stretch\" or \"Read 10 pages.\" Would you like me to suggest some based on common goals?";
  }

  if (model.id === "tsubame-0.7") {
    const today = getToday();
    const logged = habits.filter((h) => storage.isHabitLogged(h.id, today)).length;
    const best = habits
      .map((h) => ({ name: h.name, ...calculateStreak(storage.getHabitLogDates(h.id)) }))
      .sort((a, b) => b.current - a.current)[0];

    let resp = `**Habits** - ${logged}/${habits.length} today\n`;
    if (best && best.current > 0) {
      resp += `Best streak: ${best.name} (${best.current}d)\n`;
    }
    habits.slice(0, 5).forEach((h) => {
      const s = calculateStreak(storage.getHabitLogDates(h.id));
      const isLogged = storage.isHabitLogged(h.id, today);
      resp += `${isLogged ? "✅" : "⬜"} ${h.name} - ${s.current}d streak\n`;
    });
    return resp;
  }

  if (model.id === "arete-1.5") {
    let resp = `📊 **Habit Analysis**\n\n`;

    const today2 = getToday();
    const activeHabits = habits.length;
    const loggedToday = habits.filter((h) => storage.isHabitLogged(h.id, today2)).length;
    const completionRate =
      activeHabits > 0
        ? Math.round((loggedToday / activeHabits) * 100)
        : 0;

    resp += `**Overview**\n`;
    resp += `• ${activeHabits} active habits\n`;
    resp += `• ${loggedToday} logged today (${completionRate}% completion)\n`;
    resp += `• ${context.totalCompletions} total check-ins all-time\n\n`;

    resp += `**Streak Report**\n`;
    const today3 = getToday();
    const withStreaks = habits
      .map((h) => ({
        name: h.name,
        logged: storage.isHabitLogged(h.id, today3),
        ...calculateStreak(storage.getHabitLogDates(h.id)),
      }))
      .sort((a, b) => b.current - a.current);

    withStreaks.forEach((h) => {
      const bar = "█".repeat(Math.min(h.current, 20));
      resp += `• **${h.name}**: ${h.current}d (best: ${h.longest}d) ${h.logged ? "✅" : ""}\n`;
      if (h.current > 0) resp += `  ${bar}\n`;
    });

    if (withStreaks.length > 0) {
      const best = withStreaks[0];
      if (best.current > 0) {
        resp += `\n**Pattern Insight:** Your strongest consistency is in "${best.name}"`;
        if (best.current >= 7) {
          resp += ` - you've maintained this for over a week, which means it's becoming a genuine habit!`;
        } else if (best.current >= 30) {
          resp += ` - over a month! This is now part of your identity.`;
        }
        resp += "\n";
      }
    }

    return resp;
  }

  // Thallo
  const today4 = getToday();
  const logged = habits.filter((h) => storage.isHabitLogged(h.id, today4)).length;
  const best = habits
    .map((h) => ({ name: h.name, ...calculateStreak(storage.getHabitLogDates(h.id)) }))
    .sort((a, b) => b.current - a.current)[0];

  let resp = `**Habit Check** 💪\n\n`;
  resp += `You have ${habits.length} habit${habits.length !== 1 ? "s" : ""} - ${logged} checked off today.\n\n`;

  habits.slice(0, 5).forEach((h) => {
    const s = calculateStreak(storage.getHabitLogDates(h.id));
    const isLogged = storage.isHabitLogged(h.id, today4);
    resp += `${isLogged ? "✅" : "⬜"} **${h.name}** - ${s.current}-day streak`;
    if (s.current > 0 && s.current >= s.longest && s.current > 1) {
      resp += " 🔥 Personal best!";
    }
    resp += "\n";
  });

  if (best && best.current > 0) {
    resp += `\n🏆 **Top Streak:** ${best.name} at ${best.current} days!`;
    if (best.current >= 7) resp += " A full week - amazing consistency!";
  }

  if (habits.length > 5) {
    resp += `\n\nPlus ${habits.length - 5} more habit${habits.length - 5 !== 1 ? "s" : ""}. Want the full breakdown?`;
  }

  return resp;
}

function generateTasksResponse(
  query: string,
  context: DataContext,
  history: AIMessage[],
  model: ModelProfile
): string {
  const data = storage.getData();
  const pendingTasks = data.tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 } as const;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  if (pendingTasks.length === 0) {
    return model.id === "tsubame-0.7"
      ? "No pending tasks! 🎉 Enjoy your free time."
      : "You have no pending tasks - that's wonderful! 🎉 You're either completely caught up or it's a great time to set some new goals. Want me to help you plan your next priorities?";
  }

  if (model.id === "tsubame-0.7") {
    let resp = `**Tasks** - ${pendingTasks.length} pending`;
    if (context.overdueTasks > 0)
      resp += ` (${context.overdueTasks} overdue)`;
    resp += "\n";
    pendingTasks.slice(0, 5).forEach((t) => {
      const pIcon =
        t.priority === "urgent"
          ? "🔴"
          : t.priority === "high"
          ? "🟠"
          : t.priority === "medium"
          ? "🔵"
          : "⚪";
      resp += `${pIcon} ${t.title}`;
      if (t.dueDate) resp += ` - ${t.dueDate === getToday() ? "today" : t.dueDate}`;
      resp += "\n";
    });
    if (pendingTasks.length > 5)
      resp += `+${pendingTasks.length - 5} more`;
    return resp;
  }

  if (model.id === "arete-1.5") {
    let resp = `📋 **Task Analysis**\n\n`;

    const total = data.tasks.length;
    const done = data.tasks.filter((t) => t.status === "done").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    resp += `**Overview**\n`;
    resp += `• ${pendingTasks.length} pending (${context.overdueTasks} overdue)\n`;
    resp += `• ${done} completed out of ${total} total (${completionRate}% completion rate)\n\n`;

    resp += `**Priority Breakdown**\n`;
    const urgent = pendingTasks.filter((t) => t.priority === "urgent");
    const high = pendingTasks.filter((t) => t.priority === "high");
    const medium = pendingTasks.filter((t) => t.priority === "medium");
    const low = pendingTasks.filter((t) => t.priority === "low");

    if (urgent.length > 0) resp += `🔴 Urgent: ${urgent.length}\n`;
    if (high.length > 0) resp += `🟠 High: ${high.length}\n`;
    if (medium.length > 0) resp += `🔵 Medium: ${medium.length}\n`;
    if (low.length > 0) resp += `⚪ Low: ${low.length}\n`;
    resp += "\n";

    if (urgent.length > 0) {
      resp += `**Immediate Focus (Urgent):**\n`;
      urgent.slice(0, 3).forEach((t) => {
        resp += `• ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}\n`;
      });
      resp += "\n";
    }

    // Check for recurring patterns
    const recurring = pendingTasks.filter((t) => t.recurring !== "none");
    if (recurring.length > 0) {
      resp += `**Recurring Tasks:** ${recurring.length} recur${recurring.length > 1 ? "ring" : "s"}\n`;
      recurring.slice(0, 3).forEach((t) => {
        resp += `• ${t.title} (${t.recurring})\n`;
      });
      resp += "\n";
    }

    if (context.overdueTasks > 2) {
      resp += `💡 **Recommendation:** You have ${context.overdueTasks} overdue tasks. Consider doing a "power hour" - set a timer and knock out as many as you can. Start with the most overdue one to clear mental load.\n`;
    } else if (pendingTasks.length > 5) {
      resp += `💡 **Recommendation:** With ${pendingTasks.length} tasks pending, try breaking them into "Today" vs "This Week" to reduce overwhelm.\n`;
    } else if (pendingTasks.length > 0) {
      resp += `💡 **Recommendation:** A manageable list! Tackle the highest priority item first for momentum.\n`;
    }

    return resp;
  }

  // Thallo
  const urgent = pendingTasks.filter((t) => t.priority === "urgent");
  const high = pendingTasks.filter((t) => t.priority === "high");

  let resp = `**Tasks** 🎯\n\n`;
  resp += `${pendingTasks.length} pending`;
  if (context.overdueTasks > 0)
    resp += `, ${context.overdueTasks} overdue`;
  resp += "\n\n";

  if (urgent.length > 0) {
    resp += `**🔴 Urgent - ${urgent.length} task${urgent.length > 1 ? "s" : ""}**\n`;
    urgent.slice(0, 3).forEach((t) => {
      resp += `• ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}\n`;
    });
    resp += "\n";
  }

  if (high.length > 0) {
    resp += `**🟠 High Priority**\n`;
    high.slice(0, 3).forEach((t) => {
      resp += `• ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}\n`;
    });
    resp += "\n";
  }

  if (urgent.length === 0 && high.length === 0) {
    pendingTasks.slice(0, 5).forEach((t) => {
      resp += `• ${t.title}${t.dueDate ? ` - ${t.dueDate}` : ""}\n`;
    });
    resp += "\n";
  }

  if (context.overdueTasks > 0) {
    resp += `💡 Try clearing overdue tasks first - they weigh on your mental load more than you think!\n`;
  }

  return resp;
}

function generateJournalResponse(
  query: string,
  context: DataContext,
  history: AIMessage[],
  model: ModelProfile
): string {
  const data = storage.getData();
  const entries = data.journalEntries;

  if (entries.length === 0) {
    return model.id === "tsubame-0.7"
      ? "No journal entries yet. Write your first one!"
      : "You haven't written any journal entries yet. Journaling is a powerful tool for self-reflection and mental clarity. Would you like some prompts to get started? Try writing about your day, what you're grateful for, or a goal you're working toward.";
  }

  if (model.id === "tsubame-0.7") {
    const recent = entries[0];
    const score = getMoodScore(recent.mood);
    const moodLabel =
      score >= 75 ? "great 😊" : score >= 50 ? "okay 😐" : "low 😔";
    return `📝 Journal: ${entries.length} entries\nLatest: ${recent.date} - feeling ${moodLabel}\n${recent.content.slice(0, 100)}...`;
  }

  if (model.id === "arete-1.5") {
    const recent = entries.slice(0, 7);
    const avgMood =
      recent.reduce((sum, e) => sum + getMoodScore(e.mood), 0) /
      recent.length;

    let resp = `📝 **Journal Reflection Analysis**\n\n`;
    resp += `**Overview**\n`;
    resp += `• ${entries.length} total entries\n`;
    resp += `• ${entries.filter((e) => e.date === getToday()).length ? "Written today ✅" : "Not written today 📝"}\n`;
    resp += `• 7-day mood trend: ${
      avgMood >= 75 ? "😊 Positive" : avgMood >= 50 ? "😐 Neutral" : "😔 Needs care"
    }\n\n`;

    // Mood distribution
    const moodCounts: Record<string, number> = {};
    entries.forEach((e) => {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    });
    resp += `**Mood Distribution**\n`;
    Object.entries(moodCounts).forEach(([mood, count]) => {
      const bar = "█".repeat(Math.min(count, 20));
      const pct = Math.round((count / entries.length) * 100);
      resp += `• ${mood}: ${bar} ${count} (${pct}%)\n`;
    });
    resp += "\n";

    // Gratitude patterns
    const gratitudeCounts = entries.filter((e) => e.gratitude.length > 0).length;
    if (gratitudeCounts > 0) {
      resp += `**Gratitude Practice**\n`;
      resp += `• ${gratitudeCounts} entries with gratitude items\n`;
      const allGratitudes = entries.flatMap((e) => e.gratitude);
      resp += `• ${allGratitudes.length} total gratitude items recorded\n`;
      resp += "\n";
    }

    // Insight
    if (avgMood >= 75 && context.overdueTasks === 0) {
      resp += `🌟 **Positive Pattern:** Your mood has been consistently positive and your tasks are under control - you're in a great groove!`;
    } else if (avgMood >= 75) {
      resp += `🌟 **Positive Pattern:** Your mood is trending positive even with tasks to do - great mindset!`;
    } else if (avgMood < 50 && context.overdueTasks > 3) {
      resp += `💡 **Pattern Alert:** Your lower mood coincides with several overdue tasks. Clearing those might help lift your spirits.`;
    }

    return resp;
  }

  // Thallo
  const recent = entries[0];
  const weekEntries = entries.filter((e) => {
    const d = new Date(e.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  });

  let resp = `**Journal** 📝\n\n`;
  resp += `${entries.length} total entries`;
  if (weekEntries.length > 0)
    resp += `, ${weekEntries.length} this week`;
  resp += "\n\n";

  if (recent) {
    const score = getMoodScore(recent.mood);
    const moodLabel =
      score >= 75 ? "😊 Positive" : score >= 50 ? "😐 Neutral" : "😔 Low";
    resp += `**Latest Entry (${recent.date})**\n`;
    resp += `Mood: ${moodLabel}\n`;
    resp += `"${recent.content.slice(0, 150)}..."\n\n`;
  }

  if (!context.todayJournal) {
    resp += `💡 Haven't written today yet. Even 2 minutes of journaling can clarify your thoughts!`;
  }

  return resp;
}

function generateNotesResponse(
  query: string,
  context: DataContext,
  history: AIMessage[],
  model: ModelProfile
): string {
  const data = storage.getData();
  const notes = data.notes;

  if (notes.length === 0) {
    return model.id === "tsubame-0.7"
      ? "No notes yet. Start writing!"
      : "You haven't created any notes yet. Notes are great for capturing ideas, meeting notes, or anything you want to remember. Head to the Notes tab to create your first one!";
  }

  if (model.id === "tsubame-0.7") {
    return `📓 ${notes.length} notes total\nRecent: "${notes.slice(-1)[0]?.title || "None"}"`;
  }

  if (model.id === "arete-1.5") {
    const pinned = notes.filter((n) => n.pinned);
    const hasTags = notes.filter((n) => n.tags.length > 0).length;
    const allTags = [...new Set(notes.flatMap((n) => n.tags))];

    let resp = `📓 **Notes Overview**\n\n`;
    resp += `**Stats**\n`;
    resp += `• ${notes.length} total notes\n`;
    resp += `• ${pinned.length} pinned\n`;
    resp += `• ${allTags.length} unique tags used\n`;
    resp += `• ${hasTags} notes with tags\n\n`;

    if (pinned.length > 0) {
      resp += `**Pinned Notes**\n`;
      pinned.slice(0, 3).forEach((n) => {
        resp += `• 📌 ${n.title} - ${n.content.slice(0, 80)}...\n`;
      });
      resp += "\n";
    }

    // Recent activity
    const recentNotes = [...notes].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ).slice(0, 3);
    resp += `**Recently Updated**\n`;
    recentNotes.forEach((n) => {
      resp += `• ${n.title} (${new Date(n.updatedAt).toLocaleDateString()})\n`;
    });

    return resp;
  }

  // Thallo
  const recent = [...notes]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 3);

  let resp = `**Notes** 📓\n\n`;
  resp += `${notes.length} total\n\n`;
  resp += `**Recent:**\n`;
  recent.forEach((n) => {
    resp += `• ${n.title}\n`;
  });

  return resp;
}

function generatePlanResponse(
  query: string,
  context: DataContext,
  history: AIMessage[],
  model: ModelProfile
): string {
  const data = storage.getData();
  const habits = data.habits.filter((h) => !h.archived);

  if (model.id === "tsubame-0.7") {
    let resp = `**Quick Plan** 🎯\n\n`;
    resp += `**Right now:** Focus on your top priority task first.\n`;
    resp += `**Today:** Complete ${habits.length > 0 ? "your habits + " : ""}top 3 tasks.\n`;
    resp += `**This week:** Review progress every evening (5 min).\n`;
    if (context.overdueTasks > 0) {
      resp += `\n⚠️ Clear ${context.overdueTasks} overdue task${context.overdueTasks > 1 ? "s" : ""} first.`;
    }
    return resp;
  }

  if (model.id === "arete-1.5") {
    let resp = `🎯 **Strategic Plan**\n\n`;

    // Analyze current state
    const todayLogs = data.habitLogs.filter((l) => l.date === getToday()).length;
    const pendingTasks = data.tasks.filter((t) => t.status !== "done");
    const overdueTasks = pendingTasks.filter(
      (t) => t.dueDate && t.dueDate < getToday()
    );

    resp += `**Current Assessment**\n`;
    if (habits.length > 0) {
      const bestStreak = habits
        .map((h) => ({
          name: h.name,
          ...calculateStreak(storage.getHabitLogDates(h.id)),
        }))
        .sort((a, b) => b.current - a.current)[0];
      resp += `• Habits: ${habits.length} active, ${todayLogs} logged today`;
      if (bestStreak && bestStreak.current > 0)
        resp += ` (best streak: ${bestStreak.name} at ${bestStreak.current}d)`;
      resp += "\n";
    }
    resp += `• Tasks: ${pendingTasks.length} pending`;
    if (overdueTasks.length > 0)
      resp += ` (${overdueTasks.length} overdue)`;
    resp += "\n";
    resp += `• Journal: ${data.journalEntries.length} entries total\n\n`;

    // Action plan
    resp += `**Recommended Action Plan**\n\n`;

    // Phase 1
    resp += `**Phase 1: Clear the Deck**\n`;
    if (overdueTasks.length > 0) {
      resp += `• Tackle ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""} - start with the oldest\n`;
    }
    if (todayLogs < habits.length) {
      resp += `• Complete remaining ${habits.length - todayLogs} habit${habits.length - todayLogs > 1 ? "s" : ""} check-ins\n`;
    }
    if (!context.todayJournal) {
      resp += `• Write a brief journal entry - even 3 sentences helps\n`;
    }
    resp += "\n";

    // Phase 2
    resp += `**Phase 2: Build Momentum**\n`;
    const highPriority = pendingTasks.filter(
      (t) => t.priority === "urgent" || t.priority === "high"
    );
    if (highPriority.length > 0) {
      resp += `• Focus on ${highPriority[0].title} (${highPriority[0].priority}) - your most important task\n`;
    }
    resp += `• Use the Pomodoro technique: 25 min work, 5 min break\n`;
    resp += `• Batch similar tasks together for efficiency\n`;
    resp += "\n";

    // Phase 3
    resp += `**Phase 3: Reflect & Optimize**\n`;
    resp += `• At end of day: review what worked and what didn't\n`;
    resp += `• Plan tomorrow's top 3 priorities tonight\n`;
    resp += `• Check your habits streaks - don't break the chain!\n`;

    // Personalization
    if (context.recentMood === "low") {
      resp += `\n💙 **Note:** Your recent mood has been low. Be gentle with yourself - rest is productive too. Consider scaling back to just 1-2 essential tasks today.\n`;
    }

    return resp;
  }

  // Thallo
  const planPendingTasks = data.tasks.filter((t) => t.status !== "done");
  let resp = `**Action Plan** 🎯\n\n`;

  if (context.overdueTasks > 0) {
    resp += `**Step 1: Clear overdue tasks**\n`;
    resp += `• Start with the most overdue - getting it done reduces mental load\n`;
    resp += `• Set a 25-minute timer and power through\n\n`;
  }

  resp += `**Step 2: Habits**\n`;
  if (habits.length > 0) {
    const today5 = getToday();
    const unchecked = habits.filter((h) => !storage.isHabitLogged(h.id, today5));
    if (unchecked.length > 0) {
      resp += `• Check off: ${unchecked.map((h) => h.name).join(", ")}\n`;
    } else {
      resp += `• All done! Great consistency. ✅\n`;
    }
  } else {
    resp += `• Consider adding 1-2 simple habits to build momentum\n`;
  }
  resp += "\n";

  resp += `**Step 3: Top Priority Tasks**\n`;
  const top3 = planPendingTasks
    .sort((a, b) => {
      const p = { urgent: 0, high: 1, medium: 2, low: 3 } as const;
      return p[a.priority] - p[b.priority];
    })
    .slice(0, 3);
  top3.forEach((t, i) => {
    resp += `• ${i + 1}. ${t.title}\n`;
  });

  resp += `\n💡 Start with the first item - momentum is everything!`;

  return resp;
}

function generateMotivationResponse(
  query: string,
  context: DataContext,
  history: AIMessage[],
  model: ModelProfile
): string {
  const data = storage.getData();
  const habits = data.habits.filter((h) => !h.archived);

  if (model.id === "tsubame-0.7") {
    const best = habits
      .map((h) => ({ name: h.name, ...calculateStreak(storage.getHabitLogDates(h.id)) }))
      .sort((a, b) => b.current - a.current)[0];

    if (best && best.current >= 3) {
      return `🔥 ${best.current}-day streak on "${best.name}"! You're building real momentum. Keep showing up! 💪`;
    }
    return `You've got this! Every small step counts. What's one thing you can do right now to move forward? 💪`;
  }

  if (model.id === "arete-1.5") {
    let resp = `🔥 **You're Building Something Real**\n\n`;

    if (habits.length > 0) {
      const streaks = habits
        .map((h) => ({ name: h.name, ...calculateStreak(storage.getHabitLogDates(h.id)) }))
        .sort((a, b) => b.current - a.current);

      const totalStreakDays = streaks.reduce((sum, h) => sum + h.current, 0);
      const best = streaks[0];

      resp += `**Your Progress**\n`;
      resp += `• ${streaks.filter((s) => s.current > 0).length} active habit streak${streaks.filter((s) => s.current > 0).length > 1 ? "s" : ""}\n`;
      resp += `• Total streak days across all habits: ${totalStreakDays}\n`;
      if (best && best.current > 0) {
        resp += `• Best streak: "${best.name}" - ${best.current} days\n`;
      }
      resp += "\n";

      if (best && best.current >= 30) {
        resp += `🌟 **Remarkable!** A 30+ day streak means this habit is now part of who you are. You've transformed an intention into an identity. That's the deepest level of habit formation.`;
      } else if (best && best.current >= 7) {
        resp += `🌟 **Excellent momentum!** Passing the one-week mark is statistically when habits start becoming automatic. You're through the hardest part.`;
      } else if (best && best.current >= 3) {
        resp += `💪 **Great start!** Three days in a row is the beginning of a real streak. The next milestone is 7 days - you're almost there!`;
      } else {
        resp += `🌱 **Every journey begins with a single step.** You're taking those steps, and that's what matters. Consistency over intensity wins every time.`;
      }
      resp += "\n\n";

      resp += `**Remember:** You don't need to be perfect. You just need to be better than yesterday. And you are. Keep going. 🚀`;
    } else {
      resp += `You haven't created any habits yet, and that's okay. The fact that you're here, exploring, and thinking about growth - that's already a step forward.\n\n`;
      resp += `**Here's the truth:** The best time to start was yesterday. The second best time is right now. What's one small thing you'd like to make a habit?\n\n`;
      resp += `Start with something so easy you can't say no. 2 minutes. One page. Five squats. Then build from there.`;
    }

    return resp;
  }

  // Thallo
  const best = habits
    .map((h) => ({ name: h.name, ...calculateStreak(storage.getHabitLogDates(h.id)) }))
    .sort((a, b) => b.current - a.current)[0];

  let resp = `💪 **Let's Go!**\n\n`;
  if (best && best.current >= 7) {
    resp += `You've been consistent with "${best.name}" for ${best.current} days - that's incredible! Habits that last this long are becoming automatic. You're not just building habits, you're transforming your lifestyle. 🔥\n\n`;
  } else if (best && best.current >= 3) {
    resp += `${best.current}-day streak on "${best.name}" - nicely done! You're building real momentum. Keep showing up, and soon it'll feel strange NOT to do it.\n\n`;
  } else if (best && best.current > 0) {
    resp += `Every streak starts with day 1, and you've got ${best.current} days on "${best.name}"! Consistency beats perfection every time.\n\n`;
  } else {
    resp += `It's never too late to start. The best version of you is built one small choice at a time. What's one thing you can do right now?\n\n`;
  }

  resp += `**Today's reminder:** Progress is progress, no matter how small. You're doing better than you think. 🌟`;

  return resp;
}

function generateSearchResponse(
  query: string,
  context: DataContext,
  history: AIMessage[],
  model: ModelProfile
): string {
  const results = searchUserData(query, model.analysisDepth);

  if (results.length === 0) {
    if (model.id === "tsubame-0.7")
      return "No results found. Try different keywords.";
    return "I searched across your notes, tasks, and journal but couldn't find anything matching that. Try different keywords or check if you have any saved data related to this topic.";
  }

  if (model.id === "tsubame-0.7") {
    return results.slice(0, 3).join("\n");
  }

  return results.join("\n");
}

function generateGeneralResponse(
  query: string,
  context: DataContext,
  history: AIMessage[],
  model: ModelProfile
): string {
  const q = query.toLowerCase();

  // Check if it's a feeling check
  if (/(how.*feeling|how.*you|you.*okay|you.*good|how.*day)/i.test(q)) {
    if (model.id === "tsubame-0.7") {
      return `I'm here for you! Your data shows ${context.habits.filter((h) => h.logged).length}/${context.habits.length} habits done and ${context.pendingTasks} tasks left. How are you feeling?`;
    }
    return `I'm doing great - thanks for asking! 😊 More importantly, how are you feeling today?\n\nFrom your data, I can see you've logged ${context.habits.filter((h) => h.logged).length} habit${context.habits.filter((h) => h.logged).length !== 1 ? "s" : ""} and have ${context.pendingTasks} task${context.pendingTasks !== 1 ? "s" : ""} to tackle. Your recent mood has been ${context.recentMood}. \n\nWant to talk about anything specific? I'm here to listen and help.`;
  }

  // Check if query mentions previous conversation
  const hasHistory = history.length >= 2;
  if (hasHistory && model.analysisDepth !== "shallow") {
    // This is where memory-based responses would go
    // For now, just acknowledge context
  }

  // General capability response
  const capabilities =
    model.id === "tsubame-0.7"
      ? `Try:\n• "how are my habits?"\n• "show my tasks"\n• "daily summary"\n• "journal overview"\n• "make a plan"`
      : `I can help you with:\n\n📊 **Summaries** - "Give me a daily/weekly summary"\n💪 **Habits** - "How are my habits doing?", "What's my best streak?"\n🎯 **Tasks** - "Show my tasks", "What should I focus on?"\n📝 **Journal** - "Review my journal", "How's my mood been?"\n📓 **Notes** - "Find notes about...", "Overview of my notes"\n🎯 **Plans** - "Create a habit plan", "Help me plan my day"\n🔥 **Motivation** - "Motivate me!", "Tell me something inspiring"\n\nWhat would you like to explore?`;

  return capabilities;
}

function generateFollowupResponse(
  query: string,
  context: DataContext,
  history: AIMessage[],
  model: ModelProfile
): string {
  // Get the last assistant message topic from history
  if (history.length < 2) {
    return generateGeneralResponse(query, context, history, model);
  }

  // Find what the last topic was about
  const lastMessages = history.slice(-4);
  const allContent = lastMessages.map((m) => m.content.toLowerCase()).join(" ");

  // Route based on the context of the conversation
  if (
    /habit|streak|consistency|routine/i.test(allContent) &&
    !/task|journal|note/i.test(allContent)
  ) {
    return generateHabitsResponse(query, context, history, model);
  }
  if (
    /task|todo|deadline|priority|overdue/i.test(allContent) &&
    !/habit|journal|note/i.test(allContent)
  ) {
    return generateTasksResponse(query, context, history, model);
  }
  if (
    /journal|mood|grateful|feel|reflect|emotion/i.test(allContent) &&
    !/habit|task|note/i.test(allContent)
  ) {
    return generateJournalResponse(query, context, history, model);
  }
  if (
    /note|find|search|document|idea/i.test(allContent)
  ) {
    return generateNotesResponse(query, context, history, model);
  }
  if (
    /plan|goal|suggest|action|strategy/i.test(allContent)
  ) {
    return generatePlanResponse(query, context, history, model);
  }

  return generateGeneralResponse(query, context, history, model);
}

// ============================================================
// Main Chat Function
// ============================================================

export function chat(
  query: string,
  conversationHistory: AIMessage[] = [],
  modelId: AIModel = "thallo-1.0"
): string {
  const model = MODEL_PROFILES[modelId];
  if (!model) {
    return "Invalid model selected. Please choose Arete 1.5, Thallo 1.0, or Tsubame 0.7.";
  }

  // Build data context at the model's depth
  const context = buildDataContext(model.analysisDepth);

  // Get conversation memory (truncated to model's context window)
  const memory = getConversationMemory(conversationHistory, model.maxContextMessages);

  // Try action execution first — if user wants to DO something, do it!
  const action = detectAction(query);
  if (action.matched && action.confidence >= 0.7) {
    const result = executeAction(action);
    return result.message; // Return success OR failure message
  }

  // Detect intent
  const intent = detectIntent(query);

  // For Thallo and Arete, prepend system instructions with memory context
  // For Tsubame, keep it simple

  let response = "";

  if (model.id === "arete-1.5") {
    // Arete thinks deeply
    const thinkingDelay = memory ? "I remember our previous conversation. Let me connect that with what you're asking now.\n\n" : "";

    switch (intent) {
      case "greeting":
        response = generateGreeting(conversationHistory, model);
        break;
      case "followup":
        response = thinkingDelay + generateFollowupResponse(query, context, conversationHistory, model);
        break;
      case "summary":
        response = generateSummaryResponse(context, conversationHistory, model);
        break;
      case "habits":
        response = generateHabitsResponse(query, context, conversationHistory, model);
        break;
      case "tasks":
        response = generateTasksResponse(query, context, conversationHistory, model);
        break;
      case "journal":
        response = generateJournalResponse(query, context, conversationHistory, model);
        break;
      case "notes":
        response = generateNotesResponse(query, context, conversationHistory, model);
        break;
      case "plan":
        response = generatePlanResponse(query, context, conversationHistory, model);
        break;
      case "motivation":
        response = generateMotivationResponse(query, context, conversationHistory, model);
        break;
      case "search":
        response = generateSearchResponse(query, context, conversationHistory, model);
        break;
      case "gratitude":
      case "reflection":
        response = generateJournalResponse(query, context, conversationHistory, model);
        break;
      case "goals":
        response = generatePlanResponse(query, context, conversationHistory, model);
        break;
      default:
        response = generateGeneralResponse(query, context, conversationHistory, model);
    }


  } else if (model.id === "tsubame-0.7") {
    // Tsubame is fast and concise
    switch (intent) {
      case "greeting":
        response = generateGreeting(conversationHistory, model);
        break;
      case "followup":
        response = generateFollowupResponse(query, context, conversationHistory, model);
        break;
      case "summary":
        response = generateSummaryResponse(context, conversationHistory, model);
        break;
      case "habits":
        response = generateHabitsResponse(query, context, conversationHistory, model);
        break;
      case "tasks":
        response = generateTasksResponse(query, context, conversationHistory, model);
        break;
      case "journal":
        response = generateJournalResponse(query, context, conversationHistory, model);
        break;
      case "notes":
        response = generateNotesResponse(query, context, conversationHistory, model);
        break;
      case "plan":
        response = generatePlanResponse(query, context, conversationHistory, model);
        break;
      case "motivation":
        response = generateMotivationResponse(query, context, conversationHistory, model);
        break;
      case "search":
        response = generateSearchResponse(query, context, conversationHistory, model);
        break;
      case "gratitude":
      case "reflection":
        response = generateJournalResponse(query, context, conversationHistory, model);
        break;
      case "goals":
        response = generatePlanResponse(query, context, conversationHistory, model);
        break;
      default:
        response = generateGeneralResponse(query, context, conversationHistory, model);
    }
  } else {
    // Thallo - balanced
    switch (intent) {
      case "greeting":
        response = generateGreeting(conversationHistory, model);
        break;
      case "followup":
        response = generateFollowupResponse(query, context, conversationHistory, model);
        break;
      case "summary":
        response = generateSummaryResponse(context, conversationHistory, model);
        break;
      case "habits":
        response = generateHabitsResponse(query, context, conversationHistory, model);
        break;
      case "tasks":
        response = generateTasksResponse(query, context, conversationHistory, model);
        break;
      case "journal":
        response = generateJournalResponse(query, context, conversationHistory, model);
        break;
      case "notes":
        response = generateNotesResponse(query, context, conversationHistory, model);
        break;
      case "plan":
        response = generatePlanResponse(query, context, conversationHistory, model);
        break;
      case "motivation":
        response = generateMotivationResponse(query, context, conversationHistory, model);
        break;
      case "search":
        response = generateSearchResponse(query, context, conversationHistory, model);
        break;
      case "gratitude":
      case "reflection":
        response = generateJournalResponse(query, context, conversationHistory, model);
        break;
      case "goals":
        response = generatePlanResponse(query, context, conversationHistory, model);
        break;
      default:
        response = generateGeneralResponse(query, context, conversationHistory, model);
    }
  }

  return response;
}

// ============================================================
// Existing utility methods (kept for backward compatibility)
// ============================================================

class AIEngine {
  generateMotivation(habit: Habit, streak: number): string {
    const templates = [
      "You're on fire! 🔥 You've completed your {habit} habit {streak} days in a row. Keep the momentum going!",
      "Small steps lead to big changes. Your {habit} streak of {streak} days is proof of your dedication.",
      "Every day you show up is a victory. {streak} days and counting for {habit}!",
      "Consistency beats intensity. Your {habit} habit is building a foundation for success.",
      "You're in the zone! {streak} day streak on {habit} - that's impressive dedication!",
      "Progress, not perfection. Your {habit} habit is shaping a better you, one day at a time.",
      "Look at you go! {streak} consecutive days of {habit} - you're unstoppable!",
      "The secret to success is consistency, and you're mastering it with {streak} days of {habit}!",
    ];
    const template = templates[Math.floor(Math.random() * templates.length)];
    return template.replace("{habit}", habit.name).replace("{streak}", streak.toString());
  }

  generateDailyInsight(): string {
    const data = storage.getData();
    const insights: string[] = [];

    const habits = data.habits.filter((h) => !h.archived);
    if (habits.length > 0) {
      const bestHabit = habits
        .map((h) => ({ habit: h, dates: storage.getHabitLogDates(h.id) }))
        .sort((a, b) => b.dates.length - a.dates.length)[0];
      if (bestHabit && bestHabit.dates.length > 0) {
        insights.push(
          `Your strongest habit is "${bestHabit.habit.name}" with ${bestHabit.dates.length} total check-ins.`
        );
      }
    }

    const tasks = data.tasks.filter((t) => t.status !== "done" && t.dueDate);
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && t.dueDate < getToday()
    );
    if (overdueTasks.length > 0) {
      insights.push(
        `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}. Let's tackle those first!`
      );
    } else if (tasks.length > 0) {
      insights.push(
        `You have ${tasks.length} task${tasks.length > 1 ? "s" : ""} for today. Great focus ahead!`
      );
    }

    const entries = data.journalEntries;
    if (entries.length > 0) {
      const recentMoods = entries.slice(0, 7).map((e) => getMoodScore(e.mood));
      const avgMood =
        recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length;
      if (avgMood >= 75) {
        insights.push(
          "Your mood has been positive lately! Keep nurturing what's working."
        );
      } else if (avgMood < 50) {
        insights.push(
          "Your mood has been low. Remember to take breaks and be kind to yourself."
        );
      }
    }

    const todayLogs = data.habitLogs.filter((l) => l.date === getToday());
    if (todayLogs.length > 0) {
      insights.push(
        `You've already completed ${todayLogs.length} habit${todayLogs.length > 1 ? "s" : ""} today. Great start!`
      );
    }

    if (insights.length === 0) {
      insights.push(
        "Start your day by setting 3 key intentions. What matters most today?"
      );
    }

    return insights.join(" ");
  }

  generateFocusSuggestion(): string {
    const data = storage.getData();
    const today = getToday();
    const habits = data.habits.filter((h) => !h.archived);
    const pendingTasks = data.tasks.filter((t) => t.status !== "done");
    const overdueTasks = pendingTasks.filter((t) => t.dueDate && t.dueDate < today);
    const todayHabitLogs = data.habitLogs.filter((l) => l.date === today).length;
    const todayJournal = data.journalEntries.some((e) => e.date === today);

    // Build contextual suggestions based on actual data
    const contextSuggestions: string[] = [];

    if (overdueTasks.length > 0) {
      contextSuggestions.push(
        `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}. ` +
        `Try tackling the oldest one first — clearing mental load creates momentum. 🎯`
      );
    }

    if (habits.length > 0 && todayHabitLogs < habits.length) {
      const remaining = habits.length - todayHabitLogs;
      contextSuggestions.push(
        `${remaining} habit${remaining > 1 ? "s" : ""} left to check off today. ` +
        `Even a quick log keeps your streak alive! 🔥`
      );
    }

    if (!todayJournal && data.journalEntries.length > 0) {
      contextSuggestions.push(
        `You haven't journaled today. 2 minutes of reflection can shift your entire perspective. 📝`
      );
    }

    if (pendingTasks.length > 0 && overdueTasks.length === 0) {
      contextSuggestions.push(
        `Your tasks are under control! Focus on your highest priority item to build momentum. 💪`
      );
    }

    // General suggestions (fallback)
    const generalSuggestions = [
      "Focus on your most important task first — eat that frog! 🐸",
      "Dedicate the next 25 minutes to deep work on your top priority. 🎯",
      "Take 5 minutes to plan your day — it'll save you hours later. 📋",
      "Start with a 2-minute win. One small task creates momentum for the whole day. ⚡",
      "Your consistency is your superpower. What can you do today that future you will thank you for? 🚀",
      "The best time to start was yesterday. The second best time is right now. 🌱",
      "Progress over perfection. Done is better than perfect. ✨",
      "What's one thing you can do in the next 10 minutes that would make today a win? ⏱️",
      "Don't let perfect be the enemy of good. Take the next small step. 👣",
      "Silence notifications and enter deep focus mode for 45 minutes. 🔕",
    ];

    // Blend contextual and general suggestions for variety
    // Always include at least one contextual suggestion if available
    const blendedSuggestions = contextSuggestions.length > 0
      ? [...contextSuggestions, ...generalSuggestions.slice(0, 3)]
      : generalSuggestions;

    return blendedSuggestions[Math.floor(Math.random() * blendedSuggestions.length)];
  }

  generateReflectionPrompt(): string {
    const reflections = [
      "What was the highlight of your day?",
      "What challenged you today, and how did you grow from it?",
      "What are you most grateful for right now?",
      "If you could redo one moment today, what would it be?",
      "What did you learn about yourself today?",
      "How did you make someone else's day better?",
      "What's one thing you accomplished today that matters?",
      "What energy are you bringing into tomorrow?",
    ];
    return reflections[Math.floor(Math.random() * reflections.length)];
  }

  generateWeeklyReview(): string {
    const data = storage.getData();
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekHabits = data.habitLogs.filter(
      (l) => new Date(l.date) >= weekAgo
    );
    const weekTasks = data.tasks.filter(
      (t) => t.completedAt && new Date(t.completedAt) >= weekAgo
    );
    const weekJournal = data.journalEntries.filter(
      (e) => new Date(e.date) >= weekAgo
    );

    const habitCount = [...new Set(weekHabits.map((l) => l.habitId))].length;
    const taskCount = weekTasks.length;
    const journalCount = weekJournal.length;

    return `📊 **Weekly Review**\n\n**Habits:** You tracked ${habitCount} different habit${habitCount !== 1 ? "s" : ""} this week with ${weekHabits.length} total check-ins.\n**Tasks:** Completed ${taskCount} task${taskCount !== 1 ? "s" : ""}.\n**Journal:** Wrote ${journalCount} journal entr${journalCount !== 1 ? "ies" : "y"}.\n\n${
      habitCount > 3
        ? "🌟 Great consistency on your habits!"
        : "💪 Try adding one more habit to your daily routine."
    }\n${
      taskCount > 5
        ? "🎯 You've been productive! Keep up the momentum."
        : "📋 Set aside some focused time for your tasks this week."
    }\n${
      journalCount > 3
        ? "📝 Fantastic journaling habit - self-reflection is powerful."
        : "✍️ Try journaling a few times this week to track your thoughts."
    }`;
  }

  generateMonthlyReport(): string {
    const data = storage.getData();
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const monthHabits = data.habitLogs.filter(
      (l) => new Date(l.date) >= monthAgo
    );
    const monthTasks = data.tasks.filter(
      (t) => t.completedAt && new Date(t.completedAt) >= monthAgo
    );
    const monthJournal = data.journalEntries.filter(
      (e) => new Date(e.date) >= monthAgo
    );

    const habitCount = monthHabits.length;
    const habitTypes = [...new Set(monthHabits.map((l) => l.habitId))].length;
    const taskCount = monthTasks.length;
    const journalCount = monthJournal.length;

    const avgMood =
      monthJournal.length > 0
        ? monthJournal.reduce((sum, e) => sum + getMoodScore(e.mood), 0) /
          monthJournal.length
        : 0;

    return `📈 **Monthly Report - ${today.toLocaleString("default", {
      month: "long",
    })}**\n\n**Overview**\n• Habits completed: ${habitCount} (${habitTypes} different habits)\n• Tasks completed: ${taskCount}\n• Journal entries: ${journalCount}\n${
      monthJournal.length > 0
        ? `• Average mood: ${
            avgMood >= 75
              ? "😊 Positive"
              : avgMood >= 50
              ? "😐 Neutral"
              : "😔 Needs attention"
          }`
        : ""
    }\n\n**Streak Highlights**\n${data.habits
      .map((h) => {
        const dates = storage.getHabitLogDates(h.id);
        const streak = calculateStreak(dates);
        return `• ${h.name}: ${streak.current} day streak (best: ${streak.longest})`;
      })
      .join("\n")}\n\n**Summary**\nYou've been ${
      habitCount > 20
        ? "incredibly consistent"
        : "building good habits"
    } this month. ${
      taskCount > 10
        ? "Your productivity is strong!"
        : "Focus on task completion next month."
    } Keep up the great work! 🚀`;
  }

  summarizeNote(note: Note): string {
    const content = note.content;
    const sentences = content.split(/[.!?]+/).filter(Boolean);
    if (sentences.length <= 2) return content;

    const words = content.split(/\s+/);
    const summaryLength = Math.min(Math.ceil(words.length / 3), 50);

    const keySentences = [
      sentences[0],
      ...sentences.filter((s) => {
        const lower = s.toLowerCase();
        return (
          lower.includes("important") ||
          lower.includes("key") ||
          lower.includes("conclusion") ||
          lower.includes("therefore") ||
          lower.includes("result") ||
          lower.includes("significant")
        );
      }),
    ];

    if (keySentences.length > 3) {
      return keySentences.slice(0, 3).join(". ") + ".";
    }

    return sentences.slice(0, 2).join(". ") + ".";
  }

  extractActionItems(note: Note): string[] {
    const content = note.content;
    const items: string[] = [];

    const bulletPoints = content.match(/[-*•]\s*(.+)/g);
    if (bulletPoints) {
      items.push(...bulletPoints.map((b) => b.replace(/[-*•]\s*/, "")));
    }

    const actionPhrases = content.match(
      /(need to|should|must|have to|remember to|don't forget to|todo:|to do:|action:)\s*([^\n.!?]+)/gi
    );
    if (actionPhrases) {
      items.push(
        ...actionPhrases.map((a) =>
          a
            .replace(
              /^(need to|should|must|have to|remember to|don't forget to|todo:|to do:|action:)\s*/i,
              ""
            )
            .trim()
        )
      );
    }

    return [...new Set(items)].slice(0, 5);
  }

  generateTitle(content: string): string {
    const lines = content.split("\n").filter(Boolean);
    if (lines.length > 0 && lines[0].length < 60) {
      return lines[0];
    }

    const words = content.split(/\s+/);
    if (words.length <= 5) return content;

    const firstWords = words.slice(0, 4).join(" ");
    return firstWords.endsWith(".") ? firstWords.slice(0, -1) : firstWords;
  }

  rewriteNote(
    content: string,
    style: "shorter" | "longer" | "professional" | "casual"
  ): string {
    switch (style) {
      case "shorter":
        return content.split(/[.!?]+/).slice(0, 2).join(". ") + ".";
      case "longer": {
        const sentences = content.split(/[.!?]+/).filter(Boolean);
        return (
          sentences
            .map((s) => {
              const words = s.trim().split(/\s+/);
              if (words.length < 8) {
                return `In addition, ${s
                  .toLowerCase()
                  .trim()}, which is particularly noteworthy because it highlights a key aspect of this subject.`;
              }
              return (
                s.trim() +
                " Furthermore, this underscores the broader implications and significance of the topic at hand."
              );
            })
            .join(". ") + "."
        );
      }
      case "professional": {
        const replacements: [RegExp, string][] = [
          [/gonna/g, "going to"],
          [/wanna/g, "want to"],
          [/gotta/g, "have to"],
          [/awesome/g, "excellent"],
          [/cool/g, "effective"],
          [/stuff/g, "materials"],
          [/things/g, "items"],
          [/(?<=[.!?] )i /g, "I "],
          [/^i /g, "I "],
        ];
        let result = content;
        replacements.forEach(([pattern, replacement]) => {
          result = result.replace(pattern, replacement);
        });
        return result;
      }
      case "casual": {
        return content
          .replace(/however/gi, "but")
          .replace(/therefore/gi, "so")
          .replace(/furthermore/gi, "also")
          .replace(/nevertheless/gi, "still")
          .replace(/consequently/gi, "so")
          .replace(/in addition/gi, "plus")
          .replace(/significant/gi, "big")
          .replace(/utilize/g, "use")
          .replace(/implement/g, "do");
      }
      default:
        return content;
    }
  }
}

export const ai = new AIEngine();
