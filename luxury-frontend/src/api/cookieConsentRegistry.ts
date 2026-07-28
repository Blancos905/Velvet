import { LUXURY_ACCESS_TOKEN_KEY } from "../auth/adminSession";
import { apiUrl } from "../config/env";
import { LEGAL_DOCUMENT_VERSION } from "../content/legalEntity";

export type CookieConsentRegistryAction = "accept_all" | "reject_non_essential" | "custom";

export type CookieConsentRegistryPayload = {
  visitorId: string;
  version: 2;
  decidedAt: string;
  action: CookieConsentRegistryAction;
  maps: boolean;
  editorial: boolean;
  policyVersion: string;
};

/** UUID anonimo persistente per collegare eventi consenso dello stesso browser. */
export const COOKIE_VISITOR_ID_STORAGE_KEY = "luxury.cookie-visitor-id";

export function getOrCreateCookieVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(COOKIE_VISITOR_ID_STORAGE_KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) {
      return existing;
    }
    const created = crypto.randomUUID();
    window.localStorage.setItem(COOKIE_VISITOR_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return "";
  }
}

/**
 * Registra la scelta cookie lato server (fire-and-forget).
 * Non blocca l'UX se il backend non risponde.
 */
export function recordCookieConsentOnServer(payload: CookieConsentRegistryPayload): void {
  if (typeof window === "undefined" || !payload.visitorId) return;

  const accessToken =
    typeof sessionStorage !== "undefined" ? sessionStorage.getItem(LUXURY_ACCESS_TOKEN_KEY) : null;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  void fetch(apiUrl("/api/v1/public/cookie-consent"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...payload,
      policyVersion: payload.policyVersion || LEGAL_DOCUMENT_VERSION,
    }),
    keepalive: true,
  }).catch(() => {
    /* registro best-effort: localStorage resta fonte operativa */
  });
}
