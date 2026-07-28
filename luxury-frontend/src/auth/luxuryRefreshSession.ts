import { apiUrl } from "../config/env";
import { fetchWithTimeout } from "../api/fetchWithTimeout";

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
  if (typeof sessionStorage === "undefined") return undefined;
  const raw = sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  return raw && raw.trim() ? raw.trim() : undefined;
}

export function writeStoredRefreshToken(token: string | undefined): void {
  if (typeof sessionStorage === "undefined") return;
  if (!token || !token.trim()) {
    sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token.trim());
}

export function clearStoredRefreshToken(): void {
  writeStoredRefreshToken(undefined);
}

export async function refreshLuxuryAccessToken(): Promise<string | undefined> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = (async () => {
    const storedRefresh = readStoredRefreshToken();
    const r = await fetchWithTimeout(apiUrl("/api/v1/auth/refresh"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(storedRefresh ? { refreshToken: storedRefresh } : {}),
    });
    if (!r.ok) {
      return undefined;
    }
    const body = (await r.json()) as AuthLoginResponse;
    if (body.refreshToken) {
      writeStoredRefreshToken(body.refreshToken);
    }
    return body.accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function logoutLuxurySession(): Promise<void> {
  const storedRefresh = readStoredRefreshToken();
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
  clearStoredRefreshToken();
}

export type { AuthLoginResponse };
