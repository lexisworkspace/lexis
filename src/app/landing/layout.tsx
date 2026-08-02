export const metadata = {
  title: "LEXIS - AI Productivity Suite",
  description: "A premium productivity app combining habits, notes, journal, tasks and AI-powered insights.",
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}
