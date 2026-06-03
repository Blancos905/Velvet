export const VELVET_SUPER_ADMIN_TOKEN_KEY = "velvet_super_admin_access_token";

/** Stesso tab: `sessionStorage` non emette `storage`; `AdminAuthProvider` ascolta questo evento. */
export const VELVET_ADMIN_SESSION_CHANGED_EVENT = "velvet-admin-session-changed";

function notifyAdminSessionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(VELVET_ADMIN_SESSION_CHANGED_EVENT));
}

export function readAdminAccessToken(): string | undefined {
  if (typeof sessionStorage === "undefined") return undefined;
  return sessionStorage.getItem(VELVET_SUPER_ADMIN_TOKEN_KEY) ?? undefined;
}

export function writeAdminAccessToken(token: string): void {
  sessionStorage.setItem(VELVET_SUPER_ADMIN_TOKEN_KEY, token);
  notifyAdminSessionChanged();
}

export function clearAdminAccessToken(): void {
  sessionStorage.removeItem(VELVET_SUPER_ADMIN_TOKEN_KEY);
  notifyAdminSessionChanged();
}
