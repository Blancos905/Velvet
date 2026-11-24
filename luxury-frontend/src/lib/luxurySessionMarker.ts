/**
 * Segnale di sessione condiviso fra le tre origini.
 * Il refresh token resta nel cookie httpOnly. Qui c'è solo un identificatore opaco:
 * se manca, un'altra superficie ha chiuso la sessione; se non coincide con quello
 * salvato in questo tab, va rinnovato l'access token da cookie.
 */

export const LUXURY_SESSION_MARKER_COOKIE = "luxury_session";
export const LUXURY_SESSION_EPOCH_KEY = "luxury_session_epoch";

export type SessionBootAction = "keep" | "clear" | "restore";

export function readSessionMarker(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${LUXURY_SESSION_MARKER_COOKIE}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(prefix)) continue;
    const value = decodeURIComponent(trimmed.slice(prefix.length)).trim();
    return value || undefined;
  }
  return undefined;
}

export function readStoredEpoch(): string | undefined {
  if (typeof sessionStorage === "undefined") return undefined;
  const raw = sessionStorage.getItem(LUXURY_SESSION_EPOCH_KEY);
  return raw && raw.trim() ? raw.trim() : undefined;
}

export function rememberSessionEpoch(): void {
  if (typeof sessionStorage === "undefined") return;
  const marker = readSessionMarker();
  if (!marker) return;
  sessionStorage.setItem(LUXURY_SESSION_EPOCH_KEY, marker);
}

export function clearStoredEpoch(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(LUXURY_SESSION_EPOCH_KEY);
}

/** Il cookie non è httpOnly: la chiusura sessione deve toglierlo anche senza risposta di logout. */
export function clearSessionMarkerCookie(): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const base = `${LUXURY_SESSION_MARKER_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict`;
  document.cookie = base;
  const apex = window.location.hostname.toLowerCase().replace(/^(www|salone|admin)\./, "");
  if (apex.includes(".")) {
    document.cookie = `${base}; Domain=${apex}`;
  }
}

export function sessionBootAction(
  marker: string | undefined,
  epoch: string | undefined,
  hasUsableAccessToken: boolean,
): SessionBootAction {
  if (!marker && epoch) return "clear";
  if (marker && (!hasUsableAccessToken || epoch !== marker)) return "restore";
  return "keep";
}
