import { clearPostLoginReturnPath } from "./postLoginReturnPath";
import { markVelvetLoginFormForReset } from "./velvetLoginFormReset";

/** Destinazione post-logout: vetrina ricerca pubblica («Trova il tuo salone»). */
export const VELVET_POST_LOGOUT_PATH = "/";

export function redirectAfterVelvetLogout(): void {
  markVelvetLoginFormForReset();
  clearPostLoginReturnPath();
  try {
    const pathOnly = window.location.pathname.split("#")[0]?.split("?")[0] ?? "";
    if (pathOnly === VELVET_POST_LOGOUT_PATH) return;
    window.location.replace(VELVET_POST_LOGOUT_PATH);
  } catch {
    window.location.href = VELVET_POST_LOGOUT_PATH;
  }
}
