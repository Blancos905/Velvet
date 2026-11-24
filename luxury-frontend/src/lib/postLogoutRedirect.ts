import { clearPostLoginReturnPath } from "./postLoginReturnPath";
import { markLuxuryLoginFormForReset } from "./luxuryLoginFormReset";
import { rememberLogoutLoginKind, type SavedLoginAccountKind } from "./luxurySavedLoginCredentials";
import { currentSurface, readSurfaceLocation, urlForSurface, type PanelHandoffKind, type SurfaceLocation } from "./luxurySurfaces";

/** Destinazione del cliente dopo l’uscita: home di ricerca. */
export const LUXURY_POST_LOGOUT_PATH = "/";

/**
 * Dalla home di ricerca si resta sulla home di ricerca.
 * Dal pannello, salone, dipendente e super admin tornano al login di quel pannello.
 */
export function postLogoutDestination(
  kind: PanelHandoffKind | null,
  loc: SurfaceLocation = readSurfaceLocation(),
): string {
  const account: SavedLoginAccountKind = kind ?? "client";
  if (currentSurface(loc) !== "public" && kind) {
    const surface = kind === "admin" ? "admin" : "salon";
    return urlForSurface(surface, "/account", `?account=${account}`, "", loc);
  }
  return urlForSurface("public", LUXURY_POST_LOGOUT_PATH, "", "", loc);
}

/**
 * Il cliente torna alla home di ricerca.
 * Salone, dipendente e super admin, se escono dal loro indirizzo, restano sul login di quel pannello.
 */
export function redirectAfterLuxuryLogout(kind: PanelHandoffKind | null = null): void {
  markLuxuryLoginFormForReset();
  clearPostLoginReturnPath();
  const account: SavedLoginAccountKind = kind ?? "client";
  rememberLogoutLoginKind(account);
  const destination = postLogoutDestination(kind);
  try {
    const here = window.location;
    if (here.href === destination || here.href === `${destination}/`) return;
    window.location.replace(destination);
  } catch {
    window.location.href = destination;
  }
}
