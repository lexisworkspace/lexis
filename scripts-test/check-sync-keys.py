#!/usr/bin/env python
"""Find which languages are missing sync keys and where to insert them."""
import re

with open('src/lib/i18n.ts', 'r', encoding='utf-8') as f:
    content = f.read()

lang_order = ['en','es','fr','de','pt','it','nl','pl','tr','ja','ko','ru','hi','vi','id','th','sv','ar','zh']

for lang in lang_order:
    m = re.search(rf'^  {lang}: \{{', content, re.MULTILINE)
    if not m:
        print(f'{lang}: NOT FOUND')
        continue
    
    block_start = m.start()
    # Find next language block
    next_block = len(content)
    for other in lang_order:
        if other == lang:
            continue
        nm = re.search(rf'^  {other}: \{{', content[m.end():], re.MULTILINE)
        if nm:
            candidate = nm.start() + m.end()
            if candidate < next_block:
                next_block = candidate
    
    block = content[block_start:next_block]
    has_sync = 'settings.sync' in block
    
    # Find last settings.* key
    settings_keys = re.findall(r'"(settings\.[^"]+)"', block)
    last_key = settings_keys[-1] if settings_keys else 'NONE'
    
    # Find line number of the block start
    line_num = content[:block_start].count('\n') + 1
    
    print(f'{lang} (line {line_num}): has_sync={has_sync}, last_settings_key={last_key}')
