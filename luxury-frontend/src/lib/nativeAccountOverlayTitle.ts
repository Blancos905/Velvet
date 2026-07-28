const NATIVE_ACCOUNT_OVERLAY_TITLES: Record<string, string> = {
  "/account/home": "Panoramica salone",
  "/account/staff": "Area operatore",
  "/account/staff/agenda": "La mia agenda",
  "/account/salone": "Il mio salone",
  "/account/salone/panoramica": "Panoramica",
  "/account/prenotazioni": "Prenotazioni",
  "/account/profilo": "Informazioni",
  "/account/notifiche": "Notifiche",
  "/account/chat": "Chat",
  "/account/preferiti": "Preferiti",
  "/account/saloni-di-fiducia": "Saloni di fiducia",
  "/account/assistenza": "Assistenza",
  "/account/info-privacy": "Info e privacy",
  "/account/feedback-luxury": "Recensioni",
  "/account/salone/servizi": "Servizi",
  "/account/salone/staff": "Staff",
  "/account/salone/clienti": "Clienti",
  "/account/salone/brand": "Brand",
  "/account/salone/tuo-salone": "Il tuo salone",
  "/account/salone/strumenti": "Strumenti",
  "/account/salone/statistiche": "Statistiche",
  "/account/salone/posizione": "Posizione salone",
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
