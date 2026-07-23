import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientLayout } from "@/components/layout/ClientLayout";

export const metadata: Metadata = {
  title: "LEXIS - AI Productivity Suite",
  description: "A premium productivity app combining habits, notes, journal, tasks, and mind maps with AI-powered insights.",
  keywords: ["productivity", "habits", "notes", "journal", "tasks", "mind maps", "AI"],
  icons: {
    icon: "/lexis-logo.png",
    apple: "/lexis-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Sora:wght@300..800&family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = JSON.parse(localStorage.getItem('lexis-data') || '{}');
                  var theme = saved.theme?.theme || 'dark';
                  var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  document.documentElement.classList.toggle('dark', isDark);
                  var fontSize = saved.theme?.fontSize || 'md';
                  document.documentElement.setAttribute('data-font-size', fontSize);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
