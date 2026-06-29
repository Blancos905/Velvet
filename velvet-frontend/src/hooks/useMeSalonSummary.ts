import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../api/client";
import type { MeSalonSummary } from "../api/types";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";

/** Dati salone titolare da DB (email registrazione = `studio_groups.owner_email`). */
export function useMeSalonSummaryQuery() {
  const { isAuthenticated, isSalonTitolare, accessToken } = useVelvetAuth();
  return useQuery({
    queryKey: ["me", "salon", accessToken],
    queryFn: () => apiJson<MeSalonSummary>("/api/v1/me/salon", { accessToken }),
    enabled: Boolean(isAuthenticated && isSalonTitolare && accessToken),
    staleTime: 60_000,
  });
}
