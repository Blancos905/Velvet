const ME_NOTIFICATIONS_API_MISSING_KEY = "luxury.meNotificationsApiMissing";
const ME_NOTIFICATIONS_UNAUTHORIZED_KEY = "luxury.meNotificationsUnauthorized";

export function isMeNotificationsApiKnownMissing(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ME_NOTIFICATIONS_API_MISSING_KEY) === "1";
}

export function markMeNotificationsApiMissing(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ME_NOTIFICATIONS_API_MISSING_KEY, "1");
}

export function isMeNotificationsUnauthorized(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ME_NOTIFICATIONS_UNAUTHORIZED_KEY) === "1";
}

export function markMeNotificationsUnauthorized(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ME_NOTIFICATIONS_UNAUTHORIZED_KEY, "1");
}

export function clearMeNotificationsUnauthorized(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ME_NOTIFICATIONS_UNAUTHORIZED_KEY);
}

/** Dopo login/refresh token: riabilita inbox e messaggi (evita «Caricamento messaggi…» infinito). */
export function clearMeNotificationsQueryGateFlags(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ME_NOTIFICATIONS_API_MISSING_KEY);
  window.localStorage.removeItem(ME_NOTIFICATIONS_UNAUTHORIZED_KEY);
}
