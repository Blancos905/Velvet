import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../api/client";
import type { MeSalonReview } from "../api/types";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import { isVelvetUnauthorizedError } from "../lib/authErrors";

function isEndpointTemporarilyUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("404") ||
    msg.includes("not found") ||
    msg.includes("access control") ||
    msg.includes("cors") ||
    msg.includes("failed to fetch")
  );
}

export function useMeSalonReviewsQuery(enabled = true) {
  const { accessToken, isSalonTitolare, isSalonStaff } = useVelvetAuth();
  const salonReviewsEligible =
    Boolean(accessToken) && ((isSalonTitolare && !isSalonStaff) || isSalonStaff);
  return useQuery({
    queryKey: ["me", "salon", "reviews", accessToken ?? ""],
    queryFn: async () => {
      try {
        return await apiJson<MeSalonReview[]>("/api/v1/me/salon/reviews", { accessToken });
      } catch (error) {
        // Compatibilita' con backend non ancora aggiornato o proxy/CORS temporaneamente non disponibile.
        if (isEndpointTemporarilyUnavailable(error)) return [];
        throw error;
      }
    },
    enabled: Boolean(enabled && salonReviewsEligible),
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchInterval: 20_000,
    retry: (failureCount, error) => failureCount < 2 && !isVelvetUnauthorizedError(error),
  });
}
