"use client";

import { useMemo } from "react";

// Renders fenced code blocks with language `chart` as native SVG charts.
// Expected JSON shape:
//   { "type": "bar" | "line" | "pie" | "donut",
//     "title": "Sales", "labels": ["Jan", "Feb"], "values": [10, 20] }
//   or for multi-series: { "type": "bar", "labels": [...], "datasets": [{ "label": "A", "values": [...] }] }

interface ChartSpec {
  type?: "bar" | "line" | "pie" | "donut" | "steps";
  title?: string;
  labels?: string[];
  values?: number[];
  datasets?: { label?: string; values: number[] }[];
  steps?: { title?: string; description?: string }[];
}

const COLORS = ["#34d399", "#38bdf8", "#a78bfa", "#f472b6", "#fbbf24", "#fb923c", "#4ade80", "#22d3ee"];

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function ChartBlock({ code }: { code: string }) {
  const spec = useMemo<ChartSpec | null>(() => {
    try {
      const parsed = JSON.parse(code);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }, [code]);

  if (!spec) {
    // Not a chart - render as a plain code block so content is never lost.
    return (
      <pre className="my-2.5 rounded-xl bg-zinc-900 dark:bg-black/60 border border-border p-3 overflow-x-auto text-xs font-mono leading-relaxed text-zinc-100">
        <code>{code}</code>
      </pre>
    );
  }

  const type = spec.type || "bar";
  const title = spec.title || "";
  const labels = spec.labels || [];
  const hasDatasets = Array.isArray(spec.datasets) && spec.datasets.length > 0;
  const series = hasDatasets
    ? (spec.datasets || []).map((d) => ({ label: d.label || "", values: d.values || [] }))
    : [{ label: "", values: spec.values || [] }];
  const values = series[0]?.values || [];
  const allValues = series.flatMap((s) => s.values);
  const hasSteps = Array.isArray(spec.steps) && spec.steps.length > 0;

  // Step-by-step guides / infographics ("how to X").
  if (hasSteps) {
    return (
      <div className="chart-block my-2.5 rounded-2xl border border-border bg-background/60 p-3.5">
        {title && <div className="mb-2.5 text-[13px] font-semibold text-foreground/90">{title}</div>}
        <ol className="flex flex-col gap-2.5">
          {spec.steps!.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-[11px] font-bold text-primary-500">
                {i + 1}
              </span>
              <div className="min-w-0">
                {s.title && <div className="text-[13px] font-semibold text-foreground/90">{s.title}</div>}
                {s.description && (
                  <div className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{s.description}</div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (allValues.length === 0) {
    return <pre className="my-2.5 rounded-xl bg-zinc-900 dark:bg-black/60 border border-border p-3 overflow-x-auto text-xs font-mono leading-relaxed text-zinc-100"><code>{code}</code></pre>;
  }

  const renderBar = () => {
    const W = 560;
    const H = 260;
    const PAD_L = 34;
    const PAD_R = 12;
    const PAD_T = 16;
    const PAD_B = 34;
    const max = Math.max(...allValues, 1);
    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;
    const step = labels.length > 0 ? labels.length : values.length;
    const slotW = innerW / Math.max(step, 1);
    const barW = Math.min(34, slotW * 0.55);
    const seriesCount = Math.max(series.length, 1);
    const groupW = barW * seriesCount + (seriesCount - 1) * 4;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={title || "Chart"}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PAD_T + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
              <text x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.45">
                {Math.round(max * t)}
              </text>
            </g>
          );
        })}
        {labels.map((lab, i) => {
          const cx = PAD_L + slotW * i + slotW / 2;
          return (
            <text key={lab + i} x={cx} y={H - 12} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.6" className="chart-label">
              {lab.length > 10 ? lab.slice(0, 9) + "…" : lab}
            </text>
          );
        })}
        {labels.map((_, i) =>
          series.map((s, si) => {
            const v = s.values[i] ?? 0;
            const x = PAD_L + slotW * i + (slotW - groupW) / 2 + si * (barW + 4);
            const h = (v / max) * innerH;
            const y = PAD_T + innerH - h;
            const color = COLORS[(si + i) % COLORS.length];
            return (
              <g key={`${i}-${si}`}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(h, 1)}
                  rx="5"
                  fill={color}
                  fillOpacity="0.85"
                  className="chart-bar"
                  style={{ transformOrigin: `${x + barW / 2}px ${PAD_T + innerH}px` }}
                >
                  <title>{`${s.label ? s.label + ": " : ""}${v}`}</title>
                </rect>
                <text x={x + barW / 2} y={Math.max(y - 4, 10)} textAnchor="middle" fontSize="9" fontWeight="600" fill="currentColor" fillOpacity="0.75">
                  {v}
                </text>
              </g>
            );
          })
        )}
      </svg>
    );
  };

  const renderLine = () => {
    const W = 560;
    const H = 240;
    const PAD_L = 34;
    const PAD_R = 12;
    const PAD_T = 16;
    const PAD_B = 30;
    const max = Math.max(...allValues, 1);
    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;
    const n = Math.max(values.length, 1);

    const pt = (i: number, v: number) => {
      const x = PAD_L + (innerW * i) / Math.max(n - 1, 1);
      const y = PAD_T + innerH - (v / max) * innerH;
      return [x, y] as const;
    };

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={title || "Chart"}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PAD_T + innerH * (1 - t);
          return (
            <g key={t}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
              <text x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.45">
                {Math.round(max * t)}
              </text>
            </g>
          );
        })}
        {labels.map((lab, i) => {
          const [x] = pt(i, values[i] ?? 0);
          return (
            <text key={lab + i} x={x} y={H - 10} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.6" className="chart-label">
              {lab.length > 10 ? lab.slice(0, 9) + "…" : lab}
            </text>
          );
        })}
        {series.map((s, si) => {
          const color = COLORS[si % COLORS.length];
          const pts = s.values.map((v, i) => pt(i, v));
          const poly = pts.map(([x, y]) => `${x},${y}`).join(" ");
          const area = `${PAD_L},${PAD_T + innerH} ${poly} ${PAD_L + innerW},${PAD_T + innerH}`;
          const gid = `chart-area-${si}`;
          return (
            <g key={si}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <polygon points={area} fill={`url(#${gid})`} className="chart-area" />
              <polyline points={poly} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="chart-line" />
              {pts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3.5" fill={color} className="chart-dot">
                  <title>{`${s.label ? s.label + ": " : ""}${s.values[i]}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
    );
  };

  const renderPie = (donut: boolean) => {
    const R = 92;
    const C = 2 * Math.PI * R;
    const total = Math.max(allValues.reduce((a, b) => a + b, 0), 1);
    let acc = 0;
    const segs = allValues.map((v, i) => {
      const frac = v / total;
      const seg = { offset: acc * C, len: frac * C, color: COLORS[i % COLORS.length], value: v };
      acc += frac;
      return seg;
    });
    const cx = 110;
    const cy = 130;

    return (
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <svg viewBox="0 0 220 260" className="w-44 h-auto shrink-0" role="img" aria-label={title || "Chart"}>
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {segs.map((s, i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={donut ? 26 : R}
                strokeDasharray={`${Math.max(s.len - (donut ? 2 : 0), 0.5)} ${C}`}
                strokeDashoffset={-s.offset}
                className="chart-slice"
              >
                <title>{`${labels[i] || ""} ${s.value}`}</title>
              </circle>
            ))}
          </g>
          {donut && (
            <text x={cx} y={cy - 2} textAnchor="middle" fontSize="20" fontWeight="700" fill="currentColor">
              {allValues.reduce((a, b) => a + b, 0)}
            </text>
          )}
        </svg>
        <div className="flex flex-col gap-1.5 min-w-0">
          {(labels.length ? labels : allValues.map((_, i) => `Item ${i + 1}`)).map((lab, i) => (
            <div key={lab + i} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-muted-foreground truncate max-w-[140px]">{lab}</span>
              <span className="font-semibold text-foreground/80 ml-auto">{allValues[i] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="chart-block my-2.5 rounded-2xl border border-border bg-background/60 p-3.5">
      {title && <div className="mb-2 text-[13px] font-semibold text-foreground/90">{title}</div>}
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {series.map((s, i) => (
            <span key={s.label + i} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      {type === "pie" ? renderPie(false) : type === "donut" ? renderPie(true) : type === "line" ? renderLine() : renderBar()}
    </div>
  );
}
