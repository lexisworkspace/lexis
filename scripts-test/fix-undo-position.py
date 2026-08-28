import re

with open("src/app/grid/page.tsx", "r", encoding="utf-8") as f:
    c = f.read()

# Remove the undo/redo block that's in the wrong place (after gridRef)
undo_block_start = "  // Undo/Redo\n  const [history"
undo_block_end = "  }, [history, historyIdx, activeSS, activeSheet, refresh]);\n"
start_idx = c.find(undo_block_start)
if start_idx > 0:
    end_idx = c.find(undo_block_end, start_idx)
    if end_idx > 0:
        end_idx += len(undo_block_end)
        c = c[:start_idx] + c[end_idx:]
        print("Removed misplaced undo/redo block")

# Now insert it after the refresh callback
# Find "const refresh = useCallback"
refresh_pattern = "  const refresh = useCallback(() => {"
idx = c.find(refresh_pattern)
if idx > 0:
    # Find the end of refresh callback (the closing ");")
    depth = 0
    i = idx
    found_start = False
    while i < len(c):
        if c[i] == '(' and not found_start:
            found_start = True
            depth = 1
        elif c[i] == '(' and found_start:
            depth += 1
        elif c[i] == ')':
            depth -= 1
            if depth == 0:
                # Find the closing ");
                end = c.find(");", i)
                if end > 0:
                    insert_pos = end + 2
                    undo_code = """
  // Undo/Redo
  const [history, setHistory] = useState<Record<string, Cell>[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const pushHistory = useCallback((cells: Record<string, Cell>) => {
    setHistory(prev => {
      const h = prev.slice(0, historyIdx + 1);
      h.push(JSON.parse(JSON.stringify(cells)));
      if (h.length > 50) h.shift();
      return h;
    });
    setHistoryIdx(prev => Math.min(prev + 1, 49));
  }, [historyIdx]);
  const undo = useCallback(() => {
    if (historyIdx <= 0 || !activeSS || !activeSheet) return;
    const prev = history[historyIdx - 1];
    storage.updateSpreadsheet(activeSS.id, {
      sheets: activeSS.sheets.map(s => s.id === activeSheet.id ? { ...s, cells: prev } : s),
    });
    setHistoryIdx(p => p - 1);
    refresh();
  }, [history, historyIdx, activeSS, activeSheet, refresh]);
  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1 || !activeSS || !activeSheet) return;
    const next = history[historyIdx + 1];
    storage.updateSpreadsheet(activeSS.id, {
      sheets: activeSS.sheets.map(s => s.id === activeSheet.id ? { ...s, cells: next } : s),
    });
    setHistoryIdx(p => p + 1);
    refresh();
  }, [history, historyIdx, activeSS, activeSheet, refresh]);
"""
                    c = c[:insert_pos] + undo_code + c[insert_pos:]
                    print("Inserted undo/redo after refresh")
                break
        i += 1

with open("src/app/grid/page.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print(f"Grid fixed: {len(c)} chars")
