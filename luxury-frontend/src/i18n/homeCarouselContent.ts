import type { MessageKey } from "./messages";
import type { LuxuryLocaleContextValue } from "./useLuxuryLocale";

export type StorySlide =
  | { kind: "brand"; id: string }
  | {
      kind: "image";
      id: string;
      eyebrow: string;
      titleBefore: string;
      titleHighlight: string;
      titleAfter: string;
      body: string;
      image: string;
      imageAlt: string;
    };

type SlideDef = {
  id: string;
  prefix: MessageKey;
  image: string;
};

function slideFromPrefix(t: LuxuryLocaleContextValue["t"], def: Omit<SlideDef, "prefix"> & { prefix: string }): StorySlide {
  const p = def.prefix;
  return {
    kind: "image",
    id: def.id,
    eyebrow: t(`${p}.eyebrow` as MessageKey),
    titleBefore: t(`${p}.titleBefore` as MessageKey),
    titleHighlight: t(`${p}.titleHighlight` as MessageKey),
    titleAfter: t(`${p}.titleAfter` as MessageKey),
    body: t(`${p}.body` as MessageKey),
    image: def.image,
    imageAlt: t(`${p}.alt` as MessageKey),
  };
}

const WEB_SLIDE_DEFS = [
  { id: "hair", prefix: "home.carousel.web.hair", image: "/editorial/photo-1560066984-138dadb4c035.webp" },
  { id: "beauty", prefix: "home.carousel.web.beauty", image: "/editorial/photo-1570172619644-dfd03ed5d881.webp" },
  { id: "wellness", prefix: "home.carousel.web.wellness", image: "/editorial/photo-1544161515-4ab6ce6db874.webp" },
] as const;

const APP_SLIDE_DEFS = [
  { id: "saloni", prefix: "home.carousel.app.saloni", image: "/editorial/photo-1527799820374-dcf8d9d4a388.webp" },
  { id: "hair", prefix: "home.carousel.app.hair", image: "/editorial/photo-1560066984-138dadb4c035.webp" },
  { id: "beauty", prefix: "home.carousel.app.beauty", image: "/editorial/photo-1570172619644-dfd03ed5d881.webp" },
  { id: "massage", prefix: "home.carousel.app.massage", image: "/editorial/photo-1544161515-4ab6ce6db874.webp" },
  { id: "nails", prefix: "home.carousel.app.nails", image: "/editorial/photo-1604654894610-df63bc536371.webp" },
] as const;

export function storySlidesForHome(t: LuxuryLocaleContextValue["t"], nativeApp: boolean): StorySlide[] {
  const imageSlides = (nativeApp ? APP_SLIDE_DEFS : WEB_SLIDE_DEFS).map((def) =>
    slideFromPrefix(t, { ...def, prefix: def.prefix }),
  );
  if (nativeApp) return imageSlides;
  return [{ kind: "brand", id: "brand" }, ...imageSlides];
}
