export type WritingStyleId =
  | "modern-sans"
  | "elegant-serif"
  | "editorial"
  | "clean-rounded"
  | "luxury-caps"
  | "mono-tech";

export type WritingStylePreset = {
  id: WritingStyleId;
  label: string;
  fontFamily: string;
  letterSpacing: string;
  textTransform: "none" | "uppercase";
  fontStyle: "normal" | "italic";
  fontWeight: number;
};

export const WRITING_STYLE_CATALOG: readonly WritingStylePreset[] = [
  {
    id: "modern-sans",
    label: "Modern Sans",
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    letterSpacing: "0",
    textTransform: "none",
    fontStyle: "normal",
    fontWeight: 700,
  },
  {
    id: "elegant-serif",
    label: "Elegant Serif",
    fontFamily: "Georgia, Cambria, Times New Roman, serif",
    letterSpacing: "0.01em",
    textTransform: "none",
    fontStyle: "normal",
    fontWeight: 700,
  },
  {
    id: "editorial",
    label: "Editorial",
    fontFamily: "Baskerville, Palatino, Garamond, serif",
    letterSpacing: "0.015em",
    textTransform: "none",
    fontStyle: "italic",
    fontWeight: 600,
  },
  {
    id: "clean-rounded",
    label: "Clean Rounded",
    fontFamily: "Avenir Next, Nunito, Inter, sans-serif",
    letterSpacing: "0.005em",
    textTransform: "none",
    fontStyle: "normal",
    fontWeight: 700,
  },
  {
    id: "luxury-caps",
    label: "Luxury Caps",
    fontFamily: "Didot, Bodoni MT, Georgia, serif",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontStyle: "normal",
    fontWeight: 700,
  },
  {
    id: "mono-tech",
    label: "Mono Tech",
    fontFamily: "JetBrains Mono, Menlo, Consolas, monospace",
    letterSpacing: "0.02em",
    textTransform: "none",
    fontStyle: "normal",
    fontWeight: 650,
  },
] as const;

export function isWritingStyleId(v: unknown): v is WritingStyleId {
  return typeof v === "string" && WRITING_STYLE_CATALOG.some((x) => x.id === v);
}

export function getWritingStyle(id: WritingStyleId): WritingStylePreset {
  return WRITING_STYLE_CATALOG.find((x) => x.id === id) ?? WRITING_STYLE_CATALOG[0];
}

