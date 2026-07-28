import { apiUrl } from "../config/env";
import { fetchWithTimeout } from "../api/fetchWithTimeout";
import {
  readStoredRefreshToken,
  writeStoredRefreshToken,
  type AuthLoginResponse,
} from "./luxuryRefreshSession";

export const LUXURY_SUPER_ADMIN_REFRESH_TOKEN_KEY = "luxury_super_admin_refresh_token";

let adminRefreshInFlight: Promise<string | undefined> | null = null;

export function readAdminRefreshToken(): string | undefined {
  if (typeof localStorage === "undefined") return undefined;
  const raw = localStorage.getItem(LUXURY_SUPER_ADMIN_REFRESH_TOKEN_KEY);
  return raw && raw.trim() ? raw.trim() : undefined;
}

export function writeAdminRefreshToken(token: string | undefined): void {
  if (typeof localStorage === "undefined") return;
  if (!token || !token.trim()) {
    localStorage.removeItem(LUXURY_SUPER_ADMIN_REFRESH_TOKEN_KEY);
    return;
  }
  localStorage.setItem(LUXURY_SUPER_ADMIN_REFRESH_TOKEN_KEY, token.trim());
}

export function clearAdminRefreshToken(): void {
  writeAdminRefreshToken(undefined);
}

/** Allinea il refresh token admin a quello della sessione Luxury (rotazione condivisa). */
export function syncAdminRefreshTokenFromLuxurySession(): void {
  const luxuryRefresh = readStoredRefreshToken();
  if (luxuryRefresh) {
    writeAdminRefreshToken(luxuryRefresh);
  }
}

export async function refreshAdminAccessToken(): Promise<string | undefined> {
  if (adminRefreshInFlight) {
    return adminRefreshInFlight;
  }
  adminRefreshInFlight = (async () => {
    const storedRefresh = readAdminRefreshToken() ?? readStoredRefreshToken();
    if (!storedRefresh) {
      return undefined;
    }
    const r = await fetchWithTimeout(apiUrl("/api/v1/auth/refresh"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: storedRefresh }),
    });
    if (!r.ok) {
      return undefined;
    }
    const body = (await r.json()) as AuthLoginResponse;
    if (body.refreshToken?.trim()) {
      writeAdminRefreshToken(body.refreshToken.trim());
      writeStoredRefreshToken(body.refreshToken.trim());
    }
    return body.accessToken?.trim() || undefined;
  })().finally(() => {
    adminRefreshInFlight = null;
  });
  return adminRefreshInFlight;
}

export async function logoutAdminSession(): Promise<void> {
  const storedRefresh = readAdminRefreshToken() ?? readStoredRefreshToken();
  try {
    await fetchWithTimeout(apiUrl("/api/v1/auth/logout"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(storedRefresh ? { refreshToken: storedRefresh } : {}),
    });
  } catch {
    /* best effort */
  }
  clearAdminRefreshToken();
}
