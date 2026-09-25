// Client-side cache of the server-truth Noor usage (from the x-orleia-usage
// header on every /api/chat response). Lets Noor answer billing/limit
// questions from REAL numbers instead of inventing them.
let last: { used: number; limit: number | null; at: number } | null = null;

export function setNoorUsage(used: number, limit: number | null): void {
  last = { used, limit, at: Date.now() };
}

export function getNoorUsage(): { used: number; limit: number | null; fresh: boolean } | null {
  if (!last) return null;
  return { ...last, fresh: Date.now() - last.at < 60_000 };
}

/** One-line human summary for injecting into the system prompt. */
export function usageLine(): string {
  if (!last) return "";
  const { used, limit } = last;
  if (limit === null) return `Noor usage today: ${used} messages (unlimited plan).`;
  const left = Math.max(0, limit - used);
  return `Noor usage today: ${used}/${limit} messages used, ${left} left. Resets at midnight (UTC). Upgrades in Settings > Billing. Never invent different numbers.`;
}
