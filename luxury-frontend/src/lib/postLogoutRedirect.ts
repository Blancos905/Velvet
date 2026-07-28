import { clearPostLoginReturnPath } from "./postLoginReturnPath";
import { markLuxuryLoginFormForReset } from "./luxuryLoginFormReset";

/** Destinazione post-logout: vetrina ricerca pubblica («Trova il tuo salone»). */
export const LUXURY_POST_LOGOUT_PATH = "/";

export function redirectAfterLuxuryLogout(): void {
  markLuxuryLoginFormForReset();
  clearPostLoginReturnPath();
  try {
    const pathOnly = window.location.pathname.split("#")[0]?.split("?")[0] ?? "";
    if (pathOnly === LUXURY_POST_LOGOUT_PATH) return;
    window.location.replace(LUXURY_POST_LOGOUT_PATH);
  } catch {
    window.location.href = LUXURY_POST_LOGOUT_PATH;
  }
}
