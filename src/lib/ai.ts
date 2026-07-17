"use client";

import { storage } from "./storage";
import { getToday, calculateStreak, getMoodScore, getDateRange } from "./utils";
import { Habit, Task, JournalEntry, Note, Mood, AISuggestion } from "@/types";

// ============================================================
// AI Templates & Response Generator
// ============================================================

class AIEngine {
  private templates = {
    motivation: [
      "You're on fire! 🔥 You've completed your {habit} habit {streak} days in a row. Keep the momentum going!",
      "Small steps lead to big changes. Your {habit} streak of {streak} days is proof of your dedication.",
      "Every day you show up is a victory. {streak} days and counting for {habit}!",
      "Consistency beats intensity. Your {habit} habit is building a foundation for success.",
      "You're in the zone! {streak} day streak on {habit} — that's impressive dedication!",
      "Progress, not perfection. Your {habit} habit is shaping a better you, one day at a time.",
      "Look at you go! {streak} consecutive days of {habit} — you're unstoppable!",
      "The secret to success is consistency, and you're mastering it with {streak} days of {habit}!",
    ],
    insights: [
      "I've noticed your most productive time is {timeOfDay}. Try scheduling important tasks then!",
      "Your {topHabit} habit has the strongest streak — you really care about this one!",
      "You tend to be more productive on {dayOfWeek}s. Plan your big tasks for that day!",
      "Your journal entries are most reflective on {journalDay}s — great time for deep thinking.",
      "You've completed {percent}% of your tasks this week. Let's push for 100%!",
    ],
    suggestions: [
      "Try a 5-minute meditation to reset your focus.",
      "Break your next big task into 3 smaller steps.",
      "Take a walk — physical movement boosts creativity by 60%.",
      "Review your weekly goals and adjust priorities.",
      "Try the Pomodoro technique: 25 min work, 5 min break.",
      "Write down 3 things you're grateful for right now.",
      "Declutter your workspace for 5 minutes.",
      "Review your notes from last week and connect the dots.",
    ],
    reflections: [
      "What was the highlight of your day?",
      "What challenged you today, and how did you grow from it?",
      "What are you most grateful for right now?",
      "If you could redo one moment today, what would it be?",
      "What did you learn about yourself today?",
      "How did you make someone else's day better?",
      "What's one thing you accomplished today that matters?",
      "What energy are you bringing into tomorrow?",
    ],
  };

  generateMotivation(habit: Habit, streak: number): string {
    const templates = this.templates.motivation;
    const template = templates[Math.floor(Math.random() * templates.length)];
    return template.replace("{habit}", habit.name).replace("{streak}", streak.toString());
  }

  generateDailyInsight(): string {
    const data = storage.getData();
    const insights: string[] = [];

    // Habit insights
    const habits = data.habits.filter((h) => !h.archived);
    if (habits.length > 0) {
      const bestHabit = habits
        .map((h) => ({
          habit: h,
          dates: storage.getHabitLogDates(h.id),
        }))
        .sort((a, b) => b.dates.length - a.dates.length)[0];
      if (bestHabit && bestHabit.dates.length > 0) {
        insights.push(`Your strongest habit is "${bestHabit.habit.name}" with ${bestHabit.dates.length} total check-ins.`);
      }
    }

    // Task insights
    const tasks = data.tasks.filter((t) => t.status !== "done" && t.dueDate);
    const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < getToday());
    if (overdueTasks.length > 0) {
      insights.push(`You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}. Let's tackle those first!`);
    } else if (tasks.length > 0) {
      insights.push(`You have ${tasks.length} task${tasks.length > 1 ? "s" : ""} for today. Great focus ahead!`);
    }

    // Journal insights
    const entries = data.journalEntries;
    if (entries.length > 0) {
      const recentMoods = entries.slice(0, 7).map((e) => getMoodScore(e.mood));
      const avgMood = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length;
      if (avgMood >= 75) {
        insights.push("Your mood has been positive lately! Keep nurturing what's working.");
      } else if (avgMood < 50) {
        insights.push("Your mood has been low. Remember to take breaks and be kind to yourself.");
      }
    }

    // Productivity insights
    const todayLogs = data.habitLogs.filter((l) => l.date === getToday());
    if (todayLogs.length > 0) {
      insights.push(`You've already completed ${todayLogs.length} habit${todayLogs.length > 1 ? "s" : ""} today. Great start!`);
    }

    if (insights.length === 0) {
      insights.push("Start your day by setting 3 key intentions. What matters most today?");
    }

    return insights.join(" ");
  }

  generateFocusSuggestion(): string {
    const suggestions = [
      "Focus on your most important task first — eat that frog! 🐸",
      "Dedicate the next 25 minutes to deep work on your top priority. 🎯",
      "Take 5 minutes to plan your day — it'll save you hours later. 📋",
      "Start with your health — a quick habit check-in sets a positive tone. 🌅",
      "Review your weekly goals and identify the one task that moves the needle. 📈",
      "Clear your mind with a 2-minute journal entry before diving into work. ✍️",
      "Tackle your smallest task first to build momentum. 🚀",
      "Silence notifications and enter deep focus mode for 45 minutes. 🔕",
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }

  generateReflectionPrompt(): string {
    const templates = this.templates.reflections;
    return templates[Math.floor(Math.random() * templates.length)];
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

    return `📊 **Weekly Review**

**Habits:** You tracked ${habitCount} different habit${habitCount !== 1 ? "s" : ""} this week with ${weekHabits.length} total check-ins.
**Tasks:** Completed ${taskCount} task${taskCount !== 1 ? "s" : ""}.
**Journal:** Wrote ${journalCount} journal entr${journalCount !== 1 ? "ies" : "y"}.

${
  habitCount > 3
    ? "🌟 Great consistency on your habits!"
    : "💪 Try adding one more habit to your daily routine."
}
${
  taskCount > 5
    ? "🎯 You've been productive! Keep up the momentum."
    : "📋 Set aside some focused time for your tasks this week."
}
${
  journalCount > 3
    ? "📝 Fantastic journaling habit — self-reflection is powerful."
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

    // Calculate average mood
    const avgMood =
      monthJournal.length > 0
        ? monthJournal.reduce((sum, e) => sum + getMoodScore(e.mood), 0) /
          monthJournal.length
        : 0;

    return `📈 **Monthly Report — ${today.toLocaleString("default", { month: "long" })}**

**Overview**
• Habits completed: ${habitCount} (${habitTypes} different habits)
• Tasks completed: ${taskCount}
• Journal entries: ${journalCount}
${monthJournal.length > 0 ? `• Average mood: ${avgMood >= 75 ? "😊 Positive" : avgMood >= 50 ? "😐 Neutral" : "😔 Needs attention"}` : ""}

**Streak Highlights**
${data.habits
  .map((h) => {
    const dates = storage.getHabitLogDates(h.id);
    const streak = calculateStreak(dates);
    return `• ${h.name}: ${streak.current} day streak (best: ${streak.longest})`;
  })
  .join("\n")}

**Summary**
You've been ${habitCount > 20 ? "incredibly consistent" : "building good habits"} this month. ${
      taskCount > 10 ? "Your productivity is strong!" : "Focus on task completion next month."
    } Keep up the great work! 🚀`;
  }

  summarizeNote(note: Note): string {
    const content = note.content;
    const sentences = content.split(/[.!?]+/).filter(Boolean);
    if (sentences.length <= 2) return content;

    const words = content.split(/\s+/);
    const summaryLength = Math.min(Math.ceil(words.length / 3), 50);

    // Simple extractive summary - take first few and key sentences
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

    // Find bullet points and numbered lists
    const bulletPoints = content.match(/[-*•]\s*(.+)/g);
    if (bulletPoints) {
      items.push(...bulletPoints.map((b) => b.replace(/[-*•]\s*/, "")));
    }

    // Find action verbs
    const actionPhrases = content.match(
      /(need to|should|must|have to|remember to|don't forget to|todo:|to do:|action:)\s*([^\n.!?]+)/gi
    );
    if (actionPhrases) {
      items.push(...actionPhrases.map((a) => a.replace(/^(need to|should|must|have to|remember to|don't forget to|todo:|to do:|action:)\s*/i, "").trim()));
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

    // Extract key nouns and phrases
    const commonStarts = ["The", "How", "Why", "What", "My", "A", "An", "This", "That"];
    const firstWords = words.slice(0, 4).join(" ");

    return firstWords.endsWith(".") ? firstWords.slice(0, -1) : firstWords;
  }

  rewriteNote(content: string, style: "shorter" | "longer" | "professional" | "casual"): string {
    switch (style) {
      case "shorter":
        return content
          .split(/[.!?]+/)
          .slice(0, 2)
          .join(". ") + ".";
      case "longer": {
        const sentences = content.split(/[.!?]+/).filter(Boolean);
        return sentences
          .map((s) => {
            const words = s.trim().split(/\s+/);
            if (words.length < 8) {
              return `In addition, ${s.toLowerCase().trim()}, which is particularly noteworthy because it highlights a key aspect of this subject.`;
            }
            return s.trim() + " Furthermore, this underscores the broader implications and significance of the topic at hand.";
          })
          .join(". ") + ".";
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

  chat(query: string): string {
    const data = storage.getData();
    const q = query.toLowerCase();

    // Search across all data
    const relevantNotes = data.notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
    );
    const relevantJournal = data.journalEntries.filter(
      (e) => e.content.toLowerCase().includes(q) || e.title.toLowerCase().includes(q)
    );
    const relevantTasks = data.tasks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );

    let response = "";

    if (q.includes("habit") || q.includes("streak") || q.includes("routine")) {
      const habits = data.habits.filter((h) => !h.archived);
      if (habits.length === 0) {
        response = "You haven't created any habits yet! Would you like me to suggest some based on your goals?";
      } else {
        const bestStreak = habits
          .map((h) => ({
            name: h.name,
            ...calculateStreak(storage.getHabitLogDates(h.id)),
          }))
          .sort((a, b) => b.current - a.current)[0];

        response = `You have ${habits.length} active habits. `;
        if (bestStreak && bestStreak.current > 0) {
          response += `Your strongest streak is "${bestStreak.name}" at ${bestStreak.current} days! `;
        }
        response += `\n\nHere's a suggested routine:\n`;
        response += `🌅 **Morning:** Start with your morning habits\n`;
        response += `📝 **Mid-day:** Review tasks and take a mindful break\n`;
        response += `🌙 **Evening:** Journal and reflect on your day`;
      }
    } else if (q.includes("note") || q.includes("find") || q.includes("search")) {
      if (relevantNotes.length > 0) {
        response = `I found ${relevantNotes.length} relevant note${relevantNotes.length > 1 ? "s" : ""}:\n\n`;
        relevantNotes.slice(0, 5).forEach((n) => {
          response += `📄 **${n.title}**\n${n.content.slice(0, 100)}...\n\n`;
        });
      } else {
        response = "I couldn't find any notes matching your query. Would you like to create a new note?";
      }
    } else if (q.includes("journal") || q.includes("mood") || q.includes("feeling")) {
      if (relevantJournal.length > 0) {
        const moods = relevantJournal.map((e) => e.mood);
        const avgScore = moods.reduce((sum, m) => sum + getMoodScore(m), 0) / moods.length;
        response = `I found ${relevantJournal.length} journal entr${relevantJournal.length > 1 ? "ies" : "y"} related to your query.\n`;
        response += `Your mood during these entries averaged ${avgScore >= 75 ? "positive 😊" : avgScore >= 50 ? "neutral 😐" : "low 😔"}.\n\n`;
        response += `**Recent entry preview:**\n${relevantJournal[0].content.slice(0, 150)}...`;
      } else {
        response = "I don't see any journal entries matching that. How are you feeling today? Would you like to write about it?";
      }
    } else if (q.includes("task") || q.includes("todo") || q.includes("deadline")) {
      const pendingTasks = data.tasks.filter((t) => t.status !== "done");
      if (pendingTasks.length > 0) {
        const overdue = pendingTasks.filter(
          (t) => t.dueDate && t.dueDate < getToday()
        );
        response = `You have ${pendingTasks.length} pending task${pendingTasks.length > 1 ? "s" : ""}.\n`;
        if (overdue.length > 0) {
          response += `⚠️ ${overdue.length} task${overdue.length > 1 ? "s are" : " is"} overdue!\n\n`;
        }
        response += `**Prioritized list:**\n`;
        pendingTasks
          .sort((a, b) => {
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          })
          .slice(0, 5)
          .forEach((t) => {
            response += `${t.status === "done" ? "✅" : "📋"} **${t.title}** (${t.priority})${t.dueDate ? ` — due ${t.dueDate}` : ""}\n`;
          });
      } else {
        response = "You have no pending tasks! Enjoy your free time or create some new goals.";
      }
    } else if (q.includes("summary") || q.includes("overview") || q.includes("report")) {
      const todayHabits = data.habitLogs.filter((l) => l.date === getToday()).length;
      const todayTasks = data.tasks.filter(
        (t) => t.status === "done" && t.completedAt?.startsWith(getToday())
      ).length;
      const todayJournal = data.journalEntries.filter((e) => e.date === getToday()).length;

      response = `📊 **Quick Summary**\n\n`;
      response += `📅 **Today:** ${getToday()}\n`;
      response += `✅ Habits checked: ${todayHabits}\n`;
      response += `🎯 Tasks done: ${todayTasks}\n`;
      response += `📝 Journal written: ${todayJournal ? "Yes" : "Not yet"}\n`;
      response += `📓 Total notes: ${data.notes.length}\n`;
      response += `💪 Active habits: ${data.habits.filter((h) => !h.archived).length}\n`;
      response += `📋 Pending tasks: ${data.tasks.filter((t) => t.status !== "done").length}\n`;
    } else {
      response =
        "I'm your personal AI assistant! I can help you with:\n\n" +
        "📊 **Summaries** — Get an overview of your day, week, or month\n" +
        "💡 **Suggestions** — Habit recommendations and productivity tips\n" +
        "🔍 **Search** — Find information across your notes, journal, and tasks\n" +
        "📈 **Insights** — Discover patterns in your productivity and mood\n" +
        "🎯 **Focus** — Get daily focus suggestions and prioritization\n\n" +
        "What would you like to explore?";
    }

    return response;
  }

  generateHabitPlan(goal: string, habits: Habit[]): string {
    const currentHabits = habits.filter((h) => !h.archived);
    const categories = [...new Set(currentHabits.map((h) => h.categoryId))];

    let plan = `🎯 **Personalized Habit Plan for: "${goal}"**\n\n`;

    plan += `Based on your current ${currentHabits.length} habits across ${categories.length} categories:\n\n`;

    plan += "**Suggested Routine:**\n";
    plan += "🌅 **Morning (5-10 min)**\n";
    plan += "   • Start with your most important habit\n";
    plan += "   • Set 3 intentions for the day\n";
    plan += "   • Quick journal entry\n\n";
    plan += "📝 **Mid-day (5 min)**\n";
    plan += "   • Review and log habits\n";
    plan += "   • Check task progress\n";
    plan += "   • Mindful break\n\n";
    plan += "🌙 **Evening (5-10 min)**\n";
    plan += "   • Complete remaining habit logs\n";
    plan += "   • Evening journal reflection\n";
    plan += "   • Plan tomorrow's priorities\n\n";

    plan += "💡 **Tips for Success:**\n";
    plan += "• Start small — focus on 1-2 habits at a time\n";
    plan += "• Link habits to existing routines (habit stacking)\n";
    plan += "• Track progress to stay motivated\n";
    plan += "• Be kind to yourself — missed days are normal!\n";
    plan += "• Review and adjust your plan weekly\n";

    return plan;
  }
}

export const ai = new AIEngine();
