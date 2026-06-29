import { useQuery } from "@tanstack/react-query";
import { salonShowcaseHitVisualQueryKey } from "../lib/salonShowcaseHitVisualQuery";
import { readSalonShowcaseAsync } from "../lib/salonShowcaseStorage";

export function searchHitInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type HitVisual = {
  logoDataUrl: string | null;
  coverDataUrl: string | null;
};

type Props = {
  slug: string;
  name: string;
  /** Classi base avatar (es. `luxury-search-card-avatar`). */
  avatarClass: string;
  /** Aggiunta quando c’è il logo (es. `luxury-search-card-avatar--logo`). */
  logoExtraClass?: string;
};

/**
 * Avatar in elenco/suggerimenti: logo della vetrina se presente, altrimenti la prima immagine disponibile come sfondo
 * (carosello vetrina → gallery «Esplora» → foto servizio), altrimenti iniziali.
 * La query si invalida dopo ogni salvataggio vetrina così home e `/search` si aggiornano subito.
 */
export function SearchHitLogoAvatar({ slug, name, avatarClass, logoExtraClass }: Props) {
  const { data } = useQuery({
    queryKey: salonShowcaseHitVisualQueryKey(slug),
    queryFn: async (): Promise<HitVisual> => {
      const s = await readSalonShowcaseAsync(slug);
      if (!s) return { logoDataUrl: null, coverDataUrl: null };
      const cover =
        s.siteImageDataUrls.find((u): u is string => Boolean(u)) ??
        s.exploreGalleryImageDataUrls.find((u): u is string => Boolean(u)) ??
        Object.values(s.servicePhotoDataUrls).find((u): u is string => Boolean(u)) ??
        null;
      return { logoDataUrl: s.logoDataUrl, coverDataUrl: cover };
    },
    staleTime: 0,
    gcTime: 5 * 60_000,
  });

  const logo = data?.logoDataUrl;
  const cover = data?.coverDataUrl;

  const base = avatarClass.trim();

  if (logo) {
    const withLogo = [base, logoExtraClass?.trim()].filter(Boolean).join(" ");
    return (
      <div className={withLogo} aria-hidden>
        <img src={logo} alt="" />
      </div>
    );
  }

  if (cover) {
    const withCover = [base, "luxury-hit-avatar--cover"].filter(Boolean).join(" ");
    return (
      <div
        className={withCover}
        aria-hidden
        style={{ backgroundImage: `url(${JSON.stringify(cover)})` }}
      />
    );
  }

  return (
    <div className={base} aria-hidden>
      {searchHitInitials(name)}
    </div>
  );
}
