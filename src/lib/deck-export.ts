import type { Deck, DeckSlide } from "@/types";
import { DECK_THEMES, getDeckTheme } from "./deck-themes";

function hex(color: string): string {
  return color.replace("#", "").toUpperCase();
}

function fileName(deck: Deck, ext: string): string {
  const slug = (deck.title || "deck")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `${slug || "deck"}.${ext}`;
}

function download(content: BlobPart, name: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function isHeroLayout(s: DeckSlide): boolean {
  return s.layout === "title" || s.layout === "end" || s.layout === "section";
}

/** pptxgenjs wants "image/jpeg;base64,..." — strip the "data:" prefix. */
function pptxImageData(url: string): string | null {
  const m = url.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  return m ? `${m[1]};base64,${m[2]}` : null;
}

// ===== PPTX =====

export async function exportToPPTX(deck: Deck): Promise<void> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const theme = getDeckTheme(deck);
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "ORLEIA_16x9", width: 13.333, height: 7.5 });
  pptx.layout = "ORLEIA_16x9";
  pptx.defineSlideMaster({ title: "ORLEIA_BG", background: { color: hex(theme.pptxBg) } });

  for (const s of deck.slides) {
    const slide = pptx.addSlide({ masterName: "ORLEIA_BG" });
    const accent = hex(s.accent || theme.accent);
    const text = hex(theme.text);
    const muted = theme.dark ? "9CA3AF" : "5A5A52";
    const bold = { bold: true, fontFace: "Calibri Light", color: text } as const;

    const imgData = s.imageUrl ? pptxImageData(s.imageUrl) : null;
    const hero = isHeroLayout(s);
    const hasImg = Boolean(imgData);
    // Content width shrinks when a side image occupies the right 42%
    const W = hasImg && !hero ? 6.4 : 11.5;

    if (imgData && hero) {
      slide.addImage({ data: imgData, x: 0, y: 0, w: 13.333, h: 7.5 });
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: "000000", transparency: 42 } });
    } else if (imgData) {
      slide.addImage({ data: imgData, x: 7.93, y: 0, w: 5.4, h: 7.5, sizing: { type: "cover", w: 5.4, h: 7.5 } });
    }

    const addKicker = () => {
      if (s.kicker) slide.addText(s.kicker.toUpperCase(), { x: 0.9, y: 0.45, w: W, h: 0.4, fontSize: 12, color: accent, charSpacing: 3, fontFace: "Calibri" });
    };

    if (s.layout === "title" || s.layout === "end") {
      slide.addText(s.title, { x: 0.9, y: 2.5, w: W, h: 1.6, fontSize: 44, ...bold });
      if (s.content[0]) slide.addText(s.content[0], { x: 0.9, y: 4.1, w: W, h: 0.9, fontSize: 18, color: muted, fontFace: "Calibri" });
      slide.addShape(pptx.ShapeType.rect, { x: 0.95, y: 2.15, w: 1.4, h: 0.09, fill: { color: accent } });
    } else if (s.layout === "section") {
      slide.addText(s.title, { x: 0.9, y: 2.9, w: W, h: 1.4, fontSize: 40, ...bold });
      if (s.content[0]) slide.addText(s.content[0], { x: 0.9, y: 4.4, w: W, h: 0.7, fontSize: 16, color: muted, fontFace: "Calibri" });
      slide.addShape(pptx.ShapeType.rect, { x: 0.95, y: 2.55, w: 1.4, h: 0.09, fill: { color: accent } });
    } else if (s.layout === "statement") {
      if (s.kicker) slide.addText(s.kicker.toUpperCase(), { x: 0.9, y: 1.5, w: W, h: 0.4, fontSize: 12, color: accent, charSpacing: 3, fontFace: "Calibri" });
      slide.addText(s.title, { x: 0.9, y: 1.9, w: W, h: 3.2, fontSize: 34, ...bold, valign: "middle" });
      if (s.content[0]) slide.addText(s.content[0], { x: 0.9, y: 5.3, w: W, h: 0.7, fontSize: 15, color: muted, fontFace: "Calibri" });
    } else if (s.layout === "quote") {
      slide.addText("\u201C", { x: 0.7, y: 0.9, w: 2, h: 1.6, fontSize: 96, color: accent, fontFace: "Georgia" });
      slide.addText(s.title, { x: 0.95, y: 2.4, w: W, h: 2.6, fontSize: 28, italic: true, color: text, fontFace: "Calibri Light" });
      if (s.content[0]) slide.addText(`— ${s.content[0]}`, { x: 0.95, y: 5.2, w: W, h: 0.6, fontSize: 15, color: muted, fontFace: "Calibri" });
    } else if (s.layout === "stats") {
      addKicker();
      slide.addText(s.title, { x: 0.9, y: 0.95, w: W, h: 1.0, fontSize: 30, ...bold });
      const stats = (s.stats && s.stats.length ? s.stats : [{ value: "", label: "" }, { value: "", label: "" }, { value: "", label: "" }]).slice(0, 3);
      const tileW = (W - 0.5) / 3;
      stats.forEach((st, i) => {
        const x = 0.9 + i * (tileW + 0.25);
        slide.addShape(pptx.ShapeType.roundRect, { x, y: 2.4, w: tileW, h: 3.4, fill: { color: theme.dark ? "1A1A2E" : "F3F1EA" }, line: { color: accent, width: 1 }, rectRadius: 0.12 });
        slide.addText(st.value, { x, y: 3.0, w: tileW, h: 1.4, fontSize: 40, bold: true, color: accent, align: "center", fontFace: "Calibri Light" });
        slide.addText(st.label, { x: x + 0.15, y: 4.5, w: tileW - 0.3, h: 0.9, fontSize: 13, color: muted, align: "center", fontFace: "Calibri" });
      });
    } else if (s.layout === "timeline") {
      addKicker();
      slide.addText(s.title, { x: 0.9, y: 0.95, w: W, h: 1.0, fontSize: 30, ...bold });
      const items = (s.stats && s.stats.length ? s.stats : []).slice(0, 5);
      slide.addShape(pptx.ShapeType.line, { x: 0.95, y: 3.1, w: W, h: 0, line: { color: accent, width: 1.5 } });
      items.forEach((st, i) => {
        const x = 0.95 + i * (W / Math.max(items.length, 1));
        slide.addShape(pptx.ShapeType.ellipse, { x: x - 0.07, y: 3.03, w: 0.14, h: 0.14, fill: { color: accent } });
        slide.addText(st.value, { x: x - 0.1, y: 3.35, w: 2.4, h: 0.4, fontSize: 15, bold: true, color: accent, fontFace: "Calibri" });
        slide.addText(st.label, { x: x - 0.1, y: 3.75, w: 2.4, h: 1.0, fontSize: 13, color: muted, fontFace: "Calibri" });
      });
    } else if (s.layout === "two-col") {
      addKicker();
      slide.addText(s.title, { x: 0.9, y: 0.95, w: W, h: 1.0, fontSize: 30, ...bold });
      const colW = (W - 0.3) / 2;
      slide.addShape(pptx.ShapeType.roundRect, { x: 0.9, y: 2.3, w: colW, h: 4.1, fill: { color: theme.dark ? "1A1A2E" : "F3F1EA" }, line: { color: accent, width: 1 }, rectRadius: 0.12 });
      const left = s.content.filter(Boolean).slice(0, 3).map((line) => ({
        text: line,
        options: { bullet: { code: "2022" }, color: text, fontSize: 15, fontFace: "Calibri", paraSpaceAfter: 8 },
      }));
      if (left.length) slide.addText(left, { x: 1.12, y: 2.55, w: colW - 0.45, h: 3.6, valign: "top" });
      slide.addShape(pptx.ShapeType.roundRect, { x: 0.9 + colW + 0.3, y: 2.3, w: colW, h: 4.1, fill: { color: theme.dark ? "15151f" : "FAF9F5" }, line: { color: "808080", width: 0.75 }, rectRadius: 0.12 });
      const right = (s.contentRight || []).filter(Boolean).slice(0, 3).map((line) => ({
        text: line,
        options: { bullet: { code: "2022" }, color: muted, fontSize: 15, fontFace: "Calibri", paraSpaceAfter: 8 },
      }));
      if (right.length) slide.addText(right, { x: 0.9 + colW + 0.52, y: 2.55, w: colW - 0.45, h: 3.6, valign: "top" });
    } else {
      // bullets
      addKicker();
      slide.addText(s.title, { x: 0.9, y: 0.95, w: W, h: 1.1, fontSize: 30, ...bold });
      slide.addShape(pptx.ShapeType.rect, { x: 0.92, y: 2.0, w: 1.1, h: 0.07, fill: { color: accent } });
      const items = s.content.filter(Boolean).map((line) => ({
        text: line,
        options: { bullet: { code: "2022" }, color: text, fontSize: 17, fontFace: "Calibri", paraSpaceAfter: 10 },
      }));
      if (items.length) slide.addText(items, { x: 0.95, y: 2.35, w: W, h: 4.4, valign: "top" });
    }
    if (s.notes) slide.addNotes(s.notes);
  }

  await pptx.writeFile({ fileName: fileName(deck, "pptx") });
}

// ===== Markdown =====

export function deckToMarkdown(deck: Deck): string {
  const lines: string[] = [`# ${deck.title}`];
  if (deck.description) lines.push("", `> ${deck.description}`);
  lines.push("");
  for (const s of deck.slides) {
    lines.push(`## ${s.title}`);
    if (s.kicker) lines.push(`<!-- layout: ${s.layout} | kicker: ${s.kicker} -->`);
    else lines.push(`<!-- layout: ${s.layout} -->`);
    if (s.imageUrl?.startsWith("data:")) lines.push(`<!-- image: embedded (not exported to markdown) -->`);
    else if (s.imageUrl) lines.push(`![slide image](${s.imageUrl})`);
    for (const c of s.content) if (c.trim()) lines.push(s.layout === "quote" ? `> ${c}` : `- ${c}`);
    if (s.stats?.length) {
      lines.push("");
      for (const st of s.stats) lines.push(`- **${st.value}** ${st.label}`);
    }
    if (s.contentRight?.length) {
      lines.push("");
      for (const c of s.contentRight) if (c.trim()) lines.push(`- (right) ${c}`);
    }
    if (s.notes) lines.push("", `<!-- notes: ${s.notes} -->`);
    lines.push("");
  }
  return lines.join("\n");
}

export function exportToMarkdown(deck: Deck): void {
  download(deckToMarkdown(deck), fileName(deck, "md"), "text/markdown;charset=utf-8");
}

export function exportToJSON(deck: Deck): void {
  download(JSON.stringify(deck, null, 2), fileName(deck, "json"), "application/json");
}

// ===== Markdown import =====

const VALID_LAYOUTS = ["title", "section", "bullets", "statement", "stats", "two-col", "timeline", "quote", "end"];

export function parseMarkdownOutline(text: string): Array<Partial<DeckSlide> & { title: string }> {
  const slides: Array<Partial<DeckSlide> & { title: string }> = [];
  const parts = text.split(/^##\s+/m).filter((p) => p.trim());
  for (const part of parts) {
    const lines = part.split("\n");
    const title = (lines.shift() || "").trim().replace(/^#+\s*/, "");
    if (!title) continue;
    let layout: DeckSlide["layout"] = "bullets";
    let kicker: string | undefined;
    let imageUrl: string | undefined;
    const content: string[] = [];
    const contentRight: string[] = [];
    const stats: Array<{ value: string; label: string }> = [];
    const notesLines: string[] = [];
    for (const raw of lines) {
      const line = raw.trim();
      const imgMatch = line.match(/^!\[.*?\]\((.+?)\)$/);
      if (imgMatch) {
        imageUrl = imgMatch[1];
        continue;
      }
      const meta = line.match(/^<!--\s*(?:layout:\s*(\w+))?\s*(?:\|\s*kicker:\s*([^>]*?))?\s*-->$/);
      if (meta && (meta[1] || meta[2])) {
        if (meta[1] && VALID_LAYOUTS.includes(meta[1])) layout = meta[1] as DeckSlide["layout"];
        if (meta[2]) kicker = meta[2].trim();
        continue;
      }
      const notesMatch = line.match(/^<!--\s*notes:\s*([\s\S]*?)\s*-->$/);
      if (notesMatch) {
        notesLines.push(notesMatch[1]);
        continue;
      }
      if (!line) continue;
      if (line.startsWith("- **") && line.includes("** ")) {
        const m = line.match(/^- \*\*(.+?)\*\*\s*(.*)$/);
        if (m) stats.push({ value: m[1], label: m[2] });
      } else if (line.startsWith("- (right) ")) contentRight.push(line.slice(10).trim());
      else if (line.startsWith("- ")) content.push(line.slice(2).trim());
      else if (line.startsWith("> ")) content.push(line.slice(2).trim());
    }
    slides.push({ layout, kicker, title, content, contentRight: contentRight.length ? contentRight : undefined, stats: stats.length ? stats : undefined, imageUrl, notes: notesLines.join(" ") });
  }
  return slides;
}

export function importFromMarkdown(): Promise<Array<Partial<DeckSlide> & { title: string }> | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,.txt";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const text = await file.text();
      resolve(parseMarkdownOutline(text));
    };
    input.click();
  });
}

// ===== Standalone HTML =====

export function exportToHTML(deck: Deck): void {
  const theme = getDeckTheme(deck);
  const data = JSON.stringify({
    title: deck.title,
    transition: deck.transition,
    slides: deck.slides.map((s) => ({
      layout: s.layout,
      kicker: s.kicker || "",
      title: s.title,
      content: s.content,
      contentRight: s.contentRight || [],
      stats: s.stats || [],
      image: s.imageUrl || "",
      accent: s.accent || theme.accent,
      notes: s.notes,
    })),
  }).replace(/</g, "\\u003c");

  const heroOverlay = theme.dark ? "rgba(0,0,0,.55)" : "rgba(0,0,0,.35)";
  const edgeFade = theme.dark ? "#0b0b14" : "#ffffff";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(deck.title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; overflow: hidden; background: #0b0b14; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: ${theme.text}; }
  .slide { position: absolute; inset: 0; display: none; flex-direction: column; justify-content: center; padding: 7vh 8vw; }
  .slide.active { display: flex; }
  .slide.with-side-img { padding-right: 44vw; }
  .bgimg { position: absolute; inset: 0; z-index: 0; }
  .bgimg img { width: 100%; height: 100%; object-fit: cover; }
  .bgimg::after { content: ""; position: absolute; inset: 0; background: ${heroOverlay}; }
  .sideimg { position: absolute; top: 0; right: 0; bottom: 0; width: 42%; z-index: 0; }
  .sideimg img { width: 100%; height: 100%; object-fit: cover; }
  .sideimg::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to right, ${edgeFade}cc 0%, transparent 40%); }
  .slide > .content { position: relative; z-index: 1; width: 100%; }
  .kicker { text-transform: uppercase; letter-spacing: .18em; font-weight: 500; opacity: .8; font-size: clamp(.7rem, 1.3vw, .95rem); color: var(--accent); margin-bottom: 1.4rem; }
  .bar { width: 84px; height: 5px; border-radius: 99px; background: var(--accent); margin-bottom: 2rem; }
  h1 { font-size: clamp(2rem, 4.2vw, 3.4rem); font-weight: 700; letter-spacing: -.03em; line-height: 1.1; }
  .title-slide h1, .end-slide h1 { font-size: clamp(2.6rem, 6vw, 4.6rem); }
  .section-slide h1 { font-size: clamp(2.4rem, 5.2vw, 4rem); display: flex; align-items: baseline; gap: 1.5rem; }
  .section-slide .num { opacity: .25; color: var(--accent); font-size: clamp(3.5rem, 9vw, 7.5rem); }
  .sub { margin-top: 1.4rem; font-size: clamp(1rem, 2vw, 1.35rem); opacity: .55; }
  ul { list-style: none; margin-top: 1.6rem; }
  li { font-size: clamp(1rem, 2vw, 1.35rem); padding: .5rem 0 .5rem 1.7rem; position: relative; opacity: .9; }
  li::before { content: ""; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 9px; height: 9px; border-radius: 50%; background: var(--accent); }
  .statgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.4rem; margin-top: 2rem; }
  .stat { border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); background: color-mix(in srgb, var(--accent) 6%, transparent); border-radius: 16px; padding: 1.6rem; }
  .stat .v { font-size: clamp(2rem, 4.4vw, 3.6rem); font-weight: 700; color: var(--accent); }
  .stat .l { opacity: .6; margin-top: .4rem; font-size: clamp(.8rem, 1.4vw, 1rem); }
  .timeline { position: relative; margin-top: 2.6rem; padding-top: 1.2rem; display: flex; gap: 2%; }
  .timeline::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--accent); opacity: .4; }
  .t-item { flex: 1; position: relative; }
  .t-item::before { content: ""; position: absolute; top: -1.45rem; left: 0; width: 15px; height: 15px; border-radius: 50%; border: 2px solid var(--accent); background: ${theme.dark ? "#0b0b14" : "#fff"}; }
  .t-item .v { font-weight: 600; color: var(--accent); font-size: clamp(.9rem, 1.6vw, 1.15rem); }
  .t-item .l { opacity: .75; margin-top: .3rem; font-size: clamp(.8rem, 1.4vw, 1rem); }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1.4rem; margin-top: 2rem; }
  .col { border-radius: 16px; padding: 1.5rem; }
  .col.left { border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent); background: color-mix(in srgb, var(--accent) 7%, transparent); }
  .col.right { border: 1px solid color-mix(in srgb, ${theme.text} 14%, transparent); }
  .col li { font-size: clamp(.9rem, 1.7vw, 1.15rem); }
  .col.right li::before { background: ${theme.text}; opacity: .4; }
  .quote-mark { font-size: clamp(4rem, 9vw, 7rem); line-height: .8; color: var(--accent); font-family: Georgia, serif; }
  .quote-slide h1 { font-size: clamp(1.6rem, 3.4vw, 2.8rem); font-weight: 500; font-style: italic; margin-top: 1rem; }
  .attr { margin-top: 2rem; opacity: .55; }
  .statement-slide h1 { font-size: clamp(2rem, 4.6vw, 3.8rem); }
  .bg { position: fixed; inset: 0; z-index: -1; background: radial-gradient(ellipse 60% 50% at 50% 110%, var(--glow) 0%, transparent 70%), ${theme.bg}; }
  .hud { position: fixed; bottom: 18px; right: 22px; font-size: 12px; opacity: .45; font-variant-numeric: tabular-nums; z-index: 5; }
  .progress { position: fixed; bottom: 0; left: 0; height: 3px; background: var(--accent); transition: width .35s ease; z-index: 5; }
  .hint { position: fixed; bottom: 18px; left: 22px; font-size: 11px; opacity: .3; z-index: 5; }
  .notes { margin-top: 2.5rem; font-size: .85rem; opacity: .45; border-left: 2px solid var(--accent); padding-left: 12px; max-width: 60ch; }
</style>
</head>
<body>
<div class="bg" id="bg"></div>
<div id="deck"></div>
<div class="hud" id="hud"></div>
<div class="progress" id="prog"></div>
<div class="hint">&#8592; &#8594; navigate &middot; N notes &middot; F fullscreen</div>
<script>
var DATA = ${data};
var idx = 0, notesOn = false;
function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
function renderSlide(s) {
  var el = document.createElement("div");
  el.className = "slide " + s.layout + "-slide";
  var hero = s.layout === "title" || s.layout === "end" || s.layout === "section";
  var h = '<div class="content">';
  var kick = s.kicker ? '<div class="kicker">' + esc(s.kicker) + '</div>' : '';
  if (s.layout === "title" || s.layout === "end") {
    h += '<div class="bar"></div><h1>' + esc(s.title) + '</h1>' + (s.content[0] ? '<div class="sub">' + esc(s.content[0]) + '</div>' : '');
  } else if (s.layout === "section") {
    h += kick + '<h1>' + (/\\d/.test(s.kicker) ? '<span class="num">' + esc(s.kicker.match(/\\d+/)[0]) + '</span>' : '') + esc(s.title) + '</h1>' + (s.content[0] ? '<div class="sub">' + esc(s.content[0]) + '</div>' : '');
  } else if (s.layout === "bullets") {
    h += kick + '<h1>' + esc(s.title) + '</h1><ul>' + s.content.filter(Boolean).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>';
  } else if (s.layout === "statement") {
    h += kick + '<h1>' + esc(s.title) + '</h1>' + (s.content[0] ? '<div class="sub">' + esc(s.content[0]) + '</div>' : '');
  } else if (s.layout === "stats") {
    h += kick + '<h1>' + esc(s.title) + '</h1><div class="statgrid">' + s.stats.map(function (st) { return '<div class="stat"><div class="v">' + esc(st.value) + '</div><div class="l">' + esc(st.label) + '</div></div>'; }).join('') + '</div>';
  } else if (s.layout === "timeline") {
    h += kick + '<h1>' + esc(s.title) + '</h1><div class="timeline">' + s.stats.map(function (st) { return '<div class="t-item"><div class="v">' + esc(st.value) + '</div><div class="l">' + esc(st.label) + '</div></div>'; }).join('') + '</div>';
  } else if (s.layout === "two-col") {
    h += kick + '<h1>' + esc(s.title) + '</h1><div class="cols"><div class="col left"><ul>' + s.content.filter(Boolean).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></div><div class="col right"><ul>' + s.contentRight.filter(Boolean).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></div></div>';
  } else if (s.layout === "quote") {
    h += '<div class="quote-mark">\\u201C</div><h1>' + esc(s.title) + '</h1>' + (s.content[0] ? '<div class="attr">\\u2014 ' + esc(s.content[0]) + '</div>' : '');
  }
  if (notesOn && s.notes) h += '<div class="notes">' + esc(s.notes) + '</div>';
  h += '</div>';
  el.innerHTML = h;
  el.style.setProperty("--accent", s.accent);
  el.style.setProperty("--glow", s.accent + "29");
  if (s.image) {
    var wrap = document.createElement("div");
    wrap.className = hero ? "bgimg" : "sideimg";
    var im = document.createElement("img");
    im.src = s.image;
    im.alt = "";
    wrap.appendChild(im);
    el.insertBefore(wrap, el.firstChild);
    if (!hero) el.classList.add("with-side-img");
  }
  return el;
}
function show() {
  var deck = document.getElementById("deck");
  deck.innerHTML = "";
  deck.appendChild(renderSlide(DATA.slides[idx]));
  document.getElementById("hud").textContent = (idx + 1) + " / " + DATA.slides.length;
  document.getElementById("prog").style.width = (((idx + 1) / DATA.slides.length) * 100) + "%";
}
document.addEventListener("keydown", function (e) {
  if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { idx = Math.min(idx + 1, DATA.slides.length - 1); show(); }
  else if (e.key === "ArrowLeft" || e.key === "PageUp") { idx = Math.max(idx - 1, 0); show(); }
  else if (e.key === "n" || e.key === "N") { notesOn = !notesOn; show(); }
  else if (e.key === "f" || e.key === "F") { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
  else if (e.key === "Home") { idx = 0; show(); }
  else if (e.key === "End") { idx = DATA.slides.length - 1; show(); }
});
document.getElementById("deck").addEventListener("click", function (e) { idx = e.clientX > window.innerWidth / 2 ? Math.min(idx + 1, DATA.slides.length - 1) : Math.max(idx - 1, 0); show(); });
show();
</script>
</body>
</html>`;

  download(html, fileName(deck, "html"), "text/html;charset=utf-8");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
