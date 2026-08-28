import re, glob

# Files to process (exclude landing page, chat/markdown, notes image - those are dark-mode-only contexts)
files = glob.glob('src/app/*/page.tsx') + glob.glob('src/components/**/*.tsx', recursive=True)
exclude = ['landing', 'Markdown.tsx', 'ChartBlock.tsx', 'ImageNode.tsx']

replacements = {
    'text-zinc-400': 'text-muted-foreground',
    'text-zinc-300': 'text-muted-foreground',
    'text-zinc-200': 'text-muted-foreground',
    'bg-zinc-500/10': 'bg-muted',
    'bg-zinc-500/20': 'bg-muted',
    'hover:text-zinc-400': 'hover:text-foreground',
}

for f in sorted(set(files)):
    if any(ex in f for ex in exclude):
        continue
    try:
        content = open(f, encoding='utf-8').read()
        original = content
        for old, new in replacements.items():
            content = content.replace(old, new)
        if content != original:
            open(f, 'w', encoding='utf-8').write(content)
            print(f'Updated: {f}')
    except Exception as e:
        print(f'Error {f}: {e}')
