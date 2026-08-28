"use client";

// Page-level error boundary: catches errors thrown by any page (below the
// root layout), so the sidebar stays alive and the user gets a working
// Reload button instead of a dead end.
export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-2xl">
        🤔
      </div>
      <h2 className="mt-4 text-lg font-bold tracking-tight">Something went wrong</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
        This is usually stale app state after an update. Reloading almost
        always fixes it - your data is safe on this device.
      </p>
      <button onClick={() => reset()} className="btn-primary mt-6 px-5 py-2">
        Reload
      </button>
      {error?.digest && (
        <p className="mt-3 text-[10px] text-muted-foreground/60">
          Error digest: {error.digest}
        </p>
      )}
    </div>
  );
}
