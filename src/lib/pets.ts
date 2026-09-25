"use client";

// ============================================================
// Orleia Pets (beta) — abstract companions, not realistic animals.
// Pure local-first cosmetic: the choice lives in profile.pet and
// drives the profile avatar everywhere. No cloud, no image files —
// each pet is a small generative SVG so it stays crisp at any size.
// Bigger pet features come later; this is the foundation.
// ============================================================

import type { UserProfile } from "@/types";

export interface OrleiaPet {
  id: string;
  name: string;
  /** Primary + secondary hex colors for the abstract body. */
  c1: string;
  c2: string;
  /** Compact SVG body of the abstract creature (viewBox 0 0 64 64). */
  svg: string;
}

/**
 * Abstract creatures only: nothing that reads as a specific real
 * animal (deliberate brand choice). Each is a simple geometric
 * composition with one "eye" so it feels alive without realism.
 */
export const PETS: OrleiaPet[] = [
  {
    id: "blob",
    name: "Blob",
    c1: "#6366f1",
    c2: "#a5b4fc",
    svg:
      '<path d="M32 10c11 0 20 9 20 21s-9 23-20 23-20-11-20-23 9-21 20-21z" fill="{C1}"/>' +
      '<ellipse cx="24" cy="30" rx="6" ry="7" fill="{C2}" opacity="0.55"/>' +
      '<circle cx="40" cy="26" r="4" fill="#0f172a"/>' +
      '<circle cx="41.5" cy="24.5" r="1.3" fill="#fff"/>',
  },
  {
    id: "spike",
    name: "Spike",
    c1: "#8b5cf6",
    c2: "#c4b5fd",
    svg:
      '<path d="M32 8l6 10h12l-8 10 4 14-14-6-14 6 4-14-8-10h12z" fill="{C1}"/>' +
      '<circle cx="27" cy="34" r="3.4" fill="#0f172a"/>' +
      '<circle cx="37" cy="34" r="3.4" fill="#0f172a"/>' +
      '<circle cx="28.2" cy="32.8" r="1.1" fill="#fff"/>' +
      '<circle cx="38.2" cy="32.8" r="1.1" fill="#fff"/>',
  },
  {
    id: "swirl",
    name: "Swirl",
    c1: "#06b6d4",
    c2: "#a5f3fc",
    svg:
      '<path d="M32 8a24 24 0 1 1-17 41 19 19 0 0 0 17-17 14 14 0 0 0-14-14 10 10 0 0 1 14-10z" fill="{C1}"/>' +
      '<circle cx="40" cy="40" r="7" fill="{C2}" opacity="0.6"/>' +
      '<circle cx="22" cy="24" r="3.2" fill="#0f172a"/>' +
      '<circle cx="23" cy="23" r="1" fill="#fff"/>',
  },
  {
    id: "ghost",
    name: "Wisp",
    c1: "#10b981",
    c2: "#a7f3d0",
    svg:
      '<path d="M32 10c10 0 16 8 16 18v22l-6-5-5 5-5-5-5 5-5-5-6 5V28c0-10 6-18 16-18z" fill="{C1}"/>' +
      '<circle cx="26" cy="30" r="3.2" fill="#0f172a"/>' +
      '<circle cx="38" cy="30" r="3.2" fill="#0f172a"/>' +
      '<circle cx="27" cy="29" r="1.1" fill="#fff"/>' +
      '<circle cx="39" cy="29" r="1.1" fill="#fff"/>',
  },
  {
    id: "diamond",
    name: "Gem",
    c1: "#f59e0b",
    c2: "#fde68a",
    svg:
      '<path d="M32 8l16 16-16 32-16-32z" fill="{C1}"/>' +
      '<path d="M32 8l16 16H16z" fill="{C2}" opacity="0.6"/>' +
      '<circle cx="27" cy="36" r="3" fill="#0f172a"/>' +
      '<circle cx="37" cy="36" r="3" fill="#0f172a"/>' +
      '<circle cx="28" cy="35" r="1" fill="#fff"/>' +
      '<circle cx="38" cy="35" r="1" fill="#fff"/>',
  },
  {
    id: "bolt",
    name: "Bolt",
    c1: "#ef4444",
    c2: "#fecaca",
    svg:
      '<path d="M28 6l16 20H34l6 22-20-26h10z" fill="{C1}"/>' +
      '<circle cx="30" cy="40" r="3.2" fill="#0f172a"/>' +
      '<circle cx="31" cy="39" r="1.1" fill="#fff"/>',
  },
];

export function petById(id: string | undefined): OrleiaPet | undefined {
  return PETS.find((p) => p.id === id);
}

export function petSvg(pet: OrleiaPet, className = ""): string {
  return (
    '<svg class="' +
    className +
    '" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' +
    pet.name +
    ' pet">' +
    pet.svg.replace(/\{C1\}/g, pet.c1).replace(/\{C2\}/g, pet.c2) +
    "</svg>"
  );
}

/** Profile integration: pet lives on UserProfile (see types). */
declare module "@/types" {
  interface UserProfile {
    /** Beta: chosen Orleia Pet id (see lib/pets.ts). */
    pet?: string;
    /** Optional custom name for the pet (shown on the Habits page). */
    petName?: string;
  }
}
