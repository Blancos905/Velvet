import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import type { MeSalonNotificationInbox } from "../api/types";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import {
  clearMeNotificationsUnauthorized,
  markMeNotificationsApiMissing,
  markMeNotificationsUnauthorized,
} from "../lib/meNotificationsQueryGate";

export function useMeNotificationInboxQuery(enabled = true) {
  const { accessToken, isSalonStaff } = useLuxuryAuth();
  return useQuery({
    queryKey: ["me", "notifications"],
    queryFn: async () => {
      const r = await apiFetch("/api/v1/me/notifications", { accessToken });
      if (r.status === 404) {
        markMeNotificationsApiMissing();
        return { types: [] };
      }
      if (r.status === 401) {
        markMeNotificationsUnauthorized();
        return { types: [] };
      }
      if (!r.ok) {
        const text = await r.text();
        throw new Error(text?.trim() || `Errore API notifiche (${r.status})`);
      }
      clearMeNotificationsUnauthorized();
      const text = await r.text();
      if (!text) {
        return { types: [] };
      }
      try {
        return JSON.parse(text) as MeSalonNotificationInbox;
      } catch (err) {
        if (err instanceof Error) {
          throw new Error(`Risposta notifiche non valida: ${err.message}`);
        }
        throw err;
      }
    },
    enabled: Boolean(enabled && !isSalonStaff && accessToken),
    staleTime: 45_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchInterval: 20_000,
    retry: false,
  });
}
