import { markAdPopupPendingAfterLogin } from "./adPopupGate";

/** Durata massima sessione utente dal login (allineata a backend `session-max-hours`). */
export const LUXURY_SESSION_MAX_MS = 24 * 60 * 60 * 1000;

const LUXURY_SESSION_STARTED_AT_KEY = "luxury_session_started_at";

export function markLuxurySessionStartedNow(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(LUXURY_SESSION_STARTED_AT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function clearLuxurySessionStartedAt(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(LUXURY_SESSION_STARTED_AT_KEY);
  } catch {
    /* ignore */
  }
}

export function readLuxurySessionStartedAtMs(): number | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LUXURY_SESSION_STARTED_AT_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function readLuxurySessionExpiresAtMs(): number | null {
  const started = readLuxurySessionStartedAtMs();
  if (started == null) return null;
  return started + LUXURY_SESSION_MAX_MS;
}

export function isLuxuryLoginSessionExpired(nowMs = Date.now()): boolean {
  const expiresAt = readLuxurySessionExpiresAtMs();
  if (expiresAt == null) return false;
  return nowMs >= expiresAt;
}

/** Segna l’inizio sessione autenticata (login, conferma email, impersonazione). */
export function beginLuxuryAuthenticatedSession(): void {
  markLuxurySessionStartedNow();
  markAdPopupPendingAfterLogin();
}
