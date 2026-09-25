"use client";

// ============================================================
// Consent-gated telemetry. Vercel's <Analytics /> and
// <SpeedInsights /> never mount — and therefore never send a
// single byte — unless the visitor clicked "Accept" in the cookie
// banner. Rejecting keeps Orleia fully functional; it only opts
// out of the anonymous counters.
// ============================================================

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getCookieConsent } from "./CookieConsent";

const Analytics = dynamic(() => import("@vercel/analytics/next").then((m) => m.Analytics), {
  ssr: false,
});
const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false }
);

export default function ConsentedTelemetry() {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const sync = () => setAccepted(getCookieConsent());
    sync();
    window.addEventListener("orleia:cookie-consent", sync);
    return () => window.removeEventListener("orleia:cookie-consent", sync);
  }, []);

  if (!accepted) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
