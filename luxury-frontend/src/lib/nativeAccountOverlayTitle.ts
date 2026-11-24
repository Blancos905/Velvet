const NATIVE_ACCOUNT_OVERLAY_TITLES: Record<string, string> = {
  "/account/home": "Panoramica salone",
  "/account/staff": "Area operatore",
  "/account/staff/agenda": "La mia agenda",
  "/salone": "Il mio salone",
  "/salone/panoramica": "Panoramica",
  "/account/prenotazioni": "Prenotazioni",
  "/account/profilo": "Informazioni",
  "/account/notifiche": "Notifiche",
  "/account/chat": "Chat",
  "/account/preferiti": "Preferiti",
  "/account/saloni-di-fiducia": "Saloni di fiducia",
  "/account/assistenza": "Assistenza",
  "/account/info-privacy": "Info e privacy",
  "/account/feedback-luxury": "Recensioni",
  "/salone/servizi": "Servizi",
  "/salone/staff": "Staff",
  "/salone/clienti": "Clienti",
  "/salone/brand": "Brand",
  "/salone/anteprima": "Anteprima vetrina",
  "/salone/tuo-salone": "Il tuo salone",
  "/salone/strumenti": "Strumenti",
  "/salone/statistiche": "Statistiche",
  "/salone/posizione": "Posizione salone",
};

/** Titolo barra overlay account in app mobile (WebView). */
export function nativeAccountOverlayTitle(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (NATIVE_ACCOUNT_OVERLAY_TITLES[normalized]) {
    return NATIVE_ACCOUNT_OVERLAY_TITLES[normalized];
  }
  const detail = normalized.match(/^\/account\/prenotazioni\/([^/]+)$/);
  if (detail) return "Dettaglio prenotazione";
  const staffAgenda = normalized.match(/^\/account\/prenotazioni\/staff\/([^/]+)\/agenda$/);
  if (staffAgenda) return "Agenda operatore";
  const segment = normalized.split("/").filter(Boolean).pop();
  if (!segment) return "Account";
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
