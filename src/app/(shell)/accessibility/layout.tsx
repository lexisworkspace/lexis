import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility Statement - Orleia",
  description:
    "Orleia's commitment to WCAG accessibility: keyboard navigation, screen reader support, reduced motion and high contrast modes.",
  alternates: { canonical: "https://www.orleia.app/accessibility" },
};

export default function AccessibilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
