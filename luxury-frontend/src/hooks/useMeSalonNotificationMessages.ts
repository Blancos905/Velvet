import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../api/client";
import type { MeSalonNotificationMessage } from "../api/types";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";

export function useMeSalonNotificationMessagesQuery(bucket: string | null) {
  const { accessToken, isSalonTitolare, isSalonStaff } = useLuxuryAuth();
  const q =
    bucket != null && bucket.length > 0
      ? `/api/v1/me/salon/notifications/messages?bucket=${encodeURIComponent(bucket)}`
      : null;
  return useQuery({
    queryKey: ["me", "salon", "notifications", "messages", bucket],
    queryFn: () => apiJson<MeSalonNotificationMessage[]>(q!, { accessToken }),
    enabled: Boolean(q && (isSalonTitolare || isSalonStaff) && accessToken),
    staleTime: 45_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchInterval: bucket ? 20_000 : false,
  });
}
