import { apiUrl } from "../config/env";
import { refreshLuxuryAccessToken } from "../auth/luxuryRefreshSession";
import { refreshAdminAccessToken } from "../auth/adminRefreshSession";
import { writeAdminAccessToken } from "../auth/adminSession";
import { isLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";
import { fetchWithTimeout } from "./fetchWithTimeout";
import { notifyLuxuryAccountClosed } from "./accountClosedSession";
import { notifyLuxurySessionExpired } from "./luxurySessionExpired";

export type ApiFetchInit = RequestInit & { accessToken?: string | null; _retriedAfterRefresh?: boolean };

export async function apiFetch(path: string, init?: ApiFetchInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (init?.accessToken) {
    headers.set("Authorization", `Bearer ${init.accessToken}`);
  }
  if (init?.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (typeof window !== "undefined" && isLuxuryNativeAppShell() && !headers.has("X-Luxury-Frontend-Origin")) {
    headers.set("X-Luxury-Frontend-Origin", window.location.origin);
  }
  const response = await fetchWithTimeout(apiUrl(path), {
    ...init,
    headers,
    credentials: init?.credentials ?? (path.startsWith("/api/v1/auth/") ? "include" : "same-origin"),
  });
  if (
    init?.accessToken &&
    !init._retriedAfterRefresh &&
    !path.startsWith("/api/v1/auth/") &&
    (response.status === 401 ||
      (response.status === 403 && path === "/api/v1/me/profile"))
  ) {
    let nextToken = await refreshLuxuryAccessToken();
    if (!nextToken && path.startsWith("/api/v1/admin/")) {
      nextToken = await refreshAdminAccessToken();
      if (nextToken) {
        writeAdminAccessToken(nextToken);
      }
    }
    if (nextToken) {
      return apiFetch(path, {
        ...init,
        accessToken: nextToken,
        _retriedAfterRefresh: true,
      });
    }
  }
  return response;
}

function apiFailureMessage(status: number, text: string, statusText: string): string {
  const raw = (text || statusText).trim();
  if (status >= 500 && (raw.startsWith("<") || raw.length > 800)) {
    return `Risposta non valida dall’API (${status}). Spesso Spring non è raggiungibile dal proxy Vite: avvia il backend su 8081 e verifica che le richieste vadano a http://127.0.0.1:8081 (vedi vite.config.ts → proxy /api).`;
  }
  return raw || statusText;
}

export async function apiJson<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const r = await apiFetch(path, init);
  const text = await r.text();
  if (!r.ok) {
    let msg: string;
    try {
      const j = JSON.parse(text) as {
        code?: string;
        message?: string;
        /** Spring Boot ProblemDetails / RFC 7807 */
        detail?: string;
        title?: string;
        details?: { fields?: Record<string, string> };
      };
      if (r.status === 410 && j?.code === "ACCOUNT_CLOSED") {
        notifyLuxuryAccountClosed();
      }
      if (r.status === 401 && init?.accessToken) {
        notifyLuxurySessionExpired();
      }
      if (typeof j?.message === "string" && j.message.trim().length > 0) {
        msg = j.message.trim();
      } else if (typeof j?.detail === "string" && j.detail.trim().length > 0) {
        msg = j.detail.trim();
      } else if (typeof j?.title === "string" && j.title.trim().length > 0) {
        msg = j.title.trim();
      } else {
        msg = apiFailureMessage(r.status, text, r.statusText);
      }
      const fields = j.details?.fields;
      if (fields && typeof fields === "object") {
        const parts = Object.entries(fields)
          .map(([k, v]) => (typeof v === "string" && v.trim() ? `${k}: ${v.trim()}` : null))
          .filter((x): x is string => Boolean(x));
        if (parts.length > 0) {
          msg = `${msg} (${parts.join(" · ")})`;
        }
      }
    }
    catch {
      msg = apiFailureMessage(r.status, text, r.statusText);
    }
    throw new Error(msg);
  }
  if (r.status === 204 || !text) return undefined as T;
  return JSON.parse(text) as T;
}
