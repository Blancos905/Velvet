import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { invalidateSalonShowcaseHitVisualQueries } from "../lib/salonShowcaseHitVisualQuery";
import { readSalonShowcaseAsync } from "../lib/salonShowcaseStorage";
import { useMeSalonSummaryQuery } from "./useMeSalonSummary";

/**
 * Titolare autenticato: pubblica sul server (PostgreSQL) la vetrina ancora solo in IndexedDB locale,
 * così home/ricerca/app mostrano le immagini reali senza un secondo caricamento manuale.
 */
export function useSalonShowcaseOwnerMigration(): void {
  const { isSalonTitolare, accessToken } = useLuxuryAuth();
  const meSalon = useMeSalonSummaryQuery();
  const qc = useQueryClient();
  const slug = meSalon.data?.primaryLocationSlug?.trim() ?? "";

  useEffect(() => {
    if (!isSalonTitolare || !accessToken || !slug) return;
    let alive = true;
    void readSalonShowcaseAsync(slug, accessToken).then((data) => {
      if (!alive || !data) return;
      invalidateSalonShowcaseHitVisualQueries(qc, slug);
      void qc.invalidateQueries({ queryKey: ["salon-showcase", slug] });
    });
    return () => {
      alive = false;
    };
  }, [isSalonTitolare, accessToken, slug, qc]);
}
