import { apiUrl } from "../config/env";
import { fetchWithTimeout } from "../api/fetchWithTimeout";
import { isLuxuryLoginSessionExpired } from "../lib/luxurySessionStartedAt";

const REFRESH_TOKEN_STORAGE_KEY = "luxury_refresh_token";

type AuthLoginResponse = {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresInSeconds: number;
  refreshTokenExpiresInDays?: number;
};

let refreshInFlight: Promise<string | undefined> | null = null;

export function readStoredRefreshToken(): string | undefined {
  return undefined;
}

export function writeStoredRefreshToken(_token: string | undefined): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function clearStoredRefreshToken(): void {
  writeStoredRefreshToken(undefined);
}

export async function refreshLuxuryAccessToken(): Promise<string | undefined> {
  if (isLuxuryLoginSessionExpired()) {
    return undefined;
  }
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = (async () => {
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
    writeStoredRefreshToken(undefined);
    return body.accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function logoutLuxurySession(): Promise<void> {
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
  clearStoredRefreshToken();
}

export type { AuthLoginResponse };
