import type { QueryClient } from "@tanstack/react-query";
import { readSalonShowcaseAsync } from "./salonShowcaseStorage";
import { prefetchPublicOrganizationDetail } from "./publicOrganizationDetail";

export function salonShowcaseFullQueryKey(slug: string) {
  return ["salon-showcase", slug.trim().toLowerCase()] as const;
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
}
