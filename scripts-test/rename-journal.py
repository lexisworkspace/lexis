import re

with open("src/lib/i18n.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Replace English-only values that contain "Journal" or "journal"
# (only in the first language block — English)
replacements = [
    ('"nav.journal": "Journal"', '"nav.journal": "Mindfulness"'),
    ('"journal.title": "Journal"', '"journal.title": "Mindfulness"'),
    ('"journal.subtitle": "Reflect, track your mood, and grow"', '"journal.subtitle": "Reflect, track your mood, and grow"'),
    ('"journal.writeToday": "Write Today"', '"journal.writeToday": "Write Today"'),
    ('"journal.editToday": "Edit Today"', '"journal.editToday": "Edit Today"'),
    ('"journal.search": "Search journal entries..."', '"journal.search": "Search mindfulness entries..."'),
    ('"journal.todaysEntry": "Today\'s Entry"', '"journal.todaysEntry": "Today\'s Entry"'),
    ('"journal.noEntriesFound": "No entries found"', '"journal.noEntriesFound": "No entries found"'),
    ('"journal.noEntries": "No journal entries yet"', '"journal.noEntries": "No mindfulness entries yet"'),
    ('"journal.startJourney": "Start your journaling journey today!"', '"journal.startJourney": "Start your mindfulness journey today!"'),
    ('"journal.writeFirst": "Write First Entry"', '"journal.writeFirst": "Write First Entry"'),
    ('"journal.editEntry": "Edit Entry"', '"journal.editEntry": "Edit Entry"'),
    ('"journal.entrySaved": "Entry saved"', '"journal.entrySaved": "Entry saved"'),
    ('"journal.entryDeleted": "Entry deleted"', '"journal.entryDeleted": "Entry deleted"'),
    ('"journal.mood": "Mood"', '"journal.mood": "Mood"'),
    ('"journal.grateful": "What are you grateful for?"', '"journal.grateful": "What are you grateful for?"'),
    ('"journal.reflection": "Daily reflection"', '"journal.reflection": "Daily reflection"'),
    ('"journal.wordCount": "words"', '"journal.wordCount": "words"'),
    ('"journal.backToList": "Back to entries"', '"journal.backToList": "Back to entries"'),
    # Dashboard journal references
    ('"dash.journalStreak": "Journal Streak"', '"dash.journalStreak": "Mindfulness Streak"'),
    ('"dash.journaledToday": "Journaled today"', '"dash.journaledToday": "Mindful today"'),
    ('"dash.noJournalToday": "No journal today"', '"dash.noJournalToday": "No mindfulness entry today"'),
    ('"dash.brainNoConnections": "Add more documents, tasks, and journal entries and Noor will start spotting connections."', '"dash.brainNoConnections": "Add more documents, tasks, and mindfulness entries and Noor will start spotting connections."'),
    # Search
    ('"search.placeholder": "Search documents, tasks, journal, habits..."', '"search.placeholder": "Search documents, tasks, mindfulness, habits..."'),
    # Onboarding
    ('"onboarding.s1.description": "Everything you need to think, plan and create - habits, documents, journal and tasks - in one calm, focused space. No fluff, no clutter, no noise."', '"onboarding.s1.description": "Everything you need to think, plan and create - habits, documents, mindfulness and tasks - in one calm, focused space. No fluff, no clutter, no noise."'),
    ('"onboarding.s2.description": "Habits build momentum. Documents capture ideas. Journal reflects. Tasks get things done. Use what you need, ignore the rest - each one is deep on its own."', '"onboarding.s2.description": "Habits build momentum. Documents capture ideas. Mindfulness reflects. Tasks get things done. Use what you need, ignore the rest - each one is deep on its own."'),
    ('"onboarding.s2.label": "Habits · Documents · Journal · Tasks"', '"onboarding.s2.label": "Habits · Documents · Mindfulness · Tasks"'),
    # Mode
    ('"mode.workspaceDesc": "The full Lexis experience - habits, documents, journal, tasks, and Noor, ready to go."', '"mode.workspaceDesc": "The full Lexis experience - habits, documents, mindfulness, tasks, and Noor, ready to go."'),
    # Analytics reference
    ('"journalEntry": "journal entry"', '"journalEntry": "mindfulness entry"'),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f"  OK {old[:50]}...")
    else:
        print(f"  MISS: {old[:50]}...")

with open("src/lib/i18n.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("\nDone!")
