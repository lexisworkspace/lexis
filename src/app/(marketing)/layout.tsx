import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orleia — Your workspace, with a mind of its own",
  description:
    "Notes, tasks, habits, journal, calendar and Noor — a local-first AI workspace that never ships your data. Free to start.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
