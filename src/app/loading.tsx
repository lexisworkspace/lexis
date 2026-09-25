export default function Loading() {
  // Solid background placeholder — no spinner, so fast navigations show
  // nothing at all and slow networks get a correct-color fill instead of
  // a white flash. Matches the app shell (dark/light aware).
  return <div className="min-h-screen bg-background" aria-hidden="true" />;
}
