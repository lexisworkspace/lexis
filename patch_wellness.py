# Patch: wellness reminder kind + MoodFace analytics + theme config
import io

def patch(path, subs):
    with io.open(path, "rb") as f:
        data = f.read()
    nl = "\r\n" if b"\r\n" in data else "\n"
    c = data.replace(b"\r\n", b"\n").decode("utf-8")
    for old, new in subs:
        assert old in c, "NOT FOUND in " + path + ":\n" + old[:160]
        c = c.replace(old, new, 1)
    with io.open(path, "wb") as f:
        f.write(c.replace("\n", nl).encode("utf-8"))
    print("patched", path)

# 1. analytics page - MoodFace
patch("src/app/analytics/page.tsx", [
    ('import { Habit, MOODS } from "@/types";',
     'import { Habit, MOODS } from "@/types";\nimport { MoodFace } from "@/components/MoodFace";'),
    ('<span className="text-lg w-8 text-center">{mood.emoji}</span>',
     '<span className="flex w-8 items-center justify-center text-muted-foreground">\n                    <MoodFace mood={mood.value} className="h-5 w-5" />\n                  </span>'),
])

# 2. types - ThemeConfig
patch("src/types/index.ts", [
    ("  remindMentions?: boolean;\n}",
     "  remindMentions?: boolean;\n  remindWellness?: boolean;\n  wellnessTime?: string;\n}"),
])

# 3. storage - defaults
patch("src/lib/storage.ts", [
    ('theme: { theme: "dark", primaryColor: "#6366f1", fontSize: "md", reducedMotion: false, dyslexiaFriendly: false, highContrast: false, language: "en" },',
     'theme: { theme: "dark", primaryColor: "#6366f1", fontSize: "md", reducedMotion: false, dyslexiaFriendly: false, highContrast: false, language: "en", remindWellness: false, wellnessTime: "15:00" },'),
])

# 4. reminders.ts - wellness kind
patch("src/lib/reminders.ts", [
    ('export type ReminderKind = "habit" | "task" | "mention";',
     'export type ReminderKind = "habit" | "task" | "mention" | "wellness";'),
    ("""export interface ReminderSettings {
  enabled: boolean;
  habits: boolean;
  tasks: boolean;
  mentions: boolean;
}""",
     """export interface ReminderSettings {
  enabled: boolean;
  habits: boolean;
  tasks: boolean;
  mentions: boolean;
  wellness: boolean;
}"""),
    ("    mentions: theme.remindMentions ?? true,\n  };",
     "    mentions: theme.remindMentions ?? true,\n    wellness: theme.remindWellness ?? false,\n  };"),
    ("  const s = buildSituationModel(data, graph);\n  const out: ReminderItem[] = [];",
     """  const settings = getReminderSettings();
  const out: ReminderItem[] = [];

  // Daily breathing break - fires once the chosen time of day has passed.
  const wt = data.theme.wellnessTime;
  if (settings.wellness && wt) {
    const parts = wt.split(":").map((n) => parseInt(n, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const atMin = parts[0] * 60 + parts[1];
      if (nowMin >= atMin) {
        out.push({
          kind: "wellness",
          id: "daily-breath",
          title: "Time for a breathing break",
          body: "One minute of box breathing - close your eyes and breathe",
          href: "/journal",
        });
      }
    }
  }

  const s = buildSituationModel(data, graph);"""),
    ("""  const items = computeReminders(data, getGraph()).filter((i) =>
    i.kind === "habit" ? settings.habits : i.kind === "task" ? settings.tasks : settings.mentions
  );""",
     """  const items = computeReminders(data, getGraph()).filter((i) =>
    i.kind === "habit" ? settings.habits : i.kind === "task" ? settings.tasks : i.kind === "mention" ? settings.mentions : settings.wellness
  );"""),
    ("  const priority = { habit: 0, task: 1, mention: 2 } as const;",
     "  const priority = { habit: 0, task: 1, mention: 2, wellness: 3 } as const;"),
    ("    if (i.kind === \"habit\" ? !settings.habits : i.kind === \"task\" ? !settings.tasks : !settings.mentions) {",
     "    if (i.kind === \"habit\" ? !settings.habits : i.kind === \"task\" ? !settings.tasks : i.kind === \"mention\" ? !settings.mentions : !settings.wellness) {"),
])

# 5. ReminderCenter - icon
patch("src/components/layout/ReminderCenter.tsx", [
    ("import { Bell, Check, X, Flame, Clock, MessageSquare, BellOff } from \"lucide-react\";",
     "import { Bell, Check, X, Flame, Clock, MessageSquare, BellOff, Wind } from \"lucide-react\";"),
    ("""const KIND_ICON: Record<ReminderItem["kind"], typeof Flame> = {
  habit: Flame,
  task: Clock,
  mention: MessageSquare,
};""",
     """const KIND_ICON: Record<ReminderItem["kind"], typeof Flame> = {
  habit: Flame,
  task: Clock,
  mention: MessageSquare,
  wellness: Wind,
};"""),
])

# 6. settings - wellness toggle + time picker
patch("src/app/settings/page.tsx", [
    ("""            { key: "remindMentions" as const, label: t("settings.remindMentions"), desc: t("settings.remindMentionsDesc") },
          ].map((opt) => {""",
     """            { key: "remindMentions" as const, label: t("settings.remindMentions"), desc: t("settings.remindMentionsDesc") },
            { key: "remindWellness" as const, label: t("settings.remindWellness"), desc: t("settings.remindWellnessDesc") },
          ].map((opt) => {"""),
    ("""          })}
        </div>
      </motion.div>

      {/* Data Management */}""",
     """          })}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
            <span>
              <span className="block text-sm font-medium">{t("settings.wellnessTime")}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{t("settings.wellnessTimeDesc")}</span>
            </span>
            <input
              type="time"
              value={data.theme.wellnessTime || "15:00"}
              onChange={(e) => {
                storage.updateTheme({ wellnessTime: e.target.value });
                refresh();
              }}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
      </motion.div>

      {/* Data Management */}"""),
])

print("ALL OK")
