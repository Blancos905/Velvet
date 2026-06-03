import type { CSSProperties } from "react";
import {
  vetPaletteHueFromTemplateId,
  vetPaletteSkinIndexFromTemplateId,
  type StandardLayoutTemplateId,
} from "../../data/standardLayoutCatalog";

const frame: CSSProperties = {
  width: "100%",
  maxWidth: 112,
  height: 72,
  borderRadius: 8,
  border: "1px solid rgba(125, 211, 252, 0.28)",
  background: "rgba(15, 23, 42, 0.55)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  gap: 3,
  padding: 5,
  boxSizing: "border-box",
};

const bar = (h: number | string, w: string | number = "100%", opacity = 0.9): CSSProperties => ({
  height: h,
  width: w,
  borderRadius: 3,
  background: `rgba(56, 189, 248, ${opacity})`,
  flexShrink: 0,
});

const barMuted = (h: number | string, opacity = 0.35): CSSProperties => ({
  ...bar(h, "100%", opacity),
  background: `rgba(148, 163, 184, ${opacity})`,
});

/**
 * Anteprima astratta (wireframe) per la galleria catalogo layout Premium.
 */
export function StandardLayoutWireframe({ templateId }: { templateId: StandardLayoutTemplateId }) {
  switch (templateId) {
    case "essenziale":
      return (
        <div style={frame}>
          <div style={{ ...bar(6), opacity: 0.75 }} />
          <div style={{ flex: 1, minHeight: 0, borderRadius: 3, background: "rgba(56, 189, 248, 0.25)" }} />
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(251, 191, 36, 0.95)" }} />
          </div>
        </div>
      );
    case "focus-giornata":
      return (
        <div style={frame}>
          <div style={{ ...bar("42%", "100%", 0.55) }} />
          <div style={{ flex: 1, minHeight: 0, borderRadius: 3, background: "rgba(56, 189, 248, 0.22)" }} />
        </div>
      );
    case "operatore-solo":
      return (
        <div style={frame}>
          <div style={barMuted(4, 0.25)} />
          <div style={{ flex: 1, minHeight: 0, borderRadius: 3, background: "rgba(56, 189, 248, 0.35)" }} />
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(56, 189, 248, 0.6)" }} />
          </div>
        </div>
      );
    case "studio-calmo":
      return (
        <div style={{ ...frame, opacity: 0.72, borderRadius: 12 }}>
          <div style={{ ...bar(5), opacity: 0.45, borderRadius: 5 }} />
          <div style={{ flex: 1, background: "rgba(148, 163, 184, 0.12)", borderRadius: 6, minHeight: 0 }} />
        </div>
      );
    case "alta-densita":
      return (
        <div style={{ ...frame, gap: 2, justifyContent: "flex-start" }}>
          <div style={barMuted(3, 0.5)} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ ...barMuted(3, 0.32 + (i % 3) * 0.06) }} />
          ))}
        </div>
      );
    case "mobile-first-estremo":
      return (
        <div style={frame}>
          <div style={barMuted(4, 0.35)} />
          <div style={{ flex: 1, minHeight: 0, background: "rgba(56, 189, 248, 0.12)", borderRadius: 4 }} />
          <div style={{ ...bar(10, "100%", 0.65), borderRadius: 6 }} />
        </div>
      );
    case "dual-column":
      return (
        <div style={{ ...frame, flexDirection: "row", gap: 4 }}>
          <div style={{ width: "38%", display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={barMuted(5, 0.45)} />
            <div style={{ flex: 1, ...bar("100%", "100%", 0.2), minHeight: 0 }} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
            <div style={bar(5, "100%", 0.5)} />
            <div style={{ flex: 1, minHeight: 0, borderRadius: 3, background: "rgba(56, 189, 248, 0.18)" }} />
          </div>
        </div>
      );
    case "card-timeline":
      return (
        <div style={{ ...frame, gap: 4 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 16,
                borderRadius: 5,
                background: `rgba(56, 189, 248, ${0.28 + i * 0.08})`,
                border: "1px solid rgba(125, 211, 252, 0.2)",
              }}
            />
          ))}
        </div>
      );
    case "minimal-notifiche":
      return (
        <div style={{ ...frame, flexDirection: "row", gap: 4 }}>
          <div style={{ width: "26%", display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={bar(4, "100%", 0.4)} />
            <div style={bar(4, "100%", 0.35)} />
            <div style={bar(4, "100%", 0.3)} />
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              borderRadius: 3,
              background: "rgba(56, 189, 248, 0.15)",
            }}
          />
        </div>
      );
    case "brand-hero":
      return (
        <div style={frame}>
          <div style={{ ...bar(14, "100%", 0.85), borderRadius: 4 }} />
          <div style={{ flex: 1, background: "rgba(148, 163, 184, 0.1)", borderRadius: 4, minHeight: 0 }} />
          <div style={barMuted(3, 0.22)} />
        </div>
      );
    default: {
      const h = vetPaletteHueFromTemplateId(templateId);
      if (h === null) return null;
      const skin = vetPaletteSkinIndexFromTemplateId(templateId) ?? 0;
      const accent = `hsl(${h} 70% 55%)`;
      const border = `hsl(${h} 50% 50% / 0.35)`;
      const fillBySkin: Record<number, string> = {
        0: `linear-gradient(135deg, hsl(${h} 42% 38% / 0.35), hsl(${h + 40} 55% 42% / 0.32))`,
        1: `linear-gradient(8deg, hsl(${h} 38% 22% / 0.5), hsl(${h + 15} 48% 38% / 0.28))`,
        2: `conic-gradient(from 200deg at 60% 45%, hsl(${h} 45% 40% / 0.35), hsl(${h + 50} 40% 36% / 0.25))`,
        3: `linear-gradient(180deg, hsl(${h + 10} 40% 32% / 0.4), hsl(${h} 35% 28% / 0.22))`,
        4: `linear-gradient(90deg, hsl(${h + 25} 50% 38% / 0.32), hsl(${h - 15} 38% 30% / 0.28))`,
        5: `radial-gradient(circle at 0% 0%, rgba(0,0,0,0.35), transparent 55%), hsl(${h} 40% 32% / 0.3)`,
        6: `linear-gradient(118deg, hsl(${h} 42% 34% / 0.38) 46%, hsl(${h + 48} 48% 40% / 0.28) 46%)`,
        7: `radial-gradient(circle at 50% 35%, hsl(${h + 20} 55% 48% / 0.4), hsl(${h} 38% 30% / 0.22))`,
        8: `linear-gradient(180deg, hsl(${h} 45% 36% / 0.3), transparent 40%, hsl(${h + 35} 48% 38% / 0.26))`,
      };
      const fill = fillBySkin[skin] ?? fillBySkin[0];
      return (
        <div style={{ ...frame, borderColor: border }}>
          <div style={{ ...bar(6), background: accent, opacity: 0.88 }} />
          <div style={{ flex: 1, minHeight: 0, borderRadius: 3, background: fill }} />
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: accent, opacity: 0.75 }} />
          </div>
        </div>
      );
    }
  }
}
