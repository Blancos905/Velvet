import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../api/client";
import type { MeReviewHistoryItem } from "../api/types";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";

export function useMeReviewHistoryQuery(enabled = true) {
  const { accessToken, isSalonTitolare, isSalonStaff, isLuxurySuperAdmin } = useLuxuryAuth();
  return useQuery({
    queryKey: ["me", "reviews", "history"],
    queryFn: () => apiJson<MeReviewHistoryItem[]>("/api/v1/me/reviews", { accessToken }),
    enabled: Boolean(enabled && accessToken && !isSalonTitolare && !isSalonStaff && !isLuxurySuperAdmin),
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}
