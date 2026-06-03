import { apiUrl } from "../config/env";
import { refreshVelvetAccessToken } from "../auth/velvetRefreshSession";
import { fetchWithTimeout } from "./fetchWithTimeout";
import { notifyVelvetAccountClosed } from "./accountClosedSession";
import { notifyVelvetSessionExpired } from "./velvetSessionExpired";

export type ApiFetchInit = RequestInit & { accessToken?: string | null; _retriedAfterRefresh?: boolean };

export async function apiFetch(path: string, init?: ApiFetchInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (init?.accessToken) {
    headers.set("Authorization", `Bearer ${init.accessToken}`);
  }
  if (init?.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetchWithTimeout(apiUrl(path), {
    ...init,
    headers,
    credentials: init?.credentials ?? (path.startsWith("/api/v1/auth/") ? "include" : "same-origin"),
  });
  if (
    response.status === 401 &&
    init?.accessToken &&
    !init._retriedAfterRefresh &&
    !path.startsWith("/api/v1/auth/")
  ) {
    const nextToken = await refreshVelvetAccessToken();
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
    return `Risposta non valida dall’API (${status}). Spesso Spring non è raggiungibile dal proxy Vite: avvia il backend su 8080 e verifica che le richieste vadano a http://127.0.0.1:8080 (vedi vite.config.ts → proxy /api).`;
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
        notifyVelvetAccountClosed();
      }
      if (r.status === 401 && init?.accessToken) {
        notifyVelvetSessionExpired();
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
