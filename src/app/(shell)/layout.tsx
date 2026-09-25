import { ClientLayout } from "@/components/layout/ClientLayout";

/* Routes that need the workspace shell (sidebar, top bars, global search,
   toasts) but live outside the main tab set. The (app) group wraps the
   primary tabs; this group covers office tools, auth, and legal/SEO pages.
   Landing pages stay outside both groups — no shell on the marketing site. */
export default function ShellGroupLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
