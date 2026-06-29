import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import type { MeSalonNotificationMessage } from "../api/types";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";

const ME_NOTIFICATIONS_API_MISSING_KEY = "velvet.meNotificationsApiMissing";
const ME_NOTIFICATIONS_UNAUTHORIZED_KEY = "velvet.meNotificationsUnauthorized";

function isNotificationsApiKnownMissing(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ME_NOTIFICATIONS_API_MISSING_KEY) === "1";
}

function markNotificationsApiMissing(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ME_NOTIFICATIONS_API_MISSING_KEY, "1");
}

function isNotificationsUnauthorized(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ME_NOTIFICATIONS_UNAUTHORIZED_KEY) === "1";
}

function markNotificationsUnauthorized(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ME_NOTIFICATIONS_UNAUTHORIZED_KEY, "1");
}

function clearNotificationsUnauthorized(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ME_NOTIFICATIONS_UNAUTHORIZED_KEY);
}

export function useMeNotificationMessagesQuery(bucket: string | null) {
  const { accessToken, isSalonStaff } = useVelvetAuth();
  const apiKnownMissing = isNotificationsApiKnownMissing();
  const unauthorized = isNotificationsUnauthorized();
  const q = bucket ? `/api/v1/me/notifications/messages?bucket=${encodeURIComponent(bucket)}` : null;
  return useQuery({
    queryKey: ["me", "notifications", "messages", bucket],
    queryFn: async () => {
      const r = await apiFetch(q!, { accessToken });
      if (r.status === 404) {
        markNotificationsApiMissing();
        return [];
      }
      if (r.status === 401) {
        markNotificationsUnauthorized();
        return [];
      }
      if (!r.ok) {
        const text = await r.text();
        throw new Error(text?.trim() || `Errore API messaggi notifiche (${r.status})`);
      }
      clearNotificationsUnauthorized();
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
    enabled: Boolean(q && !apiKnownMissing && !unauthorized && !isSalonStaff && accessToken),
    staleTime: 45_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchInterval: bucket ? 20_000 : false,
    retry: false,
  });
}
