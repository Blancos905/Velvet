/**
 * Testi allineati a `SalonPremiumPanorama` (panoramica salone Premium in account).
 * Fonte unica per partner pubblico e componente panoramica.
 */

export type SalonPremiumPanoramaFeatureContent = {
  text: string;
  detail: string;
  cta?: { title: string; to: string; desc?: string };
};

export type SalonPremiumPanoramaStepContent = {
  id: string;
  text: string;
  actionLabel: string;
  to: string;
};

/** Sottotitolo card piano nella panoramica (Premium). */
export const SALON_PREMIUM_PANORAMA_PLAN_SUBLINE =
  "Vetrina e ricerca per zona, notifiche, staff e statistiche con report PDF.";

/** Stesse 4 aree della sezione «Cosa include il Premium» in panoramica. */
export const SALON_PREMIUM_PANORAMA_FEATURES: readonly SalonPremiumPanoramaFeatureContent[] = [
  {
    text: "Brand, layout catalogo, contenuti del sito e ricerca geolocalizzata.",
    detail:
      "Logo e immagini in Brand e vetrina; scelta del template, colori e tipografia. Testi e galleria in Crea il tuo sito per la scheda /s/… e la pagina «Esplora il nostro salone». Con sede e indirizzo impostati in Posizione, il salone compare anche nella ricerca pubblica per zona e mappa.",
    cta: {
      title: "Brand e vetrina",
      to: "/salone/brand",
      desc: "Logo, carousel e layout dal catalogo.",
    },
  },
  {
    text: "Notifiche su prenotazioni e messaggi di servizio.",
    detail:
      "Conferme e aggiornamenti legati alle prenotazioni tramite email. Il centro notifiche riassume invii e code; in questa versione dell’app non sono gestiti SMS lato salone.",
    cta: {
      title: "Centro notifiche",
      to: "/salone/strumenti",
      desc: "Conteggi e messaggi inviati.",
    },
  },
  {
    text: "Staff, servizi, clienti e agenda per operatore.",
    detail:
      "Catalogo servizi e listini da Aggiungi servizi; team e foto operatori con link alla propria agenda. Anagrafica clienti della sede dal menu Account.",
    cta: {
      title: "Staff",
      to: "/salone/staff",
      desc: "Operatori e link alle agende.",
    },
  },
  {
    text: "Statistiche con ricavo stimato e report PDF semestrale.",
    detail:
      "Andamento prenotazioni, incasso stimato dai prezzi servizio in app, servizi più richiesti. In Statistiche puoi scaricare un PDF semestrale riepilogativo (supporto interno; non è documento fiscale ufficiale).",
    cta: {
      title: "Statistiche",
      to: "/salone/statistiche",
      desc: "Trend, KPI e report PDF.",
    },
  },
];

/** Checklist «Da fare ora» della panoramica. */
export const SALON_PREMIUM_PANORAMA_STEPS: readonly SalonPremiumPanoramaStepContent[] = [
  { id: "s1", text: "Carica logo e foto.", actionLabel: "Brand", to: "/salone/brand" },
  { id: "s2", text: "Completa testi e galleria del sito pubblico.", actionLabel: "Crea il sito", to: "/salone/tuo-salone" },
  { id: "s3", text: "Verifica indirizzo e posizione sulla mappa.", actionLabel: "Posizione", to: "/salone/posizione" },
  { id: "s4", text: "Servizi in listino e team con agenda.", actionLabel: "Servizi", to: "/salone/servizi" },
  { id: "s5", text: "Controlla trend e (se serve) report PDF semestrale.", actionLabel: "Statistiche", to: "/salone/statistiche" },
];
