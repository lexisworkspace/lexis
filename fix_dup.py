# -*- coding: utf-8 -*-
import io, re

path = 'src/lib/i18n.ts'
with io.open(path, 'rb') as f:
    data = f.read()
nl = '\r\n' if b'\r\n' in data else '\n'
c = data.replace(b'\r\n', b'\n').decode('utf-8')

lines = c.split('\n')
out = []
removed = 0
for ln in lines:
    # remove my duplicated heading1/2/3 lines (single-quoted values)
    if re.match(r'^    "notes\.heading[123]": \'.*?',$', ln):
        removed += 1
        continue
    # normalize my inserted single-quoted values to double quotes (match file style)
    m = re.match(r'^(    "notes\.[a-zA-Z]+": )\'(.*?)\'(,?)$', ln)
    if m:
        ln = m.group(1) + '"' + m.group(2) + '"' + (m.group(3) or '')
    out.append(ln)

c = '\n'.join(out)
with io.open(path, 'wb') as f:
    f.write(c.replace('\n', nl).encode('utf-8'))
print('removed', removed, 'duplicate heading lines')
