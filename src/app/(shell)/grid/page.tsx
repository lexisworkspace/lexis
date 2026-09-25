"use client";

import { useState, useCallback, useMemo, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  MoreHorizontal,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Paintbrush,
  Type,
  Eraser,
  Grid3x3,
  ChevronDown,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  ArrowLeft,
  Copy,
  Scissors,
  Clipboard,
  Rows3,
  Columns3,
  Minus,
  Equal,
  TrendingUp,
  Hash,
  Calendar,
  FileDown,
  HelpCircle,
} from "lucide-react";
import { storage } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";
import { useMobile } from "@/hooks/useMobile";
import { cn, generateId } from "@/lib/utils";
import { Spreadsheet, Sheet, Cell, CellFormat } from "@/types";

// ============================================================
// Helpers
// ============================================================

function colLabel(idx: number): string {
  let label = "";
  let i = idx;
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function parseCellRef(ref: string): { row: number; col: number } | null {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1]) {
    col = col * 26 + (ch.charCodeAt(0) - 64);
  }
  return { row: parseInt(m[2]) - 1, col: col - 1 };
}

function evalFormula(
  formula: string,
  cells: Record<string, Cell>,
  visited: Set<string> = new Set()
): string {
  try {
    const expr = formula.slice(1).toUpperCase().trim();

    // SUM(range)
    const sumMatch = expr.match(/^SUM\(([A-Z]+\d*):([A-Z]+\d*)\)$/);
    if (sumMatch) {
      const start = parseCellRef(sumMatch[1]);
      const end = parseCellRef(sumMatch[2]);
      if (!start || !end) return "#REF!";
      let sum = 0;
      for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
        for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
          const v = parseFloat(getCellValue(cellKey(r, c), cells, visited));
          if (!isNaN(v)) sum += v;
        }
      }
      return String(sum);
    }

    // AVG(range)
    const avgMatch = expr.match(/^AVG\(([A-Z]+\d*):([A-Z]+\d*)\)$/);
    if (avgMatch) {
      const start = parseCellRef(avgMatch[1]);
      const end = parseCellRef(avgMatch[2]);
      if (!start || !end) return "#REF!";
      let sum = 0, count = 0;
      for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
        for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
          const v = parseFloat(getCellValue(cellKey(r, c), cells, visited));
          if (!isNaN(v)) { sum += v; count++; }
        }
      }
      return count ? String(+(sum / count).toFixed(2)) : "#DIV/0!";
    }

    // COUNT(range)
    const countMatch = expr.match(/^COUNT\(([A-Z]+\d*):([A-Z]+\d*)\)$/);
    if (countMatch) {
      const start = parseCellRef(countMatch[1]);
      const end = parseCellRef(countMatch[2]);
      if (!start || !end) return "#REF!";
      let count = 0;
      for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
        for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
          const v = getCellValue(cellKey(r, c), cells, visited);
          if (v !== "") count++;
        }
      }
      return String(count);
    }

    // MIN / MAX
    const minMaxMatch = expr.match(/^(MIN|MAX)\(([A-Z]+\d*):([A-Z]+\d*)\)$/);
    if (minMaxMatch) {
      const fn = minMaxMatch[1] === "MIN" ? Math.min : Math.max;
      const start = parseCellRef(minMaxMatch[2]);
      const end = parseCellRef(minMaxMatch[3]);
      if (!start || !end) return "#REF!";
      const vals: number[] = [];
      for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
        for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
          const v = parseFloat(getCellValue(cellKey(r, c), cells, visited));
          if (!isNaN(v)) vals.push(v);
        }
      }
      return vals.length ? String(fn(...vals)) : "#N/A";
    }

    // CONCAT(a, b, ...)
    const concatMatch = expr.match(/^CONCAT\((.+)\)$/);
    if (concatMatch) {
      const parts = concatMatch[1].split(",").map(p => p.trim());
      return parts.map(p => {
        if (/^[A-Z]+\d+$/.test(p)) {
          const ref = parseCellRef(p);
          return ref ? getCellValue(cellKey(ref.row, ref.col), cells, visited) : p;
        }
        return p.replace(/^"|"$/g, "");
      }).join("");
    }

    // IF(condition, true_val, false_val)
    const ifMatch = expr.match(/^IF\((.+)\)$/);
    if (ifMatch) {
      const args = ifMatch[1].split(",").map(a => a.trim());
      if (args.length === 3) {
        let condStr = args[0];
        // Resolve cell refs in condition
        condStr = condStr.replace(/([A-Z]+)(\d+)/g, (match) => {
          const ref = parseCellRef(match);
          if (!ref) return "0";
          return getCellValue(cellKey(ref.row, ref.col), visited.size > 0 ? cells : cells, visited) || "0";
        });
        // Evaluate condition
        let condResult = false;
        const gtMatch = condStr.match(/^(.+)\s*>\s*(.+)$/);
        const ltMatch = condStr.match(/^(.+)\s*<\s*(.+)$/);
        const eqMatch = condStr.match(/^(.+)\s*=\s*(.+)$/);
        const neqMatch = condStr.match(/^(.+)\s*<>\s*(.+)$/);
        if (gtMatch) condResult = parseFloat(gtMatch[1]) > parseFloat(gtMatch[2]);
        else if (ltMatch) condResult = parseFloat(ltMatch[1]) < parseFloat(ltMatch[2]);
        else if (neqMatch) condResult = condStr.includes("<>") ? parseFloat(neqMatch[1]) !== parseFloat(neqMatch[2]) : condStr === "1";
        else if (eqMatch) condResult = parseFloat(eqMatch[1]) === parseFloat(eqMatch[2]);
        else condResult = parseFloat(condStr) !== 0;

        const result = condResult ? args[1] : args[2];
        // Check if result is a cell ref
        if (/^[A-Z]+\d+$/.test(result)) {
          const ref = parseCellRef(result);
          return ref ? getCellValue(cellKey(ref.row, ref.col), cells, visited) : result;
        }
        return result.replace(/^"|"$/g, "");
      }
    }

    // ABS(x)
    const absMatch = expr.match(/^ABS\(([A-Z]+\d*|[0-9.]+)\)$/);
    if (absMatch) {
      let val: number;
      if (/^[A-Z]+\d+$/.test(absMatch[1])) {
        const ref = parseCellRef(absMatch[1]);
        val = ref ? parseFloat(getCellValue(cellKey(ref.row, ref.col), cells, visited)) : NaN;
      } else {
        val = parseFloat(absMatch[1]);
      }
      return isNaN(val) ? "#N/A" : String(Math.abs(val));
    }

    // ROUND(x, decimals)
    const roundMatch = expr.match(/^ROUND\(([A-Z]+\d*|[0-9.]+)(?:,\s*(\d+))?\)$/);
    if (roundMatch) {
      let val: number;
      if (/^[A-Z]+\d+$/.test(roundMatch[1])) {
        const ref = parseCellRef(roundMatch[1]);
        val = ref ? parseFloat(getCellValue(cellKey(ref.row, ref.col), cells, visited)) : NaN;
      } else {
        val = parseFloat(roundMatch[1]);
      }
      const decimals = parseInt(roundMatch[2] || "0");
      return isNaN(val) ? "#N/A" : String(val.toFixed(decimals));
    }

    // TODAY()
    if (expr === "TODAY()") {
      return new Date().toLocaleDateString();
    }

    // NOW()
    if (expr === "NOW()") {
      return new Date().toLocaleString();
    }

    // Simple arithmetic: A1+B1 etc.
    let simplified = expr.replace(/([A-Z]+)(\d+)/g, (match) => {
      const ref = parseCellRef(match);
      if (!ref) return "0";
      return getCellValue(cellKey(ref.row, ref.col), cells, visited) || "0";
    });
    if (/^[\d\s+\-*/().]+$/.test(simplified)) {
      const result = Function(`"use strict"; return (${simplified})`)();
      if (typeof result === "number" && isFinite(result)) {
        return Number.isInteger(result) ? String(result) : result.toFixed(2);
      }
      return "#ERROR!";
    }


    // VLOOKUP(lookup_val, range, col_index)
    const vlookupMatch = expr.match(/^VLOOKUP\((.+)\)$/);
    if (vlookupMatch) {
      const args = vlookupMatch[1].split(',').map(a => a.trim());
      if (args.length >= 3) {
        const lv = args[0].replace(/^"|"$/g, '');
        const rm = args[1].match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
        if (rm) {
          const sc = rm[1].charCodeAt(0)-65, sr=parseInt(rm[2]), er=parseInt(rm[4]), ci=parseInt(args[2])-1;
          for (let r=sr;r<=er;r++) { if (getCellValue(cellKey(r,sc),cells,visited)===lv && ci>=0) return getCellValue(cellKey(r,sc+ci),cells,visited); }
          return '#N/A';
        }
      }
    }
    // SUMIF(range, criteria)
    const sumifMatch = expr.match(/^SUMIF\((.+)\)$/);
    if (sumifMatch) {
      const args = sumifMatch[1].split(',').map(a => a.trim());
      if (args.length >= 2) {
        const rm = args[0].match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
        if (rm) {
          const sc=rm[1].charCodeAt(0)-65, sr=parseInt(rm[2]), er=parseInt(rm[4]), cr=args[1].replace(/^"|"$/g,'');
          let sum=0;
          for (let r=sr;r<=er;r++) { const v=getCellValue(cellKey(r,sc),cells,visited); if(v===cr) { const n=parseFloat(getCellValue(cellKey(r,sc+1),cells,visited)); if(!isNaN(n))sum+=n; } }
          return String(sum);
        }
      }
    }
    // COUNTIF(range, criteria)
    const countifMatch = expr.match(/^COUNTIF\((.+)\)$/);
    if (countifMatch) {
      const args = countifMatch[1].split(',').map(a => a.trim());
      if (args.length >= 2) {
        const rm = args[0].match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
        if (rm) {
          const sc=rm[1].charCodeAt(0)-65, sr=parseInt(rm[2]), er=parseInt(rm[4]), cr=args[1].replace(/^"|"$/g,'');
          let count=0;
          for (let r=sr;r<=er;r++) { if(getCellValue(cellKey(r,sc),cells,visited)===cr)count++; }
          return String(count);
        }
      }
    }
    // UPPER/LOWER/TRIM
    const sfm = expr.match(/^(UPPER|LOWER|TRIM)\(([A-Z]+\d+|["].*["])\)$/);
    if (sfm) {
      let v=sfm[2]; if(/^[A-Z]+\d+$/.test(v)){const r=parseCellRef(v);v=r?getCellValue(cellKey(r.row,r.col),cells,visited):'';} else {v=v.replace(/^"|"$/g,'');}
      if(sfm[1]==='UPPER')return v.toUpperCase();if(sfm[1]==='LOWER')return v.toLowerCase();return v.trim();
    }
    // LEN
    const lm = expr.match(/^LEN\(([A-Z]+\d+|["].*["])\)$/);
    if(lm){let v=lm[1];if(/^[A-Z]+\d+$/.test(v)){const r=parseCellRef(v);v=r?getCellValue(cellKey(r.row,r.col),cells,visited):'';}else{v=v.replace(/^"|"$/g,'');}return String(v.length);}
    // LEFT/RIGHT
    const lrm = expr.match(/^(LEFT|RIGHT)\(([A-Z]+\d+|["].*["])\s*,\s*(\d+)\)$/);
    if(lrm){let v=lrm[2];if(/^[A-Z]+\d+$/.test(v)){const r=parseCellRef(v);v=r?getCellValue(cellKey(r.row,r.col),cells,visited):'';}else{v=v.replace(/^"|"$/g,'');}const n=parseInt(lrm[3]);return lrm[1]==='LEFT'?v.slice(0,n):v.slice(-n);}
    // POWER/SQRT/MOD
    const mfm = expr.match(/^(POWER|SQRT|MOD)\(([0-9.]+|[A-Z]+\d+)(?:\s*,\s*([0-9.]+|[A-Z]+\d+))?\)$/);
    if(mfm){let a=parseFloat(mfm[2]);if(isNaN(a)){const r=parseCellRef(mfm[2]);a=r?parseFloat(getCellValue(cellKey(r.row,r.col),cells,visited)):0;}let b=mfm[3]?parseFloat(mfm[3]):0;if(mfm[3]&&isNaN(b)){const r=parseCellRef(mfm[3]);b=r?parseFloat(getCellValue(cellKey(r.row,r.col),cells,visited)):0;}if(mfm[1]==='POWER')return String(Math.pow(a,b));if(mfm[1]==='SQRT')return a>=0?String(Math.sqrt(a)):'#NUM!';if(mfm[1]==='MOD')return b!==0?String(a%b):'#DIV/0!';}
    // CEIL/FLOOR
    const cfm = expr.match(/^(CEIL|FLOOR)\(([0-9.]+|[A-Z]+\d+)\)$/);
    if(cfm){let v=parseFloat(cfm[2]);if(isNaN(v)){const r=parseCellRef(cfm[2]);v=r?parseFloat(getCellValue(cellKey(r.row,r.col),cells,visited)):0;}return cfm[1]==='CEIL'?String(Math.ceil(v)):String(Math.floor(v));}

    return "#NAME?";
  } catch {
    return "#ERROR!";
  }
}

function getCellValue(key: string, cells: Record<string, Cell>, visited: Set<string> = new Set()): string {
  const cell = cells[key];
  if (!cell) return "";
  if (cell.formula) {
    if (visited.has(key)) return "#CIRC!";
    visited.add(key);
    return evalFormula(cell.formula, cells, visited);
  }
  return cell.value;
}

function csvToArray(csv: string): string[][] {
  return csv.split("\n").filter(Boolean).map(row => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of row) {
      if (inQuotes) {
        if (ch === '"') { inQuotes = false; } else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { result.push(current); current = ""; }
        else { current += ch; }
      }
    }
    result.push(current);
    return result;
  });
}

function arrayToCsv(data: string[][]): string {
  return data.map(row =>
    row.map(cell => cell.includes(",") || cell.includes('"') || cell.includes("\n")
      ? `"${cell.replace(/"/g, '""')}"` : cell
    ).join(",")
  ).join("\n");
}

// ============================================================
// Color palette
// ============================================================

const CELL_COLORS = [
  "transparent",
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
  "#fca5a5", "#fdba74", "#fde047", "#86efac",
  "#93c5fd", "#c4b5fd", "#f9a8d4", "#d1d5db",
];

// ============================================================
// Help Tutorial Components
// ============================================================

function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wider">
        {title}
      </h3>
      <div className="space-y-2.5">
        {children}
      </div>
    </div>
  );
}

function HelpItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function FormulaItem({ formula, desc }: { formula: string; desc: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <code className="text-xs font-mono text-primary">{formula}</code>
      <span className="text-[11px] text-muted-foreground">{desc}</span>
    </div>
  );
}

function ShortcutItem({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-mono font-medium text-foreground">
        {keys}
      </kbd>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function GridPage() {
  return (
    <Suspense fallback={<div className="h-dvh" />}>
      <GridPageInner />
    </Suspense>
  );
}

function GridPageInner() {
  const { t } = useI18n();
  const isMobile = useMobile();
  const searchParams = useSearchParams();
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [activeSS, setActiveSS] = useState<Spreadsheet | null>(null);
  const [activeSheet, setActiveSheet] = useState<Sheet | null>(null);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showFormatBar, setShowFormatBar] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState<"bg" | "text" | null>(null);
  const [showSSMenu, setShowSSMenu] = useState<string | null>(null);
  const [renamingSS, setRenamingSS] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; cellKey: string } | null>(null);
  const [clipboard, setClipboard] = useState<{ cell: Cell; key: string } | null>(null);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [renamingSheet, setRenamingSheet] = useState<string | null>(null);
  const [renameSheetValue, setRenameSheetValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const VISIBLE_ROWS = 100;
  const VISIBLE_COLS = 26;

  // Load spreadsheets (+ deep link: /grid?open=<id> from global search)
  useEffect(() => {
    const ss = storage.getSpreadsheets();
    setSpreadsheets(ss);
    const deepLink = searchParams.get("open");
    if (deepLink) {
      const target = ss.find((s) => s.id === deepLink);
      if (target) {
        setActiveSS(target);
        setActiveSheet(target.sheets.find((s: any) => s.id === target.activeSheetId) || target.sheets[0]);
        return;
      }
    }
    if (ss.length > 0 && !activeSS) {
      setActiveSS(ss[0]);
      setActiveSheet(ss[0].sheets.find((s: any) => s.id === ss[0].activeSheetId) || ss[0].sheets[0]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    const ss = storage.getSpreadsheets();
    setSpreadsheets(ss);
    if (activeSS) {
      const updated = ss.find((s) => s.id === activeSS.id);
      if (updated) {
        setActiveSS(updated);
        setActiveSheet(updated.sheets.find((s: any) => s.id === activeSheet?.id) || updated.sheets[0]);
      }
    }
  }, [activeSS, activeSheet]);
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


  // Create new spreadsheet
  const createSS = useCallback(() => {
    const ss = storage.addSpreadsheet(t("grid.placeholder"));
    refresh();
    setActiveSS(ss);
    setActiveSheet(ss.sheets[0]);
  }, [t, refresh]);

  // Delete spreadsheet
  const deleteSS = useCallback((id: string) => {
    storage.deleteSpreadsheet(id);
    const remaining = storage.getSpreadsheets();
    setSpreadsheets(remaining);
    if (activeSS?.id === id) {
      setActiveSS(remaining[0] || null);
      setActiveSheet(remaining[0]?.sheets[0] || null);
    }
  }, [activeSS]);

  // Switch to spreadsheet
  const switchSS = useCallback((ss: Spreadsheet) => {
    setActiveSS(ss);
    setActiveSheet(ss.sheets.find((s) => s.id === ss.activeSheetId) || ss.sheets[0]);
    setSelectedCell(null);
    setSelectedRange(null);
    setEditingCell(null);
    setShowSSMenu(null);
  }, []);

  // Switch sheet tab
  const switchSheet = useCallback((sheet: Sheet) => {
    if (!activeSS) return;
    setActiveSheet(sheet);
    storage.updateSpreadsheet(activeSS.id, { activeSheetId: sheet.id });
    setSelectedCell(null);
    setSelectedRange(null);
    setEditingCell(null);
  }, [activeSS]);

  // Add sheet
  const addSheet = useCallback(() => {
    if (!activeSS) return;
    const sheetId = generateId();
    const newSheet: Sheet = {
      id: sheetId,
      name: `Sheet ${activeSS.sheets.length + 1}`,
      cells: {},
      colWidths: {},
      rowHeights: {},
      rowCount: 100,
      colCount: 26,
      frozenRows: 0,
      frozenCols: 0,
      createdAt: new Date().toISOString(),
    };
    storage.updateSpreadsheet(activeSS.id, {
      sheets: [...activeSS.sheets, newSheet],
      activeSheetId: sheetId,
    });
    refresh();
  }, [activeSS, refresh]);

  // Delete sheet
  const deleteSheet = useCallback((sheetId: string) => {
    if (!activeSS || activeSS.sheets.length <= 1) return;
    const remaining = activeSS.sheets.filter((s) => s.id !== sheetId);
    storage.updateSpreadsheet(activeSS.id, {
      sheets: remaining,
      activeSheetId: remaining[0].id,
    });
    refresh();
  }, [activeSS, refresh]);

  // Rename sheet
  const startRenameSheet = useCallback((sheetId: string) => {
    const sheet = activeSS?.sheets.find(s => s.id === sheetId);
    if (sheet) {
      setRenamingSheet(sheetId);
      setRenameSheetValue(sheet.name);
    }
  }, [activeSS]);

  const commitRenameSheet = useCallback(() => {
    if (renamingSheet && renameSheetValue.trim() && activeSS) {
      storage.updateSpreadsheet(activeSS.id, {
        sheets: activeSS.sheets.map(s =>
          s.id === renamingSheet ? { ...s, name: renameSheetValue.trim() } : s
        ),
      });
      refresh();
    }
    setRenamingSheet(null);
  }, [renamingSheet, renameSheetValue, activeSS, refresh]);

  // Cell editing
  const startEdit = useCallback((key: string) => {
    if (!activeSheet) return;
    setEditingCell(key);
    const cell = activeSheet.cells[key];
    setEditValue(cell?.formula || cell?.value || "");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [activeSheet]);

  const commitEdit = useCallback(() => {
    if (!activeSS || !activeSheet || !editingCell) return;
    const isFormula = editValue.startsWith("=");
    const cell: Cell = {
      value: isFormula ? "" : editValue,
      formula: isFormula ? editValue : undefined,
      format: activeSheet.cells[editingCell]?.format,
    };
    storage.updateCell(activeSS.id, activeSheet.id, editingCell, cell);
    setEditingCell(null);
    setEditValue("");
    refresh();
  }, [activeSS, activeSheet, editingCell, editValue, refresh]);

  // Cell formatting
  const toggleFormat = useCallback((prop: keyof CellFormat) => {
    if (!activeSS || !activeSheet || !selectedCell) return;
    const existing = activeSheet.cells[selectedCell]?.format || {};
    const cell: Cell = {
      value: activeSheet.cells[selectedCell]?.value || "",
      formula: activeSheet.cells[selectedCell]?.formula,
      format: { ...existing, [prop]: !existing[prop] },
    };
    storage.updateCell(activeSS.id, activeSheet.id, selectedCell, cell);
    refresh();
  }, [activeSS, activeSheet, selectedCell, refresh]);

  const setFormatAlign = useCallback((align: "left" | "center" | "right") => {
    if (!activeSS || !activeSheet || !selectedCell) return;
    const existing = activeSheet.cells[selectedCell]?.format || {};
    const cell: Cell = {
      value: activeSheet.cells[selectedCell]?.value || "",
      formula: activeSheet.cells[selectedCell]?.formula,
      format: { ...existing, align },
    };
    storage.updateCell(activeSS.id, activeSheet.id, selectedCell, cell);
    refresh();
  }, [activeSS, activeSheet, selectedCell, refresh]);

  const setFormatColor = useCallback((prop: "bgColor" | "textColor", color: string) => {
    if (!activeSS || !activeSheet || !selectedCell) return;
    const existing = activeSheet.cells[selectedCell]?.format || {};
    const cell: Cell = {
      value: activeSheet.cells[selectedCell]?.value || "",
      formula: activeSheet.cells[selectedCell]?.formula,
      format: { ...existing, [prop]: color === "transparent" ? undefined : color },
    };
    storage.updateCell(activeSS.id, activeSheet.id, selectedCell, cell);
    refresh();
    setShowColorPicker(null);
  }, [activeSS, activeSheet, selectedCell, refresh]);

  const clearFormat = useCallback(() => {
    if (!activeSS || !activeSheet || !selectedCell) return;
    const existing = activeSheet.cells[selectedCell];
    if (!existing) return;
    const cell: Cell = { value: existing.value, formula: existing.formula };
    storage.updateCell(activeSS.id, activeSheet.id, selectedCell, cell);
    refresh();
  }, [activeSS, activeSheet, selectedCell, refresh]);

  // Copy / Cut / Paste
  const handleCopy = useCallback(() => {
    if (!activeSheet || !selectedCell) return;
    const cell = activeSheet.cells[selectedCell];
    if (cell) {
      setClipboard({ cell: { ...cell }, key: selectedCell });
    }
    // Also copy to system clipboard
    const val = getCellValue(selectedCell, activeSheet.cells);
    navigator.clipboard?.writeText(val).catch(() => {});
  }, [activeSheet, selectedCell]);

  const handleCut = useCallback(() => {
    if (!activeSS || !activeSheet || !selectedCell) return;
    handleCopy();
    // Clear the source cell
    const cell = activeSheet.cells[selectedCell];
    if (cell) {
      storage.updateCell(activeSS.id, activeSheet.id, selectedCell, { value: "", format: cell.format });
      refresh();
    }
  }, [activeSS, activeSheet, selectedCell, handleCopy, refresh]);

  const handlePaste = useCallback(async () => {
    if (!activeSS || !activeSheet || !selectedCell) return;
    const [r, c] = selectedCell.split(",").map(Number);

    // Try system clipboard first
    try {
      const text = await navigator.clipboard?.readText();
      if (text && text.includes("\t")) {
        // Tab-separated paste (from spreadsheets)
        const rows = text.split("\n").filter(Boolean);
        rows.forEach((row, ri) => {
          const cols = row.split("\t");
          cols.forEach((val, ci) => {
            const key = cellKey(r + ri, c + ci);
            storage.updateCell(activeSS.id, activeSheet.id, key, { value: val });
          });
        });
        refresh();
        return;
      } else if (text && text.includes(",")) {
        // CSV paste
        const rows = csvToArray(text);
        rows.forEach((row, ri) => {
          row.forEach((val, ci) => {
            const key = cellKey(r + ri, c + ci);
            storage.updateCell(activeSS.id, activeSheet.id, key, { value: val });
          });
        });
        refresh();
        return;
      } else if (text) {
        storage.updateCell(activeSS.id, activeSheet.id, selectedCell, { value: text });
        refresh();
        return;
      }
    } catch {}

    // Fallback to internal clipboard
    if (clipboard) {
      const cell: Cell = { ...clipboard.cell, format: { ...clipboard.cell.format } };
      storage.updateCell(activeSS.id, activeSheet.id, selectedCell, cell);
      refresh();
    }
  }, [activeSS, activeSheet, selectedCell, clipboard, refresh]);

  // Insert / Delete rows & columns
  const insertRow = useCallback((above: boolean) => {
    if (!activeSS || !activeSheet || !selectedCell) return;
    const [r] = selectedCell.split(",").map(Number);
    const newCells: Record<string, Cell> = {};
    for (const [key, cell] of Object.entries(activeSheet.cells)) {
      const [cr, cc] = key.split(",").map(Number);
      if (cr >= r && !above) {
        newCells[cellKey(cr + 1, cc)] = cell;
      } else if (cr > r && above) {
        newCells[cellKey(cr + 1, cc)] = cell;
      } else {
        newCells[key] = cell;
      }
    }
    storage.updateSpreadsheet(activeSS.id, {
      sheets: activeSS.sheets.map(s =>
        s.id === activeSheet.id ? { ...s, cells: newCells, rowCount: s.rowCount + 1 } : s
      ),
    });
    refresh();
  }, [activeSS, activeSheet, refresh]);

  const insertCol = useCallback((left: boolean) => {
    if (!activeSS || !activeSheet || !selectedCell) return;
    const [, c] = selectedCell.split(",").map(Number);
    const newCells: Record<string, Cell> = {};
    for (const [key, cell] of Object.entries(activeSheet.cells)) {
      const [cr, cc] = key.split(",").map(Number);
      if (cc >= c && !left) {
        newCells[cellKey(cr, cc + 1)] = cell;
      } else if (cc > c && left) {
        newCells[cellKey(cr, cc + 1)] = cell;
      } else {
        newCells[key] = cell;
      }
    }
    storage.updateSpreadsheet(activeSS.id, {
      sheets: activeSS.sheets.map(s =>
        s.id === activeSheet.id ? { ...s, cells: newCells, colCount: s.colCount + 1 } : s
      ),
    });
    refresh();
  }, [activeSS, activeSheet, refresh]);

  const deleteRow = useCallback(() => {
    if (!activeSS || !activeSheet || !selectedCell) return;
    const [r] = selectedCell.split(",").map(Number);
    const newCells: Record<string, Cell> = {};
    for (const [key, cell] of Object.entries(activeSheet.cells)) {
      const [cr, cc] = key.split(",").map(Number);
      if (cr === r) continue;
      if (cr > r) {
        newCells[cellKey(cr - 1, cc)] = cell;
      } else {
        newCells[key] = cell;
      }
    }
    storage.updateSpreadsheet(activeSS.id, {
      sheets: activeSS.sheets.map(s =>
        s.id === activeSheet.id ? { ...s, cells: newCells, rowCount: Math.max(1, s.rowCount - 1) } : s
      ),
    });
    refresh();
  }, [activeSS, activeSheet, refresh]);

  const deleteCol = useCallback(() => {
    if (!activeSS || !activeSheet || !selectedCell) return;
    const [, c] = selectedCell.split(",").map(Number);
    const newCells: Record<string, Cell> = {};
    for (const [key, cell] of Object.entries(activeSheet.cells)) {
      const [cr, cc] = key.split(",").map(Number);
      if (cc === c) continue;
      if (cc > c) {
        newCells[cellKey(cr, cc - 1)] = cell;
      } else {
        newCells[key] = cell;
      }
    }
    storage.updateSpreadsheet(activeSS.id, {
      sheets: activeSS.sheets.map(s =>
        s.id === activeSheet.id ? { ...s, cells: newCells, colCount: Math.max(1, s.colCount - 1) } : s
      ),
    });
    refresh();
  }, [activeSS, activeSheet, refresh]);

  // Clear all cells
  const clearAll = useCallback(() => {
    if (!activeSS || !activeSheet) return;
    storage.updateSpreadsheet(activeSS.id, {
      sheets: activeSS.sheets.map(s =>
        s.id === activeSheet.id ? { ...s, cells: {} } : s
      ),
    });
    refresh();
  }, [activeSS, activeSheet, refresh]);

  // Find & Replace
  const handleFindReplace = useCallback(() => {
    if (!activeSS || !activeSheet || !findQuery) return;
    let count = 0;
    const newCells = { ...activeSheet.cells };
    for (const [key, cell] of Object.entries(newCells)) {
      const val = cell.formula || cell.value;
      if (val.includes(findQuery)) {
        newCells[key] = {
          ...cell,
          value: cell.value.replace(findQuery, replaceQuery),
          formula: cell.formula?.replace(findQuery, replaceQuery),
        };
        count++;
      }
    }
    if (count > 0) {
      storage.updateSpreadsheet(activeSS.id, {
        sheets: activeSS.sheets.map(s =>
          s.id === activeSheet.id ? { ...s, cells: newCells } : s
        ),
      });
      refresh();
    }
  }, [activeSS, activeSheet, findQuery, replaceQuery, refresh]);

  // CSV Export
  const exportCsv = useCallback(() => {
    if (!activeSheet) return;
    const maxRow = Math.max(...Object.keys(activeSheet.cells).map(k => parseInt(k.split(",")[0])), 0);
    const maxCol = Math.max(...Object.keys(activeSheet.cells).map(k => parseInt(k.split(",")[1])), 0);
    const data: string[][] = [];
    for (let r = 0; r <= maxRow; r++) {
      const row: string[] = [];
      for (let c = 0; c <= maxCol; c++) {
        row.push(getCellValue(cellKey(r, c), activeSheet.cells));
      }
      data.push(row);
    }
    const csv = arrayToCsv(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSS?.name || "spreadsheet"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeSheet, activeSS]);

  // CSV Import
  const importCsv = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !activeSS || !activeSheet) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const data = csvToArray(text);
        const newCells: Record<string, Cell> = {};
        data.forEach((row, ri) => {
          row.forEach((val, ci) => {
            if (val) newCells[cellKey(ri, ci)] = { value: val };
          });
        });
        storage.updateSpreadsheet(activeSS.id, {
          sheets: activeSS.sheets.map(s =>
            s.id === activeSheet.id ? { ...s, cells: newCells } : s
          ),
        });
        refresh();
      };
      reader.readAsText(file);
    };
    input.click();
  }, [activeSS, activeSheet, refresh]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl shortcuts
    if ((e.ctrlKey || e.metaKey) && !editingCell) {
      if (e.key === "c") { handleCopy(); return; }
      if (e.key === "x") { handleCut(); return; }
      if (e.key === "v") { e.preventDefault(); handlePaste(); return; }
      if (e.key === "f") { e.preventDefault(); setShowFindReplace(true); setTimeout(() => findInputRef.current?.focus(), 100); return; }
    }

    if (showFindReplace) {
      if (e.key === "Escape") setShowFindReplace(false);
      return;
    }

    if (!selectedCell || !activeSheet) return;

    const [r, c] = selectedCell.split(",").map(Number);

    if (editingCell) {
      if (e.key === "Enter") { commitEdit(); setSelectedCell(cellKey(r + 1, c)); }
      else if (e.key === "Tab") { e.preventDefault(); commitEdit(); setSelectedCell(cellKey(r, c + 1)); }
      else if (e.key === "Escape") { setEditingCell(null); setEditValue(""); }
      return;
    }

    if (e.key === "Enter" || e.key === "F2") { startEdit(selectedCell); e.preventDefault(); }
    else if (e.key === "ArrowUp" && r > 0) { setSelectedCell(cellKey(r - 1, c)); e.preventDefault(); }
    else if (e.key === "ArrowDown") { setSelectedCell(cellKey(r + 1, c)); e.preventDefault(); }
    else if (e.key === "ArrowLeft" && c > 0) { setSelectedCell(cellKey(r, c - 1)); e.preventDefault(); }
    else if (e.key === "ArrowRight") { setSelectedCell(cellKey(r, c + 1)); e.preventDefault(); }
    else if (e.key === "Tab") { e.preventDefault(); setSelectedCell(cellKey(r, c + 1)); }
    else if (e.key === "Delete" || e.key === "Backspace") {
      if (activeSS) {
        const newCells = { ...activeSheet.cells };
        delete newCells[selectedCell];
        storage.updateSpreadsheet(activeSS.id, {
          sheets: activeSS.sheets.map((s) =>
            s.id === activeSheet.id ? { ...s, cells: newCells } : s
          ),
        });
        refresh();
      }
    }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      startEdit(selectedCell);
      setEditValue(e.key);
    }
  }, [selectedCell, activeSheet, editingCell, startEdit, commitEdit, activeSS, refresh, handleCopy, handleCut, handlePaste, showFindReplace]);

  // Context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, key: string) => {
    e.preventDefault();
    setSelectedCell(key);
    setContextMenu({ x: e.clientX, y: e.clientY, cellKey: key });
  }, []);

  // Close context menu on click
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // Rename spreadsheet
  const startRenameSS = useCallback((ss: Spreadsheet) => {
    setRenamingSS(ss.id);
    setRenameValue(ss.name);
    setShowSSMenu(null);
  }, []);

  const commitRenameSS = useCallback(() => {
    if (renamingSS && renameValue.trim()) {
      storage.updateSpreadsheet(renamingSS, { name: renameValue.trim() });
      refresh();
    }
    setRenamingSS(null);
  }, [renamingSS, renameValue, refresh]);

  // Status bar stats
  const stats = useMemo(() => {
    if (!activeSheet || !selectedCell) return null;
    const vals: number[] = [];
    let count = 0;
    // Compute stats for the entire column
    const [, col] = selectedCell.split(",").map(Number);
    for (let r = 0; r < 200; r++) {
      const v = getCellValue(cellKey(r, col), activeSheet.cells);
      if (v !== "") {
        count++;
        const n = parseFloat(v);
        if (!isNaN(n)) vals.push(n);
      }
    }
    if (count === 0) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return {
      count,
      sum: vals.length > 0 ? +sum.toFixed(2) : null,
      avg: vals.length > 0 ? +(sum / vals.length).toFixed(2) : null,
      min: vals.length > 0 ? Math.min(...vals) : null,
      max: vals.length > 0 ? Math.max(...vals) : null,
    };
  }, [activeSheet, selectedCell]);

  // Display value for formula bar
  const displayValue = useMemo(() => {
    if (!selectedCell || !activeSheet) return "";
    const cell = activeSheet.cells[selectedCell];
    if (!cell) return "";
    if (cell.formula) {
      return getCellValue(selectedCell, activeSheet.cells);
    }
    return cell.value || "";
  }, [selectedCell, activeSheet]);

  // ============================================================
  // Mobile guard — Grid is desktop-only by design
  // ============================================================

  if (isMobile) {
    return (
      <div className="relative flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.grid")}</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("mode.mobileUnavailable")}</p>
      </div>
    );
  }

  // ============================================================
  // Empty state
  // ============================================================

  if (spreadsheets.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background md:left-[260px]"
      >
        {/* Back to workspace */}
        <a href="/" className="absolute top-4 left-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </a>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("grid.noSpreadsheets")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("grid.noSpreadsheetsHint")}</p>
          </div>
          <button
            onClick={createSS}
            className="flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            {t("grid.newSpreadsheet")}
          </button>
        </motion.div>
      </motion.div>
    );
  }

  // ============================================================
  // Main grid view — full screen
  // ============================================================

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-background md:left-[260px]"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: "none" }}
    >
      {/* Top bar: back + spreadsheet name + actions */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2 shrink-0">
        {/* Back to workspace */}
        <a href="/" className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </a>

        {/* Spreadsheet selector */}
        <div className="relative">
          <button
            onClick={() => setShowSSMenu(showSSMenu ? null : "open")}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            {renamingSS === activeSS?.id ? (
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRenameSS}
                onKeyDown={(e) => { if (e.key === "Enter") commitRenameSS(); }}
                autoFocus
                className="w-40 bg-transparent text-sm font-medium outline-none"
              />
            ) : (
              <span className="max-w-[200px] truncate">{activeSS?.name}</span>
            )}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          <AnimatePresence>
            {showSSMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
              >
                {spreadsheets.map((ss) => (
                  <button
                    key={ss.id}
                    onClick={() => switchSS(ss)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                      ss.id === activeSS?.id && "bg-muted"
                    )}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate">{ss.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); startRenameSS(ss); }}
                      className="rounded p-1 text-muted-foreground hover:bg-accent"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </button>
                  </button>
                ))}
                <div className="border-t border-border">
                  <button
                    onClick={() => { createSS(); setShowSSMenu(null); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t("grid.newSpreadsheet")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Toolbar buttons */}
        <button onClick={handleCopy} className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted" title={t("grid.copy")}>
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button onClick={handleCut} className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted" title={t("grid.cut")}>
          <Scissors className="h-3.5 w-3.5" />
        </button>
        <button onClick={handlePaste} className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted" title={t("grid.paste")}>
          <Clipboard className="h-3.5 w-3.5" />
        </button>

        <div className="h-4 w-px bg-border" />

        <button onClick={() => setShowFormatBar(!showFormatBar)} className={cn("rounded p-1.5 transition-colors", showFormatBar ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted")} title="Format">
          <Paintbrush className="h-3.5 w-3.5" />
        </button>

        <button onClick={() => setShowFindReplace(true)} className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted" title={t("grid.findReplace")}>
          <Search className="h-3.5 w-3.5" />
        </button>

        <div className="flex-1" />

        {/* Import / Export */}
        <button onClick={importCsv} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted" title={t("grid.importCsv")}>
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("grid.importCsv")}</span>
        </button>
        <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted" title={t("grid.exportCsv")}>
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("grid.exportCsv")}</span>
        </button>

        <div className="h-4 w-px bg-border" />

        {/* Help */}
        <button onClick={() => setShowHelp(true)} className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted" title={t("grid.help")}>
          <HelpCircle className="h-3.5 w-3.5" />
        </button>

        {/* Delete spreadsheet */}
        {activeSS && spreadsheets.length > 0 && (
          <button
            onClick={() => { if (confirm(t("grid.deleteConfirm"))) deleteSS(activeSS.id); }}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            title={t("grid.delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Find & Replace bar */}
      <AnimatePresence>
        {showFindReplace && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border bg-muted/30"
          >
            <div className="flex items-center gap-2 px-4 py-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={findInputRef}
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                placeholder={t("grid.findPlaceholder")}
                className="w-40 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-foreground/20"
                autoFocus
              />
              <span className="text-xs text-muted-foreground">→</span>
              <input
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder={t("grid.replacePlaceholder")}
                className="w-40 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-foreground/20"
              />
              <button onClick={handleFindReplace} className="rounded-lg bg-foreground px-3 py-1 text-xs font-medium text-background transition-opacity hover:opacity-90">
                {t("grid.replaceAll")}
              </button>
              <button onClick={() => setShowFindReplace(false)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                <span className="text-xs">✕</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cell reference + formula bar */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-1.5 shrink-0">
        <div className="flex h-7 w-16 items-center justify-center rounded bg-muted text-xs font-mono font-medium text-muted-foreground">
          {selectedCell ? `${colLabel(parseInt(selectedCell.split(",")[1] || "0"))}${parseInt(selectedCell.split(",")[0] || "0") + 1}` : "—"}
        </div>
        <span className="text-xs text-muted-foreground">fx</span>
        <div className="flex-1">
          {editingCell ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") { setEditingCell(null); setEditValue(""); }
                e.stopPropagation();
              }}
              className="w-full bg-transparent px-2 py-1 text-sm font-mono outline-none"
              placeholder={t("grid.formulaHint")}
            />
          ) : (
            <div className="px-2 py-1 text-sm font-mono text-muted-foreground">
              {displayValue}
            </div>
          )}
        </div>
      </div>

      {/* Format toolbar */}
      <AnimatePresence>
        {showFormatBar && selectedCell && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border shrink-0"
          >
            <div className="flex items-center gap-1 px-4 py-1.5">
              <button onClick={() => toggleFormat("bold")} className={cn("rounded p-1.5 transition-colors", activeSheet?.cells[selectedCell]?.format?.bold ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted")} title={t("grid.bold")}>
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => toggleFormat("italic")} className={cn("rounded p-1.5 transition-colors", activeSheet?.cells[selectedCell]?.format?.italic ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted")} title={t("grid.italic")}>
                <Italic className="h-3.5 w-3.5" />
              </button>
              <div className="mx-1 h-4 w-px bg-border" />
              <button onClick={() => setFormatAlign("left")} className="rounded p-1.5 text-muted-foreground hover:bg-muted" title={t("grid.alignLeft")}><AlignLeft className="h-3.5 w-3.5" /></button>
              <button onClick={() => setFormatAlign("center")} className="rounded p-1.5 text-muted-foreground hover:bg-muted" title={t("grid.alignCenter")}><AlignCenter className="h-3.5 w-3.5" /></button>
              <button onClick={() => setFormatAlign("right")} className="rounded p-1.5 text-muted-foreground hover:bg-muted" title={t("grid.alignRight")}><AlignRight className="h-3.5 w-3.5" /></button>
              <div className="mx-1 h-4 w-px bg-border" />
              <div className="relative">
                <button onClick={() => setShowColorPicker(showColorPicker === "bg" ? null : "bg")} className="rounded p-1.5 text-muted-foreground hover:bg-muted" title={t("grid.bgColor")}>
                  <Paintbrush className="h-3.5 w-3.5" />
                </button>
                {showColorPicker === "bg" && (
                  <div className="absolute left-0 top-full z-50 mt-1 flex flex-wrap gap-1 rounded-lg border border-border bg-popover p-2 shadow-lg" style={{ width: 160 }}>
                    {CELL_COLORS.map((c) => (
                      <button key={c} onClick={() => setFormatColor("bgColor", c)} className="h-6 w-6 rounded-md border border-border transition-transform hover:scale-110" style={{ backgroundColor: c === "transparent" ? "transparent" : c, backgroundImage: c === "transparent" ? "repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 8px 8px" : "none" }} />
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button onClick={() => setShowColorPicker(showColorPicker === "text" ? null : "text")} className="rounded p-1.5 text-muted-foreground hover:bg-muted" title={t("grid.textColor")}>
                  <Type className="h-3.5 w-3.5" />
                </button>
                {showColorPicker === "text" && (
                  <div className="absolute left-0 top-full z-50 mt-1 flex flex-wrap gap-1 rounded-lg border border-border bg-popover p-2 shadow-lg" style={{ width: 160 }}>
                    {CELL_COLORS.map((c) => (
                      <button key={c} onClick={() => setFormatColor("textColor", c)} className="h-6 w-6 rounded-md border border-border transition-transform hover:scale-110" style={{ backgroundColor: c === "transparent" ? "var(--foreground)" : c }} />
                    ))}
                  </div>
                )}
              </div>
              <div className="mx-1 h-4 w-px bg-border" />
              <button onClick={clearFormat} className="rounded p-1.5 text-muted-foreground hover:bg-muted" title={t("grid.clearFormat")}><Eraser className="h-3.5 w-3.5" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spreadsheet grid — fills remaining space */}
      <div ref={gridRef} className="flex-1 overflow-auto min-h-0">
        <table className="border-collapse" style={{ tableLayout: "fixed" }}>
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 w-12 border-b border-r border-border bg-muted/80 backdrop-blur-sm" />
              {Array.from({ length: VISIBLE_COLS }, (_, c) => (
                <th
                  key={c}
                  className="h-7 min-w-[90px] border-b border-r border-border bg-muted/80 text-center text-xs font-medium text-muted-foreground backdrop-blur-sm"
                  style={{ width: activeSheet?.colWidths[String(c)] || 90 }}
                >
                  {colLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: VISIBLE_ROWS }, (_, r) => (
              <tr key={r}>
                <td className="sticky left-0 z-10 w-12 border-b border-r border-border bg-muted/80 text-center text-xs font-medium text-muted-foreground backdrop-blur-sm">
                  {r + 1}
                </td>
                {Array.from({ length: VISIBLE_COLS }, (_, c) => {
                  const key = cellKey(r, c);
                  const cell = activeSheet?.cells[key];
                  const isSelected = selectedCell === key;
                  const isEditing = editingCell === key;
                  const display = activeSheet ? getCellValue(key, activeSheet.cells) : "";
                  const fmt = cell?.format;

                  return (
                    <td
                      key={c}
                      onClick={() => { setSelectedCell(key); if (!isEditing) setEditingCell(null); }}
                      onDoubleClick={() => startEdit(key)}
                      onContextMenu={(e) => handleContextMenu(e, key)}
                      className={cn(
                        "h-7 min-w-[90px] cursor-pointer border-b border-r border-border px-1.5 text-sm transition-colors",
                        isSelected && !isEditing && "ring-2 ring-foreground ring-inset",
                        isEditing && "ring-2 ring-foreground ring-inset bg-background",
                      )}
                      style={{
                        fontWeight: fmt?.bold ? 600 : undefined,
                        fontStyle: fmt?.italic ? "italic" : undefined,
                        textAlign: fmt?.align || "left",
                        backgroundColor: fmt?.bgColor || undefined,
                        color: fmt?.textColor || undefined,
                      }}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") { setEditingCell(null); setEditValue(""); }
                            if (e.key === "Tab") { e.preventDefault(); commitEdit(); setSelectedCell(cellKey(r, c + 1)); }
                            e.stopPropagation();
                          }}
                          className="h-full w-full bg-transparent text-sm outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className={cn("block truncate", display.startsWith("#") && "text-xs text-destructive")}>
                          {display}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-1 text-[11px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-4">
          {stats && (
            <>
              <span>{t("grid.statusCount")}: {stats.count}</span>
              {stats.sum !== null && <span>{t("grid.statusSum")}: {stats.sum}</span>}
              {stats.avg !== null && <span>{t("grid.statusAvg")}: {stats.avg}</span>}
              {stats.min !== null && <span>{t("grid.statusMin")}: {stats.min}</span>}
              {stats.max !== null && <span>{t("grid.statusMax")}: {stats.max}</span>}
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeSS?.sheets.map((sheet) => (
            <div key={sheet.id} className="relative group">
              {renamingSheet === sheet.id ? (
                <input
                  value={renameSheetValue}
                  onChange={(e) => setRenameSheetValue(e.target.value)}
                  onBlur={commitRenameSheet}
                  onKeyDown={(e) => { if (e.key === "Enter") commitRenameSheet(); }}
                  autoFocus
                  className="w-20 rounded bg-background px-2 py-0.5 text-xs outline-none ring-1 ring-foreground/20"
                />
              ) : (
                <button
                  onClick={() => switchSheet(sheet)}
                  onDoubleClick={() => startRenameSheet(sheet.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (activeSS.sheets.length > 1 && confirm(`Delete "${sheet.name}"?`)) deleteSheet(sheet.id);
                  }}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    sheet.id === activeSheet?.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {sheet.name}
                </button>
              )}
            </div>
          ))}
          <button onClick={addSheet} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted" title={t("grid.addSheet")}>
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[100] min-w-[180px] overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => { handleCopy(); setContextMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
              <Copy className="h-3.5 w-3.5 text-muted-foreground" /> {t("grid.copy")}
            </button>
            <button onClick={() => { handleCut(); setContextMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
              <Scissors className="h-3.5 w-3.5 text-muted-foreground" /> {t("grid.cut")}
            </button>
            <button onClick={() => { handlePaste(); setContextMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
              <Clipboard className="h-3.5 w-3.5 text-muted-foreground" /> {t("grid.paste")}
            </button>
            <div className="border-t border-border" />
            <button onClick={() => { insertRow(true); setContextMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
              <Rows3 className="h-3.5 w-3.5 text-muted-foreground" /> {t("grid.insertRowAbove")}
            </button>
            <button onClick={() => { insertRow(false); setContextMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
              <Rows3 className="h-3.5 w-3.5 text-muted-foreground" /> {t("grid.insertRowBelow")}
            </button>
            <button onClick={() => { insertCol(true); setContextMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
              <Columns3 className="h-3.5 w-3.5 text-muted-foreground" /> {t("grid.insertColLeft")}
            </button>
            <button onClick={() => { insertCol(false); setContextMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
              <Columns3 className="h-3.5 w-3.5 text-muted-foreground" /> {t("grid.insertColRight")}
            </button>
            <div className="border-t border-border" />
            <button onClick={() => { deleteRow(); setContextMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive transition-colors hover:bg-muted">
              <Minus className="h-3.5 w-3.5" /> {t("grid.deleteRow")}
            </button>
            <button onClick={() => { deleteCol(); setContextMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive transition-colors hover:bg-muted">
              <Minus className="h-3.5 w-3.5" /> {t("grid.deleteCol")}
            </button>
            <div className="border-t border-border" />
            <button onClick={() => {
              const cell = activeSheet?.cells[contextMenu.cellKey];
              if (cell) storage.updateCell(activeSS!.id, activeSheet!.id, contextMenu.cellKey, { value: "", format: cell.format });
              refresh();
              setContextMenu(null);
            }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
              <Eraser className="h-3.5 w-3.5 text-muted-foreground" /> {t("grid.clearCell")}
            </button>
            <button onClick={() => { clearAll(); setContextMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive transition-colors hover:bg-muted">
              <Trash2 className="h-3.5 w-3.5" /> {t("grid.clearAll")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Tutorial Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Grid3x3 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">{t("grid.helpTitle")}</h2>
                    <p className="text-xs text-muted-foreground">{t("grid.helpSubtitle")}</p>
                  </div>
                </div>
                <button onClick={() => setShowHelp(false)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted">
                  <span className="text-lg">×</span>
                </button>
              </div>

              {/* Content */}
              <div className="space-y-6 p-6">
                {/* Getting Started */}
                <HelpSection title={t("grid.helpGettingStarted")}>
                  <HelpItem
                    icon={<Plus className="h-4 w-4" />}
                    title={t("grid.helpCreateSpreadsheet")}
                    desc={t("grid.helpCreateSpreadsheetDesc")}
                  />
                  <HelpItem
                    icon={<FileSpreadsheet className="h-4 w-4" />}
                    title={t("grid.helpSwitchSheets")}
                    desc={t("grid.helpSwitchSheetsDesc")}
                  />
                  <HelpItem
                    icon={<Plus className="h-4 w-4" />}
                    title={t("grid.helpAddSheet")}
                    desc={t("grid.helpAddSheetDesc")}
                  />
                </HelpSection>

                {/* Editing */}
                <HelpSection title={t("grid.helpEditing")}>
                  <HelpItem
                    icon={<span className="text-xs font-mono font-bold">⏎</span>}
                    title={t("grid.helpEditCell")}
                    desc={t("grid.helpEditCellDesc")}
                  />
                  <HelpItem
                    icon={<span className="text-xs font-mono font-bold">⌫</span>}
                    title={t("grid.helpDelete")}
                    desc={t("grid.helpDeleteDesc")}
                  />
                  <HelpItem
                    icon={<Copy className="h-4 w-4" />}
                    title={t("grid.helpCopyPaste")}
                    desc={t("grid.helpCopyPasteDesc")}
                  />
                </HelpSection>

                {/* Navigation */}
                <HelpSection title={t("grid.helpNavigation")}>
                  <HelpItem
                    icon={<span className="text-xs font-mono">←→↑↓</span>}
                    title={t("grid.helpArrowKeys")}
                    desc={t("grid.helpArrowKeysDesc")}
                  />
                  <HelpItem
                    icon={<span className="text-xs font-mono">Tab</span>}
                    title={t("grid.helpTab")}
                    desc={t("grid.helpTabDesc")}
                  />
                  <HelpItem
                    icon={<span className="text-xs font-mono">⏎</span>}
                    title={t("grid.helpEnter")}
                    desc={t("grid.helpEnterDesc")}
                  />
                </HelpSection>

                {/* Formulas */}
                <HelpSection title={t("grid.helpFormulas")}>
                  <HelpItem
                    icon={<span className="text-xs font-mono">=</span>}
                    title={t("grid.helpFormulaStart")}
                    desc={t("grid.helpFormulaStartDesc")}
                  />
                  <div className="mt-2 rounded-lg bg-muted/50 px-4 py-3">
                    <p className="mb-2 text-xs font-medium text-foreground">{t("grid.helpAvailableFormulas")}</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                      <FormulaItem formula="=SUM(A1:A10)" desc="Sum of range" />
                      <FormulaItem formula="=AVG(B1:B5)" desc="Average of range" />
                      <FormulaItem formula="=COUNT(A:A)" desc="Count non-empty" />
                      <FormulaItem formula="=MIN(C1:C10)" desc="Minimum value" />
                      <FormulaItem formula="=MAX(D1:D5)" desc="Maximum value" />
                      <FormulaItem formula={"=IF(A1>5, \"Yes\", \"No\")"} desc="Conditional" />
                      <FormulaItem formula={"=CONCAT(A1, \" \", B1)"} desc="Join text" />
                      <FormulaItem formula="=ABS(A1)" desc="Absolute value" />
                      <FormulaItem formula="=ROUND(A1, 2)" desc="Round decimals" />
                      <FormulaItem formula="=TODAY()" desc="Current date" />
                      <FormulaItem formula="=NOW()" desc="Date & time" />
                      <FormulaItem formula="=A1+B1*C2" desc="Arithmetic" />
                      <FormulaItem formula="=VLOOKUP(A1, B:D, 2)" desc="Vertical lookup" />
                      <FormulaItem formula="=SUMIF(A1:A10, 5, B1:B10)" desc="Conditional sum" />
                      <FormulaItem formula="=COUNTIF(A1:A10, 5)" desc="Conditional count" />
                      <FormulaItem formula="=UPPER(A1)" desc="Uppercase text" />
                      <FormulaItem formula="=LOWER(A1)" desc="Lowercase text" />
                      <FormulaItem formula="=TRIM(A1)" desc="Remove spaces" />
                      <FormulaItem formula="=LEN(A1)" desc="String length" />
                      <FormulaItem formula="=LEFT(A1, 3)" desc="First N chars" />
                      <FormulaItem formula="=RIGHT(A1, 3)" desc="Last N chars" />
                      <FormulaItem formula="=POWER(A1, 2)" desc="Exponent" />
                      <FormulaItem formula="=SQRT(A1)" desc="Square root" />
                      <FormulaItem formula="=MOD(A1, 3)" desc="Remainder" />
                      <FormulaItem formula="=CEIL(A1)" desc="Round up" />
                      <FormulaItem formula="=FLOOR(A1)" desc="Round down" />
                    </div>
                  </div>
                </HelpSection>

                {/* Formatting */}
                <HelpSection title={t("grid.helpFormatting")}>
                  <HelpItem
                    icon={<Bold className="h-4 w-4" />}
                    title={t("grid.helpBoldItalic")}
                    desc={t("grid.helpBoldItalicDesc")}
                  />
                  <HelpItem
                    icon={<Paintbrush className="h-4 w-4" />}
                    title={t("grid.helpColors")}
                    desc={t("grid.helpColorsDesc")}
                  />
                  <HelpItem
                    icon={<AlignLeft className="h-4 w-4" />}
                    title={t("grid.helpAlignment")}
                    desc={t("grid.helpAlignmentDesc")}
                  />
                </HelpSection>

                {/* Import / Export */}
                <HelpSection title={t("grid.helpImportExport")}>
                  <HelpItem
                    icon={<Upload className="h-4 w-4" />}
                    title={t("grid.helpImportCsv")}
                    desc={t("grid.helpImportCsvDesc")}
                  />
                  <HelpItem
                    icon={<Download className="h-4 w-4" />}
                    title={t("grid.helpExportCsv")}
                    desc={t("grid.helpExportCsvDesc")}
                  />
                </HelpSection>

                {/* Keyboard Shortcuts */}
                <HelpSection title={t("grid.helpShortcuts")}>
                  <div className="grid grid-cols-2 gap-2">
                    <ShortcutItem keys="Ctrl+C" label={t("grid.copy")} />
                    <ShortcutItem keys="Ctrl+X" label={t("grid.cut")} />
                    <ShortcutItem keys="Ctrl+V" label={t("grid.paste")} />
                    <ShortcutItem keys="Ctrl+F" label={t("grid.findReplace")} />
                    <ShortcutItem keys="Delete" label={t("grid.clearCell")} />
                    <ShortcutItem keys="Escape" label={t("grid.helpEscape")} />
                    <ShortcutItem keys="Ctrl+Z" label="Undo" />
                    <ShortcutItem keys="Ctrl+Y" label="Redo" />
                  </div>
                </HelpSection>

                {/* Tips */}
                <HelpSection title={t("grid.helpTips")}>
                  <HelpItem
                    icon={<Search className="h-4 w-4" />}
                    title={t("grid.helpRightClick")}
                    desc={t("grid.helpRightClickDesc")}
                  />
                  <HelpItem
                    icon={<TrendingUp className="h-4 w-4" />}
                    title={t("grid.helpStatusBar")}
                    desc={t("grid.helpStatusBarDesc")}
                  />
                </HelpSection>
              </div>

              {/* Footer */}
              <div className="border-t border-border px-6 py-4 text-center">
                <button
                  onClick={() => setShowHelp(false)}
                  className="rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {t("grid.helpGotIt")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
