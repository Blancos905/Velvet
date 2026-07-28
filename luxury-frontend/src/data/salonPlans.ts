/**
 * Piani commerciali Luxury (codici tecnici allineati a backend / doc).
 * In UI il tier BASE è «Free»; il tier Premium è `PREMIUM`.
 * Valori legacy `STANDARD` e `FULL` in JWT o DB vengono letti come `PREMIUM`.
 */
export type SalonPlanTier = "BASE" | "PREMIUM";

export const SALON_PLAN_STORAGE_KEY = "luxury_intended_salon_plan";

/** Normalizza claim JWT / valore salvato in sessione (registrazione da `/piani`). */
export function parseSalonPlanTier(raw: string | null | undefined): SalonPlanTier | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const u = raw.trim().toUpperCase();
  if (u === "BASE") return "BASE";
  if (u === "PREMIUM" || u === "STANDARD" || u === "FULL") return "PREMIUM";
  return undefined;
}

/** Etichetta mostrata in interfaccia */
export const planDisplayName = (tier: SalonPlanTier): string => {
  switch (tier) {
    case "BASE":
      return "Free";
    case "PREMIUM":
      return "Premium";
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

/** Checklist titolare — piano Free / Base (doc: agenda essenziale, layout preimpostato, export limitati, vetrina testuale). */
export const SALON_OWNER_BASE_CHECKLIST: readonly string[] = [
  "Completa anagrafica e sede da Profilo così la ricerca pubblica e la scheda `/s/…` mostrano dati coerenti (nome da registrazione, niente upload brand in UI).",
  "Usa Agenda per il flusso appuntamenti del giorno; le funzioni avanzate restano nei limiti del piano finché non passi a Premium.",
  "Verifica come ti vede il cliente da Ricerca pubblica: su Free la vetrina segue il layout unico piattaforma.",
  "Quando vuoi logo, foto e catalogo template layout, confronta i piani e passa a Premium.",
];

/** Checklist titolare post-registrazione — piano Premium (brand self-service, catalogo template, leve avanzate da contratto). */
export const SALON_OWNER_PREMIUM_CHECKLIST: readonly string[] = [
  "Carica logo e immagini in Brand e vetrina e completa i testi in Crea il tuo sito: così la scheda `/s/…` e la pagina Esplora raccontano il salone con la tua identità.",
  "Scegli un impaginato dal catalogo layout e allinea colori e tipografia al tuo brand.",
  "Consulta Notifiche e Statistiche per prenotazioni, promemoria e andamento incassi nel mese.",
  "Usa Servizi e Staff con i margini operativi del Premium (multi-operatore e funzioni oltre i limiti del Free).",
  "Serve un layout dedicato o un’integrazione esterna? Concorda il progetto con il team Luxury.",
];

/** Giorni di prova gratuita Premium (UI e comunicazione commerciale). */
export const SALON_PREMIUM_TRIAL_DAYS = 60;

/** Etichetta prezzo piano Free in card e confronti piani. */
export const SALON_FREE_PRICE_HINT = "Gratis";

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

/** Riga prezzo post-prova nella card Premium (es. «Dopo la prova: 20 € al mese»). */
export function premiumTrialPostTrialPriceLine(priceValue: string, pricePeriod: string): string {
  return `Dopo la prova: ${priceValue} € ${pricePeriod}`;
}

export const SALON_PREMIUM_TRIAL_POST_TRIAL_SUFFIX = "disdici quando vuoi";

/** Nessun addebito durante la prova; checkout Stripe dopo la registrazione. */
export function premiumTrialNoPaymentNote(): string {
  return `Per ${SALON_PREMIUM_TRIAL_DAYS} giorni nessun addebito. Dopo la registrazione completa il checkout sicuro su Stripe: oggi non paghi nulla.`;
}

/** Nota breve per hero `/piani`. */
export function premiumTrialLeadFootnote(): string {
  return `${SALON_PREMIUM_TRIAL_DAYS} giorni senza addebiti · checkout sicuro con Stripe`;
}

/** Badge nel box «Email confermata» prima del checkout Premium. */
export function premiumTrialPostEmailConfirmBadge(): string {
  return `Email verificata — ${SALON_PREMIUM_TRIAL_DAYS} giorni di prova senza addebiti`;
}

/** Messaggio nel box «Email confermata» prima del checkout Premium. */
export function premiumTrialPostEmailConfirmLead(): string {
  return `I tuoi dati sono salvati. Per attivare Premium, confermi il metodo di pagamento: oggi non paghi nulla (${premiumTrialFreeLabel()}). ${premiumTrialEndPhrase()} l'abbonamento prosegue al prezzo del piano (${SALON_PREMIUM_TRIAL_POST_TRIAL_SUFFIX}).`;
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

const SALON_BASE_TAGLINE: SalonPlanTaglineContent = {
  lead: "Per iniziare senza costi",
  highlights: ["Agenda essenziale", "Credibilità quotidiana"],
};

const SALON_PREMIUM_TAGLINE: SalonPlanTaglineContent = {
  lead: "Per distinguerti online e gestire con metodo",
  highlights: ["Brand personalizzato", "Sito del salone", "Statistiche", "Pannello web completo"],
};

export const SALON_PLANS: SalonPlanDefinition[] = [
  {
    tier: "BASE",
    taglineContent: SALON_BASE_TAGLINE,
    tagline: salonPlanTaglinePlain(SALON_BASE_TAGLINE),
    priceHint: SALON_FREE_PRICE_HINT,
    features: [
      "Agenda giornaliera e creazione appuntamento guidata",
      "Anagrafica clienti e catalogo servizi",
      "Layout predefinito piattaforma",
    ],
  },
  {
    tier: "PREMIUM",
    taglineContent: SALON_PREMIUM_TAGLINE,
    tagline: salonPlanTaglinePlain(SALON_PREMIUM_TAGLINE),
    priceHint: "20 € al mese",
    priceValue: "20",
    pricePeriod: "al mese",
    highlighted: true,
    features: [
      "Scheda pubblica `/s/…` più pagina «Esplora il nostro salone» e contenuti da Crea il tuo sito: testi, gallery e messaggio coerente con il brand; con sede impostata, visibilità in ricerca geolocalizzata e mappa.",
      "Brand e vetrina: logo, immagini carousel, scelta di layout dal catalogo Luxury e personalizzazione colori/tipografia.",
      "Notifiche (prenotazioni e messaggi di servizio) e Statistiche su appuntamenti, incasso stimato, servizi più richiesti e report PDF semestrale informativo.",
      "Operatività oltre il Free: più operatori, agenda per operatore, clienti e servizi con margini ampliati rispetto al piano base (export massivi da concordare se servono).",
      "Integrazioni, API o layout fuori catalogo: da concordare con il team Luxury (non inclusi nel self-service standard).",
    ],
  },
];
