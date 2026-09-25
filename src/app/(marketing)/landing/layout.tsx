import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orleia - Local-First Productivity App for Habits, Journal & Tasks",
  description:
    "ORLEIA is a local-first AI productivity suite - habits, notes, journal, tasks and an AI that knows you. Everything stays on your device. Zero analytics, zero subscriptions, completely free.",
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
