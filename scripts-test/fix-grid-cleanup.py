with open("src/app/grid/page.tsx", "r", encoding="utf-8") as f:
    c = f.read()

# Remove the orphaned redo block (lines 439-451) - it's between gridRef and VISIBLE_ROWS
orphaned = """  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1 || !activeSS || !activeSheet) return;
    const next = history[historyIdx + 1];
    storage.updateSpreadsheet(activeSS.id, {
      sheets: activeSS.sheets.map(s => s.id === activeSheet.id ? { ...s, cells: next } : s),
    });
    setHistoryIdx(p => p + 1);
    refresh();
  }, [history, historyIdx, activeSS, activeSheet, refresh]);

  const VISIBLE_ROWS"""

replacement = """  const VISIBLE_ROWS"""

c = c.replace(orphaned, replacement, 1)

with open("src/app/grid/page.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print(f"Cleaned: {len(c)} chars, redo count: {c.count('const redo')}")
