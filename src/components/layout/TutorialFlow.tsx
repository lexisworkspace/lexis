"use client";

// ============================================================
// TutorialFlow — the full first-run sequence: the walkthrough
// slides, then a REQUIRED pet-pick step ("every explorer needs a
// companion"). Users who already have a pet (e.g. chose one in
// Settings before a reset) skip the pick.
// ============================================================

import { useState } from "react";
import { TutorialGuide } from "./TutorialGuide";
import { PetPickStep } from "./PetPickStep";
import { storage } from "@/lib/storage";

export function TutorialFlow({ onComplete }: { onComplete: () => void }) {
  const [pickingPet, setPickingPet] = useState(false);

  if (pickingPet) {
    return <PetPickStep onDone={onComplete} />;
  }

  return (
    <TutorialGuide
      onComplete={() => {
        // Walkthrough finished (or skipped) — the pet step is mandatory.
        if (storage.getData().profile?.pet) {
          onComplete();
          return;
        }
        setPickingPet(true);
      }}
    />
  );
}
