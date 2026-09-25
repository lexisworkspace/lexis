"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Documents has been retired — quietly send anyone with an old link to the dashboard. */
export default function DocumentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
