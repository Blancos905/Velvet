import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../api/client";
import type { MePendingReviewInviteItem } from "../api/types";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";

function isPendingReviewsEndpointUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("404") ||
    msg.includes("not found") ||
    msg.includes("failed to fetch") ||
    msg.includes("500") ||
    msg.includes("503") ||
    msg.includes("database") ||
    msg.includes("database_unavailable") ||
    msg.includes("internal_error")
  );
}

export function useMePendingReviewInvitesQuery(enabled = true) {
  const { accessToken, isSalonTitolare, isSalonStaff, isVelvetSuperAdmin } = useVelvetAuth();
  return useQuery({
    queryKey: ["me", "reviews", "pending"],
    queryFn: async () => {
      try {
        return await apiJson<MePendingReviewInviteItem[]>("/api/v1/me/reviews/pending", { accessToken });
      } catch (error) {
        // Compatibilita' con backend non ancora aggiornato.
        if (isPendingReviewsEndpointUnavailable(error)) return [];
        throw error;
      }
    },
    enabled: Boolean(enabled && accessToken && !isSalonTitolare && !isSalonStaff && !isVelvetSuperAdmin),
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchInterval: 20_000,
  });
}
