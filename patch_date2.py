# -*- coding: utf-8 -*-
# Reviewer fixes: use local getToday() (consistent with the stats block) for
# the date line, and drop the 'launching' auto-trigger false positive.
import io

JOBS = []

def rep(path, old, new, count=1):
    JOBS.append((path, old, new, count))

rep(
    "src/lib/ai.ts",
    """  const systemPrompt = `${model.systemPrompt}

Today is ${new Date().toISOString().slice(0, 10)}.

${stats}${searchBlock}`;""",
    """  const systemPrompt = `${model.systemPrompt}

Today is ${getToday()}.

${stats}${searchBlock}`;""",
)

rep(
    "src/lib/ai-stream.ts",
    r"""  const systemPrompt = `${model.systemPrompt}\n\nToday is ${new Date().toISOString().slice(0, 10)}.\n\n${stats}${searchBlock}`;""",
    r"""  const systemPrompt = `${model.systemPrompt}\n\nToday is ${getToday()}.\n\n${stats}${searchBlock}`;""",
)

rep(
    "src/lib/ai-stream.ts",
    'import { chat, buildStatsBlock, ChatOpts } from "./ai";\n',
    'import { chat, buildStatsBlock, ChatOpts } from "./ai";\nimport { getToday } from "./utils";\n',
)

rep(
    "src/lib/web-search.ts",
    """const LIVE_INTENTS =
  /\\b(weather|forecast|temperature|news|stocks?|bitcoin|ethereum|currency|traffic|earthquake|sunrise|sunset|gpt|chatgpt|release date|coming out|latest model|sequel|announcement|launching|launch date)\\b|\\b(price of|share price|exchange rate|air quality)\\b|°c|°f/i;""",
    """const LIVE_INTENTS =
  /\\b(weather|forecast|temperature|news|stocks?|bitcoin|ethereum|currency|traffic|earthquake|sunrise|sunset|gpt|chatgpt|release date|coming out|latest model|sequel|announcement|launch date)\\b|\\b(price of|share price|exchange rate|air quality)\\b|°c|°f/i;""",
)


def main():
    by_path = {}
    for path, old, new, count in JOBS:
        by_path.setdefault(path, []).append((old, new, count))
    for path, subs in by_path.items():
        with io.open(path, "r", encoding="utf-8", newline="") as f:
            data = f.read()
        nl = "\r\n" if "\r\n" in data else "\n"
        c = data.replace("\r\n", "\n")
        for old, new, count in subs:
            n = c.count(old)
            if n != count:
                raise SystemExit(
                    "BAD COUNT in %s (want %d, got %d): %r"
                    % (path, count, n, old[:70].replace("\n", "\\n"))
                )
            c = c.replace(old, new)
        with io.open(path, "w", encoding="utf-8", newline="") as f:
            f.write(c.replace("\n", nl))
    print("ALL PATCHES APPLIED")

if __name__ == "__main__":
    main()
