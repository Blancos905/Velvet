import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import type { MeSalonNotificationMessage } from "../api/types";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import {
  clearMeNotificationsUnauthorized,
  markMeNotificationsApiMissing,
  markMeNotificationsUnauthorized,
} from "../lib/meNotificationsQueryGate";

export function useMeNotificationMessagesQuery(bucket: string | null) {
  const { accessToken, isSalonStaff } = useLuxuryAuth();
  const q = bucket ? `/api/v1/me/notifications/messages?bucket=${encodeURIComponent(bucket)}` : null;
  return useQuery({
    queryKey: ["me", "notifications", "messages", bucket],
    queryFn: async () => {
      const r = await apiFetch(q!, { accessToken });
      if (r.status === 404) {
        markMeNotificationsApiMissing();
        return [];
      }
      if (r.status === 401) {
        markMeNotificationsUnauthorized();
        return [];
      }
      if (!r.ok) {
        const text = await r.text();
        throw new Error(text?.trim() || `Errore API messaggi notifiche (${r.status})`);
      }
      clearMeNotificationsUnauthorized();
      const text = await r.text();
      if (!text) {
        return [];
      }
      try {
        return JSON.parse(text) as MeSalonNotificationMessage[];
      } catch (err) {
        if (err instanceof Error) {
          throw new Error(`Risposta messaggi notifiche non valida: ${err.message}`);
        }
        throw err;
      }
    },
    enabled: Boolean(q && !isSalonStaff && accessToken),
    staleTime: 45_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchInterval: bucket ? 20_000 : false,
    retry: false,
  });
}
