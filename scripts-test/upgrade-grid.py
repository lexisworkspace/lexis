import re

with open("src/app/grid/page.tsx", "r", encoding="utf-8") as f:
    c = f.read()

# === NEW FORMULAS ===
nf = """
    // VLOOKUP(lookup_val, range, col_index)
    const vlookupMatch = expr.match(/^VLOOKUP\\((.+)\\)$/);
    if (vlookupMatch) {
      const args = vlookupMatch[1].split(',').map(a => a.trim());
      if (args.length >= 3) {
        const lv = args[0].replace(/^"|"$/g, '');
        const rm = args[1].match(/^([A-Z]+)(\\d+):([A-Z]+)(\\d+)$/);
        if (rm) {
          const sc = rm[1].charCodeAt(0)-65, sr=parseInt(rm[2]), er=parseInt(rm[4]), ci=parseInt(args[2])-1;
          for (let r=sr;r<=er;r++) { if (getCellValue(cellKey(r,sc),cells,visited)===lv && ci>=0) return getCellValue(cellKey(r,sc+ci),cells,visited); }
          return '#N/A';
        }
      }
    }
    // SUMIF(range, criteria)
    const sumifMatch = expr.match(/^SUMIF\\((.+)\\)$/);
    if (sumifMatch) {
      const args = sumifMatch[1].split(',').map(a => a.trim());
      if (args.length >= 2) {
        const rm = args[0].match(/^([A-Z]+)(\\d+):([A-Z]+)(\\d+)$/);
        if (rm) {
          const sc=rm[1].charCodeAt(0)-65, sr=parseInt(rm[2]), er=parseInt(rm[4]), cr=args[1].replace(/^"|"$/g,'');
          let sum=0;
          for (let r=sr;r<=er;r++) { const v=getCellValue(cellKey(r,sc),cells,visited); if(v===cr) { const n=parseFloat(getCellValue(cellKey(r,sc+1),cells,visited)); if(!isNaN(n))sum+=n; } }
          return String(sum);
        }
      }
    }
    // COUNTIF(range, criteria)
    const countifMatch = expr.match(/^COUNTIF\\((.+)\\)$/);
    if (countifMatch) {
      const args = countifMatch[1].split(',').map(a => a.trim());
      if (args.length >= 2) {
        const rm = args[0].match(/^([A-Z]+)(\\d+):([A-Z]+)(\\d+)$/);
        if (rm) {
          const sc=rm[1].charCodeAt(0)-65, sr=parseInt(rm[2]), er=parseInt(rm[4]), cr=args[1].replace(/^"|"$/g,'');
          let count=0;
          for (let r=sr;r<=er;r++) { if(getCellValue(cellKey(r,sc),cells,visited)===cr)count++; }
          return String(count);
        }
      }
    }
    // UPPER/LOWER/TRIM
    const sfm = expr.match(/^(UPPER|LOWER|TRIM)\\(([A-Z]+\\d+|[\"].*[\"])\\)$/);
    if (sfm) {
      let v=sfm[2]; if(/^[A-Z]+\\d+$/.test(v)){const r=parseCellRef(v);v=r?getCellValue(cellKey(r.row,r.col),cells,visited):'';} else {v=v.replace(/^"|"$/g,'');}
      if(sfm[1]==='UPPER')return v.toUpperCase();if(sfm[1]==='LOWER')return v.toLowerCase();return v.trim();
    }
    // LEN
    const lm = expr.match(/^LEN\\(([A-Z]+\\d+|[\"].*[\"])\\)$/);
    if(lm){let v=lm[1];if(/^[A-Z]+\\d+$/.test(v)){const r=parseCellRef(v);v=r?getCellValue(cellKey(r.row,r.col),cells,visited):'';}else{v=v.replace(/^"|"$/g,'');}return String(v.length);}
    // LEFT/RIGHT
    const lrm = expr.match(/^(LEFT|RIGHT)\\(([A-Z]+\\d+|[\"].*[\"])\\s*,\\s*(\\d+)\\)$/);
    if(lrm){let v=lrm[2];if(/^[A-Z]+\\d+$/.test(v)){const r=parseCellRef(v);v=r?getCellValue(cellKey(r.row,r.col),cells,visited):'';}else{v=v.replace(/^"|"$/g,'');}const n=parseInt(lrm[3]);return lrm[1]==='LEFT'?v.slice(0,n):v.slice(-n);}
    // POWER/SQRT/MOD
    const mfm = expr.match(/^(POWER|SQRT|MOD)\\(([0-9.]+|[A-Z]+\\d+)(?:\\s*,\\s*([0-9.]+|[A-Z]+\\d+))?\\)$/);
    if(mfm){let a=parseFloat(mfm[2]);if(isNaN(a)){const r=parseCellRef(mfm[2]);a=r?parseFloat(getCellValue(cellKey(r.row,r.col),cells,visited)):0;}let b=mfm[3]?parseFloat(mfm[3]):0;if(mfm[3]&&isNaN(b)){const r=parseCellRef(mfm[3]);b=r?parseFloat(getCellValue(cellKey(r.row,r.col),cells,visited)):0;}if(mfm[1]==='POWER')return String(Math.pow(a,b));if(mfm[1]==='SQRT')return a>=0?String(Math.sqrt(a)):'#NUM!';if(mfm[1]==='MOD')return b!==0?String(a%b):'#DIV/0!';}
    // CEIL/FLOOR
    const cfm = expr.match(/^(CEIL|FLOOR)\\(([0-9.]+|[A-Z]+\\d+)\\)$/);
    if(cfm){let v=parseFloat(cfm[2]);if(isNaN(v)){const r=parseCellRef(cfm[2]);v=r?parseFloat(getCellValue(cellKey(r.row,r.col),cells,visited)):0;}return cfm[1]==='CEIL'?String(Math.ceil(v)):String(Math.floor(v));}
"""

target = '    return "#NAME?";'
replacement = nf + '\n' + target
c = c.replace(target, replacement, 1)

# === UNDO/REDO STATE ===
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
c = c.replace(
    '  const gridRef = useRef<HTMLDivElement>(null);',
    '  const gridRef = useRef<HTMLDivElement>(null);' + undo_code,
    1
)

# === KEYBOARD SHORTCUTS ===
old_key = '      if (e.key === "F2" || e.key === "Enter") {'
new_key = '      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); return; }\n      if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); return; }\n' + old_key
c = c.replace(old_key, new_key, 1)

with open("src/app/grid/page.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print(f"Grid updated: {len(c)} chars")
