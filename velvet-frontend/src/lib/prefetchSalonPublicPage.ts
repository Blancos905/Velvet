import type { QueryClient } from "@tanstack/react-query";
import { readSalonShowcaseAsync } from "./salonShowcaseStorage";
import { salonShowcaseHitVisualQueryKey } from "./salonShowcaseHitVisualQuery";
import { prefetchPublicOrganizationDetail } from "./publicOrganizationDetail";

export function salonShowcaseFullQueryKey(slug: string) {
  return ["salon-showcase", slug.trim().toLowerCase()] as const;
}

async function readSalonShowcaseHitVisual(slug: string) {
  const s = await readSalonShowcaseAsync(slug);
  if (!s) return { logoDataUrl: null as string | null, coverDataUrl: null as string | null };
  const cover =
    s.siteImageDataUrls.find((u): u is string => Boolean(u)) ??
    s.exploreGalleryImageDataUrls.find((u): u is string => Boolean(u)) ??
    Object.values(s.servicePhotoDataUrls).find((u): u is string => Boolean(u)) ??
    null;
  return { logoDataUrl: s.logoDataUrl, coverDataUrl: cover };
}

/** Anticipa dati scheda salone al passaggio su un risultato ricerca / suggerimento. */
export function prefetchSalonPublicPage(queryClient: QueryClient, slug: string): void {
  prefetchPublicOrganizationDetail(queryClient, slug);
  const s = slug.trim();
  if (!s) return;
  void queryClient.prefetchQuery({
    queryKey: salonShowcaseFullQueryKey(s),
    queryFn: () => readSalonShowcaseAsync(s),
    staleTime: 5 * 60_000,
  });
  void queryClient.prefetchQuery({
    queryKey: salonShowcaseHitVisualQueryKey(s),
    queryFn: () => readSalonShowcaseHitVisual(s),
    staleTime: 0,
  });
}
