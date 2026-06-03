import type { QueryClient } from "@tanstack/react-query";

const PREFIX = "salonShowcaseHitVisual" as const;

function normSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function salonShowcaseHitVisualQueryKey(slug: string) {
  return [PREFIX, normSlug(slug)] as const;
}

/** Dopo ogni scrittura vetrina locale: aggiorna logo/sfondo in home e `/search`. */
export function invalidateSalonShowcaseHitVisualQueries(qc: QueryClient, slug?: string): void {
  const s = slug?.trim();
  if (s) {
    void qc.invalidateQueries({ queryKey: salonShowcaseHitVisualQueryKey(normSlug(s)) });
  } else {
    void qc.invalidateQueries({ queryKey: [PREFIX] });
  }
}
