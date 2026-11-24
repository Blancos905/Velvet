import type { LuxurySurface } from "./luxurySurfaces";

const PUBLIC_SURFACE_RELEASED_KEY = "luxury_public_surface_released";

/**
 * Questa scheda della home di ricerca ha già aperto il pannello.
 * Non rinnova la sessione condivisa: la home resta quella di ricerca
 * e il pannello, sull'altra origine, tiene il cookie.
 */
export function markPublicSurfaceSessionReleased(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PUBLIC_SURFACE_RELEASED_KEY, "1");
}

export function clearPublicSurfaceSessionReleased(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(PUBLIC_SURFACE_RELEASED_KEY);
}

export function isPublicSurfaceSessionReleased(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(PUBLIC_SURFACE_RELEASED_KEY) === "1";
}

export function shouldSkipSharedSessionRestore(surface: LuxurySurface, released: boolean): boolean {
  return surface === "public" && released;
}
