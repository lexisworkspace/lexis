interface HighlightProps {
  text: string;
  query?: string;
}

export function Highlight({ text, query }: HighlightProps) {
  if (!query || !text) return <>{text}</>;
  const q = query.toLowerCase();
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (true) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={key++} className="rounded-sm bg-primary-500/25 px-0.5 text-inherit">
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    i = idx + q.length;
  }
  return <>{parts}</>;
}
