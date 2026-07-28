/** Stesso browser, tab diverse: il titolare vede subito il badge «Clienti» dopo «Diventa cliente» in un’altra scheda. */
const CHANNEL = "luxury.catalogClients";

export function notifySalonCatalogClientsChanged(): void {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage({ type: "invalidate" as const });
    ch.close();
  } catch {
    /* ignore */
  }
}

export function subscribeSalonCatalogClientsInvalidate(onInvalidate: () => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = () => onInvalidate();
    return () => ch.close();
  } catch {
    return () => {};
  }
}
