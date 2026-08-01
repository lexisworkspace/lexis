"use client";

import dynamic from "next/dynamic";

const MindMapCanvas = dynamic(
  () => import("@/components/mindmaps/MindMapCanvas").then((mod) => ({ default: mod.MindMapCanvas })),
  { ssr: false, loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
        <p className="text-sm text-muted-foreground">Loading Lexis Brain...</p>
      </div>
    </div>
  )}
);

export default function MindMapsPage() {
  return (
    <div className="h-[calc(100vh-6rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Lexis Brain</h1>
        <p className="text-sm text-muted-foreground mt-1">Professional mind mapping — double-click to rename, drag to connect, right-click for options.</p>
      </div>
      <div className="h-[calc(100%-4rem)]">
        <MindMapCanvas />
      </div>
    </div>
  );
}
