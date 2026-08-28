"""Batch update all Lexis policy pages: dates, feature lists, AI model refs."""
import re, glob, os

POLICY_FILES = [
    "src/app/privacy/page.tsx",
    "src/app/terms/page.tsx",
    "src/app/acceptable-use/page.tsx",
    "src/app/eula/page.tsx",
    "src/app/disclaimer/page.tsx",
    "src/app/cookies/page.tsx",
    "src/app/gdpr/page.tsx",
    "src/app/ccpa/page.tsx",
    "src/app/accessibility/page.tsx",
    "SECURITY.md",
    "SECURITY-RUNBOOK.md",
    "TRADEMARK-POSTURE.md",
]

OLD_DATE = "August 16, 2026"
NEW_DATE = "August 21, 2026"
OLD_VERSION = "1.16.5"
NEW_VERSION = "1.17.1"

for f in POLICY_FILES:
    if not os.path.exists(f):
        print(f"SKIP (missing): {f}")
        continue
    content = open(f, "r", encoding="utf-8").read()
    original = content

    # 1. Update dates
    content = content.replace(OLD_DATE, NEW_DATE)
    content = content.replace("August 6, 2026", NEW_DATE)
    content = content.replace("August 10, 2026", NEW_DATE)

    # 2. Update version refs
    content = content.replace(OLD_VERSION, NEW_VERSION)

    # 3. Update AI model descriptions: "Ethos 1.5 (deep reasoning), Logos (balanced everyday intelligence), and Verse (fast, lightweight responses)"
    # -> "Ethos 1.5 (deep reasoning), Logos 1.2 (balanced everyday intelligence), and Verse 0.8 (fast, lightweight responses)"
    content = content.replace(
        "Ethos 1.5 (deep reasoning), Logos (balanced everyday intelligence), and Verse (fast, lightweight responses)",
        "Ethos 1.5 (deep reasoning), Logos 1.2 (balanced everyday intelligence), and Verse 0.8 (fast, lightweight responses)"
    )
    content = content.replace(
        "Ethos 1.5 (deep reasoning), Logos (balanced everyday intelligence), and Verse (fast, lightweight responses)",
        "Ethos 1.5 (deep reasoning), Logos 1.2 (balanced everyday intelligence), and Verse 0.8 (fast, lightweight responses)"
    )
    # Also handle any bare "Logos" model ref (not "Logos 1.2")
    content = re.sub(r'\bLogos\b(?!\s+1\.2)', 'Logos 1.2', content)

    # 4. Update Terms §2 service description to include new tools
    # Old: "habits tracking, journaling, note-taking, task management and AI-powered assistance"
    content = content.replace(
        "habits tracking, journaling, note-taking,\n          task management and AI-powered assistance",
        "habits tracking, mindfulness journaling, note-taking, task management,\n          spreadsheet management, and AI-powered assistance"
    )
    content = content.replace(
        "habits tracking, journaling, note-taking, task management and AI-powered assistance",
        "habits tracking, mindfulness journaling, note-taking, task management, spreadsheet management, and AI-powered assistance"
    )

    # 5. Update Terms §2 key characteristics
    content = content.replace(
        "An optional local password can be set for device-level privacy",
        "An optional local password for device-level privacy"
    )

    # 6. Update Privacy §6 — analytics is still zero (already correct)

    # 7. Update Disclaimer §4 data loss — already mentions correct tools, add Grid
    content = content.replace(
        "This includes habits, journal entries,\n          notes, tasks and all other workspace data",
        "This includes habits, mindfulness journal entries,\n          notes, tasks, spreadsheets, widgets, and all other workspace data"
    )
    content = content.replace(
        "This includes habits, journal entries, notes, tasks and all other workspace data",
        "This includes habits, mindfulness journal entries, notes, tasks, spreadsheets, widgets, and all other workspace data"
    )

    # 8. Update GDPR §2
    content = content.replace(
        "habits, journal entries, notes, tasks and settings",
        "habits, journal entries, notes, tasks, spreadsheets, widgets, and settings"
    )

    # 9. Update CCPA §2
    content = content.replace(
        "habits, notes, journal entries, and tasks",
        "habits, notes, journal entries, tasks, spreadsheets, widgets, and other workspace data"
    )

    # 10. Update Acceptable Use — add spreadsheet management
    content = content.replace(
        "Note-taking and knowledge management",
        "Note-taking and knowledge management"
    )  # already good

    # 11. Update EULA §2 content list
    content = content.replace(
        "habits, journal entries, notes, tasks, Noor chats and settings",
        "habits, journal entries, notes, tasks, spreadsheets, widgets, Noor chats, and settings"
    )

    # 12. Update Accessibility — mention new tools
    content = content.replace(
        "improved focus management in modals",
        "improved focus management in modals and spreadsheets"
    )

    if content != original:
        open(f, "w", encoding="utf-8").write(content)
        print(f"UPDATED: {f}")
    else:
        print(f"NO CHANGE: {f}")

print("\nDone!")
