import io

path = "src/lib/switch/parsers.ts"
with io.open(path, "rb") as f:
    data = f.read()
nl = "\r\n" if b"\r\n" in data else "\n"
c = data.replace(b"\r\n", b"\n").decode("utf-8")

subs = [
    # ISO date T separator (lowercased input)
    (
        "  // Already ISO / YYYY-MM-DD (possibly with time)\n  let m = s.match(/^(\\d{4})-(\\d{1,2})-(\\d{1,2})(?:[T ](\\d{1,2}):(\\d{2}))?/);",
        "  // Already ISO / YYYY-MM-DD (possibly with time). Note: s is lowercased,\n  // so accept both 't' and 'T' as the separator.\n  let m = s.match(/^(\\d{4})-(\\d{1,2})-(\\d{1,2})(?:[t ](\\d{1,2}):(\\d{2}))?/);",
    ),
    # Todoist project name resolution: never match project_id
    (
        '  const projIdIdx = headerIndex(header, ["project id"]);\n  const projNameIdx = headerIndex(header, ["project", "project name"]);',
        '  const projIdIdx = headerIndex(header, ["project id"]);\n  // Exact "project name"/"project" match only - never "project_id"\n  const projNameIdx = (() => {\n    const exact = header.findIndex((h) => h === "project name" || h === "project");\n    return exact !== -1 && header[exact] !== "project_id" ? exact : -1;\n  })();',
    ),
    (
        '    if (projNameIdx !== -1 && obj[header[projNameIdx]]) task.list = obj[header[projNameIdx]];\n    else if (projIdIdx !== -1 && obj[header[projIdIdx]]) task.list = projects[obj[header[projIdIdx]]] || null;',
        '    const projName = projNameIdx !== -1 ? obj[header[projNameIdx]] : "";\n    if (projName) task.list = projName;\n    else if (projIdIdx !== -1 && obj[header[projIdIdx]]) task.list = projects[obj[header[projIdIdx]]] || null;',
    ),
]

for old, new in subs:
    if old not in c:
        raise SystemExit("NOT FOUND:\n" + old[:100])
    c = c.replace(old, new)

out = c.replace("\n", nl)
with io.open(path, "w", encoding="utf-8", newline="") as f:
    f.write(out)
print("all patched")
