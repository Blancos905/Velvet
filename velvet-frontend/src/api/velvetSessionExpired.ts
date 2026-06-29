/**
 * Chiamata quando la sessione JWT non è più valida (scadenza 24h o 401 API).
 * Consente di invalidare token in sessionStorage senza dipendere da React hooks.
 */
type SessionExpiredHandler = () => void;

let handler: SessionExpiredHandler | null = null;

export function setVelvetSessionExpiredHandler(h: SessionExpiredHandler | null) {
  handler = h;
}

export function notifyVelvetSessionExpired() {
  try {
    handler?.();
  } catch {
    /* evita crash se handler fallisce */
  }
}
