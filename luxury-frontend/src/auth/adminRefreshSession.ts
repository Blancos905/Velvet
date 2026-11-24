import { apiUrl } from "../config/env";
import { fetchWithTimeout } from "../api/fetchWithTimeout";
import { isLuxuryLoginSessionExpired } from "../lib/luxurySessionStartedAt";
import { writeStoredRefreshToken, type AuthLoginResponse } from "./luxuryRefreshSession";

export const LUXURY_SUPER_ADMIN_REFRESH_TOKEN_KEY = "luxury_super_admin_refresh_token";

let adminRefreshInFlight: Promise<string | undefined> | null = null;

export function readAdminRefreshToken(): string | undefined {
  return undefined;
}

export function writeAdminRefreshToken(_token: string | undefined): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(LUXURY_SUPER_ADMIN_REFRESH_TOKEN_KEY);
}

export function clearAdminRefreshToken(): void {
  writeAdminRefreshToken(undefined);
}

/** Allinea il refresh token admin a quello della sessione Luxury (rotazione condivisa). */
export function syncAdminRefreshTokenFromLuxurySession(): void {
  writeAdminRefreshToken(undefined);
  writeStoredRefreshToken(undefined);
}

export async function refreshAdminAccessToken(): Promise<string | undefined> {
  if (isLuxuryLoginSessionExpired()) {
    return undefined;
  }
  if (adminRefreshInFlight) {
    return adminRefreshInFlight;
  }
  adminRefreshInFlight = (async () => {
    writeAdminRefreshToken(undefined);
    writeStoredRefreshToken(undefined);
    const r = await fetchWithTimeout(apiUrl("/api/v1/auth/refresh"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!r.ok) {
      return undefined;
    }
    const body = (await r.json()) as AuthLoginResponse;
    writeAdminRefreshToken(undefined);
    writeStoredRefreshToken(undefined);
    return body.accessToken?.trim() || undefined;
  })().finally(() => {
    adminRefreshInFlight = null;
  });
  return adminRefreshInFlight;
}

export async function logoutAdminSession(): Promise<void> {
  try {
    await fetchWithTimeout(apiUrl("/api/v1/auth/logout"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  } catch {
    /* best effort */
  }
  clearAdminRefreshToken();
}
