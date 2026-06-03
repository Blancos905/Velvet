/**
 * Chiamata quando l’API segnala account chiuso (410 + code ACCOUNT_CLOSED):
 * invalida sessione JWT lato client senza dipendere da React hooks.
 */
type AccountClosedHandler = () => void;

let handler: AccountClosedHandler | null = null;

export function setVelvetAccountClosedHandler(h: AccountClosedHandler | null) {
  handler = h;
}

export function notifyVelvetAccountClosed() {
  try {
    handler?.();
  } catch {
    /* evita crash se handler fallisce */
  }
}
