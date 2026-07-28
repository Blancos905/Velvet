import { isLuxuryAccessTokenExpired } from "../lib/luxuryAccessTokenExpiry";
import { luxuryJwtHintsFromAccessToken } from "../lib/luxuryJwtHintsFromAccessToken";
import { clearAdminRefreshToken } from "./adminRefreshSession";

export const LUXURY_SUPER_ADMIN_TOKEN_KEY = "luxury_super_admin_access_token";
/** JWT area account (`LuxuryAuthProvider`); usato come fallback per il pannello admin. */
export const LUXURY_ACCESS_TOKEN_KEY = "luxury_access_token";
/**
 * Impersonazione da pannello super admin (sessione app titolare/cliente + JWT admin separato).
 * Senza questo flag, un token admin persistito non deve aprire `/admin` se la sessione app è OWNER/STAFF/CLIENT.
 */
export const LUXURY_ADMIN_IMPERSONATION_KEY = "luxury_admin_impersonating";

/** Stesso tab: `sessionStorage` non emette `storage`; `AdminAuthProvider` ascolta questo evento. */
export const LUXURY_ADMIN_SESSION_CHANGED_EVENT = "luxury-admin-session-changed";

function notifyAdminSessionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LUXURY_ADMIN_SESSION_CHANGED_EVENT));
}

function readPersistedAdminAccessTokenRaw(): string | null {
  if (typeof localStorage === "undefined") return null;
  const fromLocal = localStorage.getItem(LUXURY_SUPER_ADMIN_TOKEN_KEY);
  if (fromLocal) return fromLocal;
  if (typeof sessionStorage === "undefined") return null;
  const legacy = sessionStorage.getItem(LUXURY_SUPER_ADMIN_TOKEN_KEY);
  if (!legacy) return null;
  try {
    localStorage.setItem(LUXURY_SUPER_ADMIN_TOKEN_KEY, legacy);
    sessionStorage.removeItem(LUXURY_SUPER_ADMIN_TOKEN_KEY);
  } catch {
    return legacy;
  }
  return legacy;
}

function writePersistedAdminAccessToken(token: string): void {
  localStorage.setItem(LUXURY_SUPER_ADMIN_TOKEN_KEY, token);
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(LUXURY_SUPER_ADMIN_TOKEN_KEY);
  }
}

function removePersistedAdminAccessToken(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(LUXURY_SUPER_ADMIN_TOKEN_KEY);
  }
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(LUXURY_SUPER_ADMIN_TOKEN_KEY);
  }
}

export function readAdminAccessToken(): string | undefined {
  const raw = readPersistedAdminAccessTokenRaw();
  return raw ?? undefined;
}

export function markAdminImpersonationActive(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(LUXURY_ADMIN_IMPERSONATION_KEY, "1");
}

export function clearAdminImpersonationFlag(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(LUXURY_ADMIN_IMPERSONATION_KEY);
}

export function isAdminImpersonationActive(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(LUXURY_ADMIN_IMPERSONATION_KEY) === "1";
}

/** Blocca JWT admin persistito se la sessione app attiva è titolare/staff/cliente senza impersonazione esplicita. */
function shouldBlockStaleAdminToken(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const luxuryRaw = sessionStorage.getItem(LUXURY_ACCESS_TOKEN_KEY);
  if (!luxuryRaw || isLuxuryAccessTokenExpired(luxuryRaw)) return false;
  const luxuryRoles = luxuryJwtHintsFromAccessToken(luxuryRaw).realmRoles;
  if (luxuryRoles.includes("ADMIN")) return false;
  return !isAdminImpersonationActive();
}

function rejectStaleAdminToken(): undefined {
  clearAdminSession();
  return undefined;
}

/** Token admin valido, oppure JWT account con ruolo ADMIN (login da `/account`). */
export function resolveValidAdminAccessToken(): string | undefined {
  const stored = readAdminAccessToken();
  if (stored) {
    if (isLuxuryAccessTokenExpired(stored)) {
      removePersistedAdminAccessToken();
    } else if (shouldBlockStaleAdminToken()) {
      return rejectStaleAdminToken();
    } else {
      return stored;
    }
  }
  if (typeof sessionStorage === "undefined") return undefined;
  const luxuryRaw = sessionStorage.getItem(LUXURY_ACCESS_TOKEN_KEY);
  if (!luxuryRaw || isLuxuryAccessTokenExpired(luxuryRaw)) return undefined;
  if (!luxuryJwtHintsFromAccessToken(luxuryRaw).realmRoles.includes("ADMIN")) return undefined;
  writeAdminAccessToken(luxuryRaw);
  return luxuryRaw;
}

export function writeAdminAccessToken(token: string): void {
  if (typeof localStorage === "undefined") return;
  writePersistedAdminAccessToken(token);
  notifyAdminSessionChanged();
}

export function clearAdminAccessToken(): void {
  removePersistedAdminAccessToken();
  notifyAdminSessionChanged();
}

/** Chiude la sessione super admin persistita (access + refresh + flag impersonazione). */
export function clearAdminSession(): void {
  clearAdminAccessToken();
  clearAdminRefreshToken();
  clearAdminImpersonationFlag();
}
