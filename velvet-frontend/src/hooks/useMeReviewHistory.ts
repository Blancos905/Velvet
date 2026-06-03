import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../api/client";
import type { MeReviewHistoryItem } from "../api/types";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";

export function useMeReviewHistoryQuery(enabled = true) {
  const { accessToken, isSalonTitolare, isSalonStaff, isVelvetSuperAdmin } = useVelvetAuth();
  return useQuery({
    queryKey: ["me", "reviews", "history"],
    queryFn: () => apiJson<MeReviewHistoryItem[]>("/api/v1/me/reviews", { accessToken }),
    enabled: Boolean(enabled && accessToken && !isSalonTitolare && !isSalonStaff && !isVelvetSuperAdmin),
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}
