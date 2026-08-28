const fs = require("fs");
const norm = (c) => c.includes("\r\n") ? c.replace(/\r\n/g, "\n") : c;
const p = "src/app/notes/page.tsx";
let c = norm(fs.readFileSync(p, "utf8"));
const save = (cc) => fs.writeFileSync(p, cc);
let ok = 0;

// ---------- 1. Module-level: parseTaskJson + AI system prompt (before NoteEditor) ----------
const noteEditorAnchor = "function NoteEditor({";
const parseJsonFn = [
  "// Parse Noor's task-analysis JSON, tolerating markdown fences and extra text.",
  "function parseTaskJson(raw: string): DetectedTask[] | null {",
  '  let s = raw.trim();',
  '  s = s.replace(/^```(?:json)?\\s*/i, "").replace(/```\\s*$/, "");',
  '  const start = s.indexOf("{");',
  '  const end = s.lastIndexOf("}");',
  "  if (start === -1 || end <= start) return null;",
  "  try {",
  "    const obj = JSON.parse(s.slice(start, end + 1));",
  "    if (!obj || !Array.isArray(obj.tasks)) return null;",
  "    const out: DetectedTask[] = [];",
  "    for (const tk of obj.tasks) {",
  '      if (!tk || typeof tk.text !== "string") continue;',
  '      const text = tk.text.trim();',
  "      if (text.length < 3) continue;",
  '      const due = typeof tk.dueDate === "string" && /^\\d{4}-\\d{2}-\\d{2}$/.test(tk.dueDate) ? tk.dueDate : undefined;',
  "      out.push({ text, dueDate: due });",
  "    }",
  "    return out.length ? out : null;",
  "  } catch {",
  "    return null;",
  "  }",
  "}",
  "",
  "const NOOR_TASK_PROMPT =",
  "  \"Extract task-like action items from the user's note text. Rules: \" +",
  '  "1) Return ONLY things the user intends, needs, or has committed to do. " +',
  '  "2) Ignore general thoughts, descriptions, and statements of fact. " +',
  '  "3) Keep each task text concise but complete (preserve the important words). " +',
  '  "4) If a due date or relative time appears (today, tonight, tomorrow, next week, Friday, by 5pm, by June 10), set dueDate to the ISO date yyyy-MM-dd computed from today; otherwise null. " +',
  '  "Respond ONLY with valid JSON in this exact shape: {\\"tasks\\":[{\\"text\\":\\"...\\",\\"dueDate\\":\\"yyyy-MM-dd\\"}]}. No commentary, no markdown.\"',
  "",
].join("\n");

if (c.includes(noteEditorAnchor) && !c.includes("NOOR_TASK_PROMPT")) {
  c = c.replace(noteEditorAnchor, parseJsonFn + noteEditorAnchor);
  console.log("OK [1] parseTaskJson + NOOR_TASK_PROMPT added");
  ok++;
} else {
  console.log(c.includes(noteEditorAnchor) ? "!! [1] already present" : "!! [1] NoteEditor anchor NOT FOUND");
}

// ---------- 2. State: aiAnalyzing + refs (after detectedTasks state) ----------
const stateAnchor = "  const [detectedTasks, setDetectedTasks] = useState<DetectedTask[]>([]);";
if (c.includes(stateAnchor) && !c.includes("aiAnalyzing")) {
  c = c.replace(
    stateAnchor,
    stateAnchor +
      "\n  const [aiAnalyzing, setAiAnalyzing] = useState(false);\n" +
      "  const aiLastRunRef = useRef(0);\n" +
      '  const aiTextRef = useRef("");'
  );
  console.log("OK [2] aiAnalyzing state + refs added");
  ok++;
} else {
  console.log(c.includes(stateAnchor) ? "!! [2] already present" : "!! [2] state anchor NOT FOUND");
}

// ---------- 3. runNoorTaskDetection helper (after setDetectedTasksTimed) ----------
const helperAnchor = [
  "  // Show detected tasks, auto-hide after 20 seconds",
  "  const setDetectedTasksTimed = (tasks: DetectedTask[]) => {",
  "    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);",
  "    detectTimerRef.current = null;",
  "    setDetectedTasks(tasks);",
  "    if (tasks.length > 0) {",
  "      detectTimerRef.current = setTimeout(() => {",
  "        setDetectedTasks([]);",
  "        detectTimerRef.current = null;",
  "      }, 20000);",
  "    }",
  "  };",
].join("\n");

const aiHelper = [
  "  // Noor (AI) task detection - catches what the local regex misses.",
  "  // Rate-limited: at most one call per 10s, and only when text changed.",
  "  const runNoorTaskDetection = (text: string) => {",
  "    const plain = (text || '').trim();",
  "    if (plain.length < 20) return;",
  "    const now = Date.now();",
  "    if (now - aiLastRunRef.current < 10000) return; // cooldown",
  "    if (plain === aiTextRef.current) return; // no change since last run",
  "    aiLastRunRef.current = now;",
  "    aiTextRef.current = plain;",
  "    setAiAnalyzing(true);",
  "    fetch('/api/chat', {",
  '      method: "POST",',
  '      headers: { "Content-Type": "application/json" },',
  "      body: JSON.stringify({",
  "        model: 'nvidia/nemotron-3-super-120b-a12b',",
  "        temperature: 0.2,",
  "        maxTokens: 600,",
  "        messages: [",
  "          { role: 'system', content: NOOR_TASK_PROMPT },",
  "          { role: 'user', content: plain },",
  "        ],",
  "      }),",
  "    })",
  "      .then((res: Response) => (res.ok ? res.json() : null))",
  "      .then((data: { content?: string } | null) => {",
  '        if (!data || typeof data.content !== "string") return;',
  "        const parsed = parseTaskJson(data.content);",
  "        if (!parsed || parsed.length === 0) return;",
  "        setDetectedTasks((prev) => {",
  "          const merged = new Map<string, DetectedTask>();",
  "          for (const tk of [...prev, ...parsed]) merged.set(tk.text.toLowerCase(), tk);",
  "          return Array.from(merged.values()).slice(0, 6);",
  "        });",
  "      })",
  "      .catch(() => {})",
  "      .finally(() => setAiAnalyzing(false));",
  "  };",
].join("\n");

if (c.includes(helperAnchor) && !c.includes("runNoorTaskDetection")) {
  c = c.replace(helperAnchor, helperAnchor + "\n\n" + aiHelper);
  console.log("OK [3] runNoorTaskDetection helper added");
  ok++;
} else {
  console.log(c.includes(helperAnchor) ? "!! [3] already present" : "!! [3] helper anchor NOT FOUND");
}

// ---------- 4. Wire into autosave + Ctrl+S ----------
const call1 = "      setDetectedTasksTimed(detectTasks(editor.getText()));";
if (c.includes(call1) && !c.includes("runNoorTaskDetection(editor.getText())")) {
  c = c.replace(call1, call1 + "\n      runNoorTaskDetection(editor.getText());");
  console.log("OK [4a] autosave wired");
  ok++;
} else {
  console.log(c.includes(call1) ? "!! [4a] already wired" : "!! [4a] autosave call NOT FOUND");
}
const call2 = '        setDetectedTasksTimed(detectTasks(editor?.getText() || ""));';
if (c.includes(call2) && !c.includes("runNoorTaskDetection(editor?.getText()")) {
  c = c.replace(call2, call2 + "\n        runNoorTaskDetection(editor?.getText() || \"\");");
  console.log("OK [4b] Ctrl+S wired");
  ok++;
} else {
  console.log(c.includes(call2) ? "!! [4b] already wired" : "!! [4b] Ctrl+S call NOT FOUND");
}

// ---------- 5. Banner: show when analyzing + indicator line ----------
const bannerOpen = "          {detectedTasks.length > 0 && (";
if (c.includes(bannerOpen)) {
  c = c.replace(bannerOpen, "          {(detectedTasks.length > 0 || aiAnalyzing) && (");
  console.log("OK [5a] banner opens on analyzing too");
  ok++;
} else {
  console.log("!! [5a] banner open NOT FOUND");
}

const titleLine = "                  {t(\"notes.detectTasks\")}\n                </p>";
const indicator = [
  "                  {t(\"notes.detectTasks\")}",
  "                </p>",
  "                {aiAnalyzing && (",
  '                  <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5 mb-2">',
  '                    <Sparkles className="h-3 w-3 animate-pulse text-primary-500" />',
  "                    {t(\"notes.aiAnalyzing\")}",
  "                  </p>",
  "                )}",
].join("\n");
if (c.includes(titleLine) && !c.includes("notes.aiAnalyzing")) {
  c = c.replace(titleLine, indicator);
  console.log("OK [5b] analyzing indicator added");
  ok++;
} else {
  console.log(c.includes(titleLine) ? "!! [5b] already present" : "!! [5b] title line NOT FOUND");
}

save(c);
console.log(ok + " steps applied, done");
