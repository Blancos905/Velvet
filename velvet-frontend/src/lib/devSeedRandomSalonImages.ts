/**
 * Solo browser: genera JPEG data URL “salon-like” (gradienti + forme morbide) per test vetrina / Esplora.
 * Usata dalla route dev `/dev/seed-salone-showcase`.
 */

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 6 immagini distinte per slot gallery (dimensioni contenute per IndexedDB). */
export function makeDevSalonGalleryDataUrls(slug: string): string[] {
  if (typeof document === "undefined") return [];
  const base = hash32(slug.trim().toLowerCase());
  const out: string[] = [];
  for (let slot = 0; slot < 6; slot++) {
    const seed = (base + slot * 9973) >>> 0;
    const w = 880;
    const h = 560;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    const hue0 = (seed % 360) as number;
    const hue1 = (hue0 + 28 + (slot * 17)) % 360;
    const hue2 = (hue0 + 210) % 360;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, `hsl(${hue0} 42% 24%)`);
    g.addColorStop(0.45, `hsl(${hue1} 48% 32%)`);
    g.addColorStop(1, `hsl(${hue2} 35% 18%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const orbs = 5 + (seed % 4);
    for (let i = 0; i < orbs; i++) {
      const r = 80 + ((seed >> (i * 3)) % 160);
      const cx = ((seed * (i + 7)) % (w - r * 2)) + r;
      const cy = ((seed * (i + 11)) % (h - r * 2)) + r;
      const og = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      og.addColorStop(0, `hsla(${(hue0 + i * 31) % 360}, 70%, 62%, 0.35)`);
      og.addColorStop(0.55, `hsla(${(hue1 + i * 19) % 360}, 55%, 45%, 0.12)`);
      og.addColorStop(1, "transparent");
      ctx.fillStyle = og;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = "#fff7ed";
    for (let s = 0; s < 22; s++) {
      const x = ((seed >> s) * 13) % w;
      const y = ((seed << s) * 7) % h;
      ctx.fillRect(x, y, 2 + (s % 3), 40 + (s % 80));
    }
    ctx.restore();

    ctx.font = `700 ${28 + (slot % 3) * 4}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255, 251, 235, 0.22)";
    ctx.textAlign = "left";
    ctx.fillText(`Hair test · ${slot + 1}/6`, 24, 48);

    out.push(canvas.toDataURL("image/jpeg", 0.78));
  }
  return out;
}
