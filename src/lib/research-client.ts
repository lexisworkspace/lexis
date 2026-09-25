import type { ResearchDeliverable } from "./research";

export { deliverableToMarkdown } from "./research";

export function downloadResearchMarkdown(
  deliverable: ResearchDeliverable,
  sources: Array<{ title: string; url: string }>
): void {
  const { deliverableToMarkdown } = require("./research") as typeof import("./research");
  const md = deliverableToMarkdown(deliverable, sources);
  const slug =
    deliverable.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "research";
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
