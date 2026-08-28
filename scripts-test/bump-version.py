"""Bump Lexis version from 1.17.1 to 1.17.2 in all files."""
import os, re

OLD = "1.17.1"
NEW = "1.17.2"

files_to_check = [
    "src/app/landing/page.tsx",
    "src/app/settings/page.tsx",
    "src/lib/i18n.ts",
    "src/lib/update-checker.ts",
    "public/version.json",
    "package.json",
    "desktop/package.json",
    "TRADEMARK-POSTURE.md",
]

for f in files_to_check:
    if not os.path.exists(f):
        print(f"SKIP: {f}")
        continue
    content = open(f, "r", encoding="utf-8").read()
    if OLD in content:
        new_content = content.replace(OLD, NEW)
        open(f, "w", encoding="utf-8").write(new_content)
        count = content.count(OLD)
        print(f"UPDATED ({count}x): {f}")
    else:
        print(f"NO MATCH: {f}")

print("\nDone!")
