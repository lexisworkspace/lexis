// Shared Noor daily-cap error. Lives in its own module so both ai.ts and
// ai-stream.ts can throw/catch it without circular imports.
export class NoorCapError extends Error {
  constructor() {
    super("noor_daily_cap");
    this.name = "NoorCapError";
  }
}
