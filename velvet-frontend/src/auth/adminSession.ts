import { isVelvetAccessTokenExpired } from "../lib/velvetAccessTokenExpiry";
import { velvetJwtHintsFromAccessToken } from "../lib/velvetJwtHintsFromAccessToken";

export const VELVET_SUPER_ADMIN_TOKEN_KEY = "velvet_super_admin_access_token";
/** JWT area account (`VelvetAuthProvider`); usato come fallback per il pannello admin. */
export const VELVET_ACCESS_TOKEN_KEY = "velvet_access_token";

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

/** Token admin valido, oppure JWT account con ruolo ADMIN (login da `/account`). */
export function resolveValidAdminAccessToken(): string | undefined {
  const stored = readAdminAccessToken();
  if (stored) {
    if (isVelvetAccessTokenExpired(stored)) {
      clearAdminAccessToken();
    } else {
      return stored;
    }
  }
  if (typeof sessionStorage === "undefined") return undefined;
  const velvetRaw = sessionStorage.getItem(VELVET_ACCESS_TOKEN_KEY);
  if (!velvetRaw || isVelvetAccessTokenExpired(velvetRaw)) return undefined;
  if (!velvetJwtHintsFromAccessToken(velvetRaw).realmRoles.includes("ADMIN")) return undefined;
  writeAdminAccessToken(velvetRaw);
  return velvetRaw;
}

export function writeAdminAccessToken(token: string): void {
  sessionStorage.setItem(VELVET_SUPER_ADMIN_TOKEN_KEY, token);
  notifyAdminSessionChanged();
}

export function clearAdminAccessToken(): void {
  sessionStorage.removeItem(VELVET_SUPER_ADMIN_TOKEN_KEY);
  notifyAdminSessionChanged();
}
