import { legalEntitySummaryParagraph } from "./legalEntity";
import {
  LEGAL_MINORS_PARAGRAPH,
  LEGAL_PREMIUM_PROMOTIONAL_TRIAL_PARAGRAPH,
  LEGAL_PREMIUM_SUBSCRIPTION_ACTIVATION_PARAGRAPH,
  LEGAL_PREMIUM_SUBSCRIPTION_CANCELLATION_PARAGRAPH,
  LEGAL_PROCESSING_ROLES_PARAGRAPH,
  LEGAL_REVIEW_MODERATION_PARAGRAPH,
  LEGAL_UPDATED_AT,
} from "./legalSharedCopy";
import { GDPR_CITATIONS, LEGAL_CONTACT_EMAIL, STORE_LEGAL_CITATIONS } from "./legalReferences";
import type { LegalDocumentSection } from "../pages/legal/LegalDocumentLayout";

export const TERMS_OF_SERVICE_DOCUMENT = {
  title: "Termini di servizio",
  subtitle: "Condizioni d’uso della piattaforma Saloni Luxury per clienti, saloni partner e operatori.",
  updatedAt: LEGAL_UPDATED_AT,
  storeRequirements: [STORE_LEGAL_CITATIONS.googleUserData, STORE_LEGAL_CITATIONS.applePrivacyDetails],
  sections: [
    {
      heading: "1. Titolare e oggetto",
      paragraphs: [
        legalEntitySummaryParagraph(),
        "I presenti termini regolano l’accesso e l’uso di Saloni Luxury (sito, area account e applicazioni collegate) per ricerca saloni, prenotazioni, gestione attività partner e funzioni Premium.",
      ],
      citations: [GDPR_CITATIONS.art13],
    },
    {
      heading: "2. Account e registrazione",
      paragraphs: [
        "L’utente deve fornire dati veritieri e mantenerli aggiornati. È responsabile della riservatezza delle credenziali e delle attività svolte tramite il proprio account.",
        "La registrazione richiede l’accettazione dell’informativa privacy e dei presenti termini prima della creazione dell’account.",
        LEGAL_MINORS_PARAGRAPH,
      ],
      citations: [GDPR_CITATIONS.art13],
    },
    {
      heading: "3. Ruoli salone e clienti",
      paragraphs: [
        "Il salone partner è responsabile dei contenuti pubblicati, dei dati dei propri clienti trattati nell’ambito dell’attività e del rispetto delle norme applicabili al proprio settore.",
        "Il cliente utilizza Luxury per cercare saloni, prenotare e, ove attivo, comunicare con il salone secondo le funzioni disponibili.",
      ],
    },
    {
      heading: "4. Piani e funzioni",
      paragraphs: [
        "Le funzioni disponibili dipendono dal piano Premium e dallo stato dell’account. Il piano commerciale per i titolari è Premium; chat, vetrina pubblica e statistiche sono attive solo con abbonamento Premium attivo.",
        "L’uso del sito e dell’app da parte dei clienti è coperto dalla licenza gratuita d’uso pubblicata su /licenza. Quella licenza non sostituisce il piano Premium dei titolari.",
        "Il piano Premium consente funzioni aggiuntive (brand, vetrina, statistiche, pannello web completo e altre leve descritte nella pagina Piani). I dettagli commerciali e tecnici possono evolvere nel tempo: in caso di modifiche rilevanti per gli abbonamenti a pagamento, Saloni Luxury ne dà comunicazione con congruo preavviso ove richiesto dalla legge applicabile.",
        "Alcune integrazioni o personalizzazioni possono richiedere accordi aggiuntivi con Saloni Luxury.",
      ],
    },
    {
      heading: "5. Prova gratuita Premium",
      paragraphs: [
        LEGAL_PREMIUM_PROMOTIONAL_TRIAL_PARAGRAPH,
        "Saloni Luxury può inviarti comunicazioni di servizio relative alla scadenza della prova e alla gestione dell’abbonamento.",
      ],
    },
    {
      heading: "6. Abbonamento Premium a pagamento",
      paragraphs: [
        LEGAL_PREMIUM_SUBSCRIPTION_ACTIVATION_PARAGRAPH,
        "I pagamenti sono gestiti tramite Stripe. Accettando l’attivazione dell’abbonamento a pagamento dichiari di aver letto l’informativa privacy e di fornire dati di fatturazione veritieri e aggiornati.",
        "Saloni Luxury può sospendere o limitare l’accesso Premium in caso di mancato pagamento, chargeback, uso illecito o violazione dei presenti termini, nei limiti di legge.",
      ],
    },
    {
      heading: "7. Disdetta e cessazione Premium",
      paragraphs: [LEGAL_PREMIUM_SUBSCRIPTION_CANCELLATION_PARAGRAPH],
    },
    {
      heading: "8. Rapporto salone–piattaforma (Art. 28 GDPR)",
      paragraphs: [
        LEGAL_PROCESSING_ROLES_PARAGRAPH,
        "Il salone partner è responsabile delle istruzioni impartite a Saloni Luxury sul trattamento dei dati dei propri clienti nell’ambito del gestionale (agenda, anagrafica, prenotazioni). Saloni Luxury tratta tali dati esclusivamente per erogare il servizio contrattualmente concordato.",
      ],
      citations: [GDPR_CITATIONS.art13],
    },
    {
      heading: "9. Uso lecito e contenuti",
      paragraphs: [
        "È vietato un uso illecito, fraudolento o lesivo di terzi, incluso l’invio di contenuti illeciti, spam o dati non autorizzati. Saloni Luxury può sospendere o chiudere account in caso di violazioni gravi o ripetute.",
        LEGAL_REVIEW_MODERATION_PARAGRAPH,
        "Per segnalazioni urgenti puoi anche usare l’area Assistenza dopo il login.",
      ],
    },
    {
      heading: "10. Proprietà intellettuale",
      paragraphs: [
        "Marchi, software, layout e materiali della piattaforma restano di titolarità di Saloni Luxury o dei rispettivi licenzianti. I contenuti caricati dal salone restano di competenza del salone, che concede a Saloni Luxury le licenze necessarie a pubblicarli e erogare il servizio.",
      ],
    },
    {
      heading: "11. Limitazione di responsabilità",
      paragraphs: [
        "Il servizio è fornito nei limiti delle funzionalità tecniche e contrattuali concordate. Saloni Luxury non risponde di disservizi imputabili a terze parti (es. mappe, connettività) né dell’operato autonomo del salone verso i propri clienti, nei limiti consentiti dalla legge applicabile.",
      ],
    },
    {
      heading: "12. Chiusura account",
      paragraphs: [
        "L’utente può richiedere la chiusura dell’account dalla pagina Elimina account, dalle impostazioni profilo o contattando " +
          LEGAL_CONTACT_EMAIL +
          ". La chiusura comporta l’interruzione dell’accesso, la revoca delle sessioni e l’anonimizzazione del profilo secondo l’informativa privacy; alcuni contenuti storici (es. recensioni) possono restare in forma non identificabile.",
      ],
      citations: [GDPR_CITATIONS.art17],
    },
    {
      heading: "13. Legge applicabile e foro",
      paragraphs: [
        "I presenti termini sono regolati dalla legge italiana. I titolari salone partner si registrano in qualità di professionisti o imprese (rapporto B2B); restano salvi i diritti inderogabili del consumatore ove la normativa applicabile qualifichi l’utente come consumatore. Per ogni controversia è competente il foro del luogo di residenza o domicilio del consumatore, se previsto dalla normativa a tutela dei consumatori.",
      ],
    },
    {
      heading: "14. Contatti",
      paragraphs: ["Per informazioni sui termini: " + LEGAL_CONTACT_EMAIL + "."],
    },
  ] satisfies LegalDocumentSection[],
};
