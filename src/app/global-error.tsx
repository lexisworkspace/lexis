"use client";

// Global error boundary (Next.js convention): replaces the whole layout when
// an uncaught client error bubbles up. Most of these after a deploy are stale
// in-app state - a reload fixes them, so give the user a button instead of a
// dead end.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background p-6">
          <div className="flex max-w-md flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-2xl">
              🤔
            </div>
            <h1 className="text-lg font-bold tracking-tight">Something went wrong</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              That's on us — nothing you did. Your workspace is safe: everything
              lives on this device, so a quick reload almost always fixes it.
            </p>
            <button
              onClick={() => reset()}
              className="btn-primary"
              style={{ padding: "0.625rem 1.25rem" }}
            >
              Reload
            </button>
            {error?.digest && (
              <p className="text-[10px] text-muted-foreground/60">
                Error digest: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
