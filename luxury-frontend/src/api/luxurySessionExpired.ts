/**
 * Chiamata quando la sessione JWT non è più valida (scadenza 24h o 401 API).
 * Consente di invalidare token in sessionStorage senza dipendere da React hooks.
 */
type SessionExpiredHandler = () => void;

let handler: SessionExpiredHandler | null = null;

export function setLuxurySessionExpiredHandler(h: SessionExpiredHandler | null) {
  handler = h;
}

export function notifyLuxurySessionExpired() {
  try {
    handler?.();
  } catch {
    /* evita crash se handler fallisce */
  }
}
