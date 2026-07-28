/**
 * Endpoint `GET .../chat/inbox-summaries` assente (404): dopo il primo 404 non rifacciamo richieste
 * nella stessa sessione JS (evita spam in console da invalidateQueries).
 * Un refresh completo della pagina azzera il flag e ritenta (utile dopo deploy backend).
 */
let inboxSummariesEndpoint404 = false;

export function isSalonChatInboxSummaries404(): boolean {
  return inboxSummariesEndpoint404;
}

export function markSalonChatInboxSummaries404(): void {
  inboxSummariesEndpoint404 = true;
}

export function clearSalonChatInboxSummaries404(): void {
  inboxSummariesEndpoint404 = false;
}
