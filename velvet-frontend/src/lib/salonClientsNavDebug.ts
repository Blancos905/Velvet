/** In console: localStorage.setItem('velvet.debug.clienti','1') poi ricarica account. */
export const SALON_CLIENTS_NAV_DEBUG_KEY = "velvet.debug.clienti";

export function readSalonClientsNavDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SALON_CLIENTS_NAV_DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}
