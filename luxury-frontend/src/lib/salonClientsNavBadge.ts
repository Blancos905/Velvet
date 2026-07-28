const KEY_PREFIX = "luxury.salonClients.lastSeenCount.";

/** Conteggio clienti visto l’ultima volta in pagina Clienti; `null` = mai sincronizzato (nessun badge finché non aprono Clienti almeno una volta). */
export function readSalonClientsLastSeenCount(locationId: string): number | null {
  if (typeof window === "undefined" || !locationId) return null;
  const raw = window.localStorage.getItem(KEY_PREFIX + locationId);
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function writeSalonClientsLastSeenCount(locationId: string, count: number): void {
  if (typeof window === "undefined" || !locationId) return;
  const n = Math.max(0, Math.floor(count));
  window.localStorage.setItem(KEY_PREFIX + locationId, String(n));
}

/** Nuovi clienti rispetto all’ultima visita alla pagina Clienti (delta sulla lista API). */
export function computeNewSalonClientsBadge(currentCount: number, lastSeenCount: number | null): number {
  if (lastSeenCount === null) return 0;
  return Math.max(0, currentCount - lastSeenCount);
}
