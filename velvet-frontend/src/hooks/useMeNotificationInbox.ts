import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import type { MeSalonNotificationInbox } from "../api/types";
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

export function useMeNotificationInboxQuery(enabled = true) {
  const { accessToken, isSalonStaff } = useVelvetAuth();
  const apiKnownMissing = isNotificationsApiKnownMissing();
  const unauthorized = isNotificationsUnauthorized();
  return useQuery({
    queryKey: ["me", "notifications"],
    queryFn: async () => {
      const r = await apiFetch("/api/v1/me/notifications", { accessToken });
      if (r.status === 404) {
        markNotificationsApiMissing();
        return { types: [] };
      }
      if (r.status === 401) {
        markNotificationsUnauthorized();
        return { types: [] };
      }
      if (!r.ok) {
        const text = await r.text();
        throw new Error(text?.trim() || `Errore API notifiche (${r.status})`);
      }
      clearNotificationsUnauthorized();
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
    enabled: Boolean(enabled && !apiKnownMissing && !unauthorized && !isSalonStaff && accessToken),
    staleTime: 45_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchInterval: 20_000,
    retry: false,
  });
}
