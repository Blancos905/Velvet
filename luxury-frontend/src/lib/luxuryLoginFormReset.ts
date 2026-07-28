/** Segnala al form «Accedi» di svuotare i campi (logout, scadenza sessione, logout WebView nativa). */
export const LUXURY_CLEAR_LOGIN_FORM_KEY = "luxury_clear_login_on_next_login_form";

export const LUXURY_SESSION_ENDED_EVENT = "luxury-session-ended";

export function markLuxuryLoginFormForReset(): void {
  try {
    sessionStorage.setItem(LUXURY_CLEAR_LOGIN_FORM_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function notifyLuxurySessionEnded(): void {
  markLuxuryLoginFormForReset();
  try {
    window.dispatchEvent(new Event(LUXURY_SESSION_ENDED_EVENT));
  } catch {
    /* ignore */
  }
}

/** Svuota campi login dopo il mount per contrastare l'autofill del browser post-logout. */
export function scheduleLuxuryLoginFormDomClear(onClear: () => void): void {
  const run = () => onClear();
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(run));
  } else {
    window.setTimeout(run, 0);
  }
}
