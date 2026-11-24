/**
 * Piano commerciale Luxury: solo `PREMIUM`.
 * `BASE` resta lo stato tecnico «non entitled» (downgrade Stripe e saloni già in DB), non un piano vendibile.
 * Valori legacy `STANDARD` e `FULL` in JWT o DB vengono letti come `PREMIUM`.
 */
export type SalonPlanTier = "BASE" | "PREMIUM" | "PLUS";

export const SALON_PLAN_STORAGE_KEY = "luxury_intended_salon_plan";

/** Normalizza claim JWT / valore salvato in sessione (registrazione da `/piani`). */
export function parseSalonPlanTier(raw: string | null | undefined): SalonPlanTier | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const u = raw.trim().toUpperCase();
  if (u === "BASE") return "BASE";
  if (u === "PREMIUM" || u === "STANDARD" || u === "FULL") return "PREMIUM";
  if (u === "PLUS") return "PLUS";
  return undefined;
}

/** Piano commerciale che sblocca il salone. Premium resta il ramo già in uso; Plus è lo stesso accesso più la vetrina sponsorizzata. */
export function isEntitledSalonPlan(tier: SalonPlanTier | null | undefined): boolean {
  return tier === "PREMIUM" || tier === "PLUS";
}

/** Etichetta mostrata in interfaccia. `BASE` non è un piano: è l’assenza di Premium. */
export const planDisplayName = (tier: SalonPlanTier): string => {
  switch (tier) {
    case "BASE":
      return "Senza Premium";
    case "PREMIUM":
      return "Premium";
    case "PLUS":
      return "Plus";
    default:
      return tier;
  }
};

export type SalonPlanTaglineContent = {
  /** Frase di apertura sopra le pillole. */
  lead: string;
  /** Evidenze in pillole (brand, sito, …). */
  highlights: readonly string[];
};

/** Testo piano per contesti che richiedono una stringa (meta, aria, home salone). */
export function salonPlanTaglinePlain({ lead, highlights }: SalonPlanTaglineContent): string {
  return `${lead}: ${highlights.join(", ")}.`;
}

export type SalonPlanDefinition = {
  tier: SalonPlanTier;
  tagline: string;
  taglineContent: SalonPlanTaglineContent;
  /** Testo breve per accessibilità e contesto (es. «15 € al mese»). */
  priceHint: string;
  /** Se valorizzato, la UI mostra importo grande + periodo (solo CSS/markup). */
  priceValue?: string;
  pricePeriod?: string;
  features: string[];
  highlighted?: boolean;
};

/** Checklist titolare post-registrazione — piano Premium (brand self-service, catalogo template, leve avanzate da contratto). */
export const SALON_OWNER_PREMIUM_CHECKLIST: readonly string[] = [
  "Carica logo e immagini in Brand e vetrina e completa i testi in Crea il tuo sito: così la scheda `/s/…` e la pagina Esplora raccontano il salone con la tua identità.",
  "Scegli un impaginato dal catalogo layout e allinea colori e tipografia al tuo brand.",
  "Consulta Notifiche e Statistiche per prenotazioni, promemoria e andamento incassi nel mese.",
  "Usa Servizi e Staff con i margini operativi del Premium (multi-operatore e funzioni del piano).",
  "Serve un layout dedicato o un’integrazione esterna? Concorda il progetto con il team Luxury.",
];

/** Giorni di prova gratuita Premium (UI e comunicazione commerciale). */
export const SALON_PREMIUM_TRIAL_DAYS = 30;

export function premiumTrialFreeLabel(): string {
  return `${SALON_PREMIUM_TRIAL_DAYS} giorni gratis`;
}

export function premiumTrialDurationLabel(): string {
  return `${SALON_PREMIUM_TRIAL_DAYS} giorni`;
}

export function premiumTrialIntroPhrase(): string {
  return `Per i primi ${SALON_PREMIUM_TRIAL_DAYS} giorni`;
}

export function premiumTrialEndPhrase(): string {
  return `Al termine dei ${SALON_PREMIUM_TRIAL_DAYS} giorni`;
}

export function premiumTrialGrantedPhrase(): string {
  return `hai ${SALON_PREMIUM_TRIAL_DAYS} giorni di prova gratuita`;
}

export function premiumTrialCheckoutAriaLabel(priceHint: string): string {
  return `0 euro per ${SALON_PREMIUM_TRIAL_DAYS} giorni, poi ${priceHint}`;
}

/** Riga prezzo post-prova nella card Premium (es. «Dopo la prova: 40 € al mese»). */
export function premiumTrialPostTrialPriceLine(priceValue: string, pricePeriod: string): string {
  return `Dopo la prova: ${priceValue} € ${pricePeriod}`;
}

export const SALON_PREMIUM_TRIAL_POST_TRIAL_SUFFIX = "disdici quando vuoi";

/** Nessun addebito durante la prova; Stripe solo a fine prova. */
export function premiumTrialNoPaymentNote(): string {
  return `Per ${SALON_PREMIUM_TRIAL_DAYS} giorni nessun addebito. Il pagamento Stripe si attiva al termine della prova.`;
}

/** Badge nel box «Email confermata» prima del checkout Premium. */
export function premiumTrialPostEmailConfirmBadge(): string {
  return `Email verificata — ${SALON_PREMIUM_TRIAL_DAYS} giorni di prova senza addebiti`;
}

/** Messaggio nel box «Email confermata» prima del checkout Premium. */
export function premiumTrialPostEmailConfirmLead(): string {
  return `I tuoi dati sono salvati. Il salone Premium è attivo (${premiumTrialFreeLabel()}). ${premiumTrialEndPhrase()} l'abbonamento si rinnova su Stripe (${SALON_PREMIUM_TRIAL_POST_TRIAL_SUFFIX}).`;
}

/** CTA verso Stripe dopo conferma email titolare Premium. */
export function premiumTrialCheckoutCtaLabel(): string {
  return "Conferma metodo di pagamento";
}

/** Passo 3 nel box «Controlla la tua email» (registrazione Premium). */
export function premiumTrialEmailConfirmNextStep(): string {
  return `Dopo la conferma attivi Premium con ${premiumTrialFreeLabel()} (pagamento sicuro, nessun addebito oggi)`;
}

/** Giorni dopo il blocco profilo post-disdetta Premium, prima della cancellazione account. */
export const SALON_PREMIUM_ACCOUNT_DELETION_DAYS_AFTER_BLOCK = 30;

const SALON_PREMIUM_TAGLINE: SalonPlanTaglineContent = {
  lead: "Per distinguerti online e gestire con metodo",
  highlights: ["Brand personalizzato", "Sito del salone", "Statistiche", "Pannello web completo"],
};

const SALON_PREMIUM_FEATURES = [
  "Scheda pubblica `/s/…` più pagina «Esplora il nostro salone» e contenuti da Crea il tuo sito: testi, gallery e messaggio coerente con il brand; con sede impostata, visibilità in ricerca geolocalizzata e mappa.",
  "Brand e vetrina: logo, immagini carousel, scelta di layout dal catalogo Luxury e personalizzazione colori/tipografia.",
  "Notifiche (prenotazioni e messaggi di servizio) e Statistiche su appuntamenti, incasso stimato, servizi più richiesti e report PDF semestrale informativo.",
  "Più operatori, agenda per operatore, clienti e servizi (export massivi da concordare se servono).",
  "Integrazioni, API o layout fuori catalogo: da concordare con il team Luxury (non inclusi nel self-service standard).",
];

export const SALON_PLANS: SalonPlanDefinition[] = [
  {
    tier: "PREMIUM",
    taglineContent: SALON_PREMIUM_TAGLINE,
    tagline: salonPlanTaglinePlain(SALON_PREMIUM_TAGLINE),
    priceHint: "40 € al mese",
    priceValue: "40",
    pricePeriod: "al mese",
    highlighted: true,
    features: SALON_PREMIUM_FEATURES,
  },
  {
    tier: "PLUS",
    taglineContent: SALON_PREMIUM_TAGLINE,
    tagline: salonPlanTaglinePlain(SALON_PREMIUM_TAGLINE),
    priceHint: "60 € al mese",
    priceValue: "60",
    pricePeriod: "al mese",
    features: [
      ...SALON_PREMIUM_FEATURES,
      "In più: più visibilità per i clienti e più opportunità di essere scelti.",
    ],
  },
];
