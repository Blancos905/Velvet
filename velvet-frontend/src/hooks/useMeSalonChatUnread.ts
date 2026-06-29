import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../api/client";
import type { SalonLuxuryChatUnreadDto } from "../api/types";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";

/** Base query key per invalidare dopo lettura/invio in chat. */
export const ME_SALON_CHAT_UNREAD_QUERY_KEY = ["me", "salon-clients", "chat", "unread"] as const;

const CHAT_UNREAD_EMPTY: SalonLuxuryChatUnreadDto = { clientUnread: 0, ownerUnread: 0 };

function isChatUnreadEndpointTransientFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("500") ||
    msg.includes("503") ||
    msg.includes("database") ||
    msg.includes("database_unavailable") ||
    msg.includes("internal_error") ||
    msg.includes("risposta non valida dall")
  );
}

/** Stesso header del catalogo `/api/v1/clients` quando si agisce come salone (titolare o staff Premium). */
export function useMeSalonChatUnreadQuery(enabled: boolean, salonSideLocationId?: string | null) {
  const { accessToken } = useVelvetAuth();
  const loc = salonSideLocationId?.trim() ?? "";
  return useQuery({
    queryKey: [...ME_SALON_CHAT_UNREAD_QUERY_KEY, accessToken, loc],
    queryFn: async () => {
      try {
        return await apiJson<SalonLuxuryChatUnreadDto>("/api/v1/me/salon-clients/chat/unread-count", {
          accessToken,
          ...(loc ? { headers: { "X-Location-Id": loc } } : {}),
        });
      } catch (error) {
        if (isChatUnreadEndpointTransientFailure(error)) {
          return CHAT_UNREAD_EMPTY;
        }
        throw error;
      }
    },
    enabled: Boolean(enabled && accessToken),
    refetchInterval: 12_000,
    staleTime: 4_000,
  });
}
