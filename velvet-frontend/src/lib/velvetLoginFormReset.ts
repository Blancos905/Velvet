/** Segnala al form «Accedi» di svuotare i campi (logout, scadenza sessione, logout WebView nativa). */
export const VELVET_CLEAR_LOGIN_FORM_KEY = "velvet_clear_login_on_next_login_form";

export const VELVET_SESSION_ENDED_EVENT = "velvet-session-ended";

export function markVelvetLoginFormForReset(): void {
  try {
    sessionStorage.setItem(VELVET_CLEAR_LOGIN_FORM_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function notifyVelvetSessionEnded(): void {
  markVelvetLoginFormForReset();
  try {
    window.dispatchEvent(new Event(VELVET_SESSION_ENDED_EVENT));
  } catch {
    /* ignore */
  }
}

/** Svuota campi login dopo il mount per contrastare l'autofill del browser post-logout. */
export function scheduleVelvetLoginFormDomClear(onClear: () => void): void {
  const run = () => onClear();
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(run));
  } else {
    window.setTimeout(run, 0);
  }
}
