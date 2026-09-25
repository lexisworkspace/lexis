import type { Metadata } from "next";
import { ClientLayout } from "@/components/layout/ClientLayout";

export const metadata: Metadata = {
  title: {
    default: "Orleia — Local-first AI productivity",
    template: "%s | Orleia",
  },
};

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
