import type { Metadata } from "next";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { BootSplash } from "@/components/layout/BootSplash";

export const metadata: Metadata = {
  title: {
    default: "Orleia — Local-first AI productivity",
    template: "%s | Orleia",
  },
};

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Pre-hydration cover: paints the wordmark while the bundle downloads,
          hands off to SplashScreen via orleia:splash-ready. */}
      <BootSplash />
      <ClientLayout>{children}</ClientLayout>
    </>
  );
}
