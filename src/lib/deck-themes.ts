import type { Deck, DeckSlide } from "@/types";

export interface DeckTheme {
  key: string;
  name: string;
  bg: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  titleFont: string;
  bodyFont: string;
  dark: boolean;
  // Solid fallback bg + colors for PPTX export
  pptxBg: string;
}

export const DECK_THEMES: Record<string, DeckTheme> = {
  midnight: {
    key: "midnight",
    name: "Midnight",
    bg: "linear-gradient(135deg, #0b0b14 0%, #16162e 100%)",
    text: "#f5f5fa",
    muted: "rgba(245,245,250,0.55)",
    accent: "#8b5cf6",
    accent2: "#22d3ee",
    titleFont: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
    bodyFont: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
    dark: true,
    pptxBg: "101020",
  },
  carbon: {
    key: "carbon",
    name: "Carbon",
    bg: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
    text: "#fafafa",
    muted: "rgba(250,250,250,0.5)",
    accent: "#fafafa",
    accent2: "#a3a3a3",
    titleFont: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
    bodyFont: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
    dark: true,
    pptxBg: "111111",
  },
  nord: {
    key: "nord",
    name: "Nord",
    bg: "linear-gradient(135deg, #2e3440 0%, #3b4252 100%)",
    text: "#eceff4",
    muted: "rgba(236,239,244,0.6)",
    accent: "#88c0d0",
    accent2: "#a3be8c",
    titleFont: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
    bodyFont: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
    dark: true,
    pptxBg: "2e3440",
  },
  ivory: {
    key: "ivory",
    name: "Ivory",
    bg: "linear-gradient(135deg, #faf9f5 0%, #f1efe7 100%)",
    text: "#1c1b18",
    muted: "rgba(28,27,24,0.55)",
    accent: "#7c3aed",
    accent2: "#0ea5e9",
    titleFont: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
    bodyFont: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
    dark: false,
    pptxBg: "faf9f5",
  },
  ember: {
    key: "ember",
    name: "Ember",
    bg: "linear-gradient(135deg, #1a0f0a 0%, #2d1811 100%)",
    text: "#fdf5ef",
    muted: "rgba(253,245,239,0.55)",
    accent: "#f97316",
    accent2: "#fbbf24",
    titleFont: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
    bodyFont: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
    dark: true,
    pptxBg: "1a0f0a",
  },
  forest: {
    key: "forest",
    name: "Forest",
    bg: "linear-gradient(135deg, #0a1410 0%, #12241c 100%)",
    text: "#eefaf4",
    muted: "rgba(238,250,244,0.55)",
    accent: "#34d399",
    accent2: "#a7f3d0",
    titleFont: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
    bodyFont: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
    dark: true,
    pptxBg: "0a1410",
  },
};

export const DECK_ACCENTS = [
  "#8b5cf6", "#22d3ee", "#34d399", "#f97316", "#f43f5e", "#eab308",
  "#3b82f6", "#ec4899", "#14b8a6", "#fafafa", "#a3e635", "#fb923c",
];

export const DECK_TRANSITIONS = [
  { key: "fade", name: "Fade" },
  { key: "slide", name: "Slide" },
  { key: "zoom", name: "Zoom" },
] as const;

/** Resolve the accent for a slide (slide-level override wins). */
export function slideAccent(slide: DeckSlide, theme: DeckTheme): string {
  return slide.accent || theme.accent;
}

/** Build the background style string for a slide, with a subtle accent glow. */
export function slideBackground(slide: DeckSlide, theme: DeckTheme, accent: string): string {
  const isTitle = slide.layout === "title" || slide.layout === "end";
  const glow = isTitle ? 0.16 : 0.09;
  return `radial-gradient(ellipse 60% 50% at 50% 110%, ${accent}${Math.round(glow * 255).toString(16).padStart(2, "0")} 0%, transparent 70%), ${theme.bg}`;
}

export function getDeckTheme(deck: Deck): DeckTheme {
  return DECK_THEMES[deck.theme] || DECK_THEMES.midnight;
}
