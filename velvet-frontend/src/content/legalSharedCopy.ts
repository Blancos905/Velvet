import { LEGAL_PRIVACY_EMAIL } from "./legalReferences";
import { SALON_PLANS, SALON_PREMIUM_ACCOUNT_DELETION_DAYS_AFTER_BLOCK, SALON_PREMIUM_TRIAL_MONTHS } from "../data/salonPlans";

/** Data di pubblicazione dei documenti legali (allineare alle pagine pubbliche). */
export const LEGAL_UPDATED_AT = "25 giugno 2026";

/** Versione inviata in registrazione e conservata lato backend quando applicabile. */
export const LEGAL_DOCUMENT_VERSION = "2026-06-25";

const premiumPlan = SALON_PLANS.find((p) => p.tier === "PREMIUM");
const premiumPriceLabel =
  premiumPlan?.priceValue && premiumPlan.pricePeriod
    ? `${premiumPlan.priceValue} € ${premiumPlan.pricePeriod}`
    : "come indicato nella pagina Piani al momento dell’attivazione";

/** Prova gratuita Premium per titolari salone (senza pagamento né dati fiscali obbligatori in registrazione). */
export const LEGAL_PREMIUM_PROMOTIONAL_TRIAL_PARAGRAPH =
  `Il piano Premium per titolari salone partner include una prova gratuita promozionale di ${SALON_PREMIUM_TRIAL_MONTHS} mesi dalla registrazione dell’account Premium, durante la quale non è dovuto alcun corrispettivo e non è richiesto l’inserimento dei dati di fatturazione. Alla scadenza della prova, le funzioni Premium possono essere sospese finché non attivi volontariamente l’abbonamento a pagamento secondo quanto descritto al successivo paragrafo.`;

/** Attivazione abbonamento post-prova, Stripe e assenza di addebiti automatici silenziosi. */
export const LEGAL_PREMIUM_SUBSCRIPTION_ACTIVATION_PARAGRAPH =
  `Al termine della prova gratuita, per continuare a utilizzare le funzioni Premium devi avviare esplicitamente l’attivazione dell’abbonamento dall’area account (messaggio «Vuoi continuare a utilizzare Saloni Luxury?» e pulsante «Procedi»), completare i dati di fatturazione richiesti e — ove i pagamenti siano attivi sulla piattaforma — concludere il checkout sicuro tramite Stripe. L’abbonamento a pagamento non si attiva automaticamente al solo scadere della prova: nessun addebito è effettuato senza tua scelta consapevole. Il prezzo di riferimento dell’abbonamento Premium è ${premiumPriceLabel}, salvo diverse comunicazioni pubblicate su Saloni Luxury prima dell’attivazione.`;

/** Disdetta abbonamento Premium e fine accesso. */
export const LEGAL_PREMIUM_SUBSCRIPTION_CANCELLATION_PARAGRAPH =
  `L’abbonamento Premium a pagamento, una volta attivato, può essere gestito e disdetto tramite il portale clienti Stripe accessibile dall’area account, salvo diverse modalità indicate al momento dell’attivazione. In caso di disdetta a fine periodo già pagato, l’accesso alle funzioni Premium resta attivo fino alla scadenza del periodo in corso, salvo diversa indicazione comunicata al titolare. Trascorsi ulteriori termini contrattuali dalla cessazione dell’abbonamento senza riattivazione, Saloni Luxury può limitare o sospendere l’accesso Premium e, nei casi previsti dai termini e dall’informativa privacy, programmare la cancellazione dell’account dopo un periodo di grazia (attualmente fino a ${SALON_PREMIUM_ACCOUNT_DELETION_DAYS_AFTER_BLOCK} giorni dalla scadenza effettiva, ove applicabile).`;

/** Dati fiscali e di fatturazione del salone partner (privacy B2B). */
export const LEGAL_PREMIUM_BILLING_DATA_PRIVACY_PARAGRAPH =
  "Per l’abbonamento Premium a pagamento raccogliamo i dati di fatturazione del salone partner (intestazione, indirizzo, Partita IVA o codice fiscale, codice destinatario SDI o PEC, email di fatturazione e tipologia soggetto) solo quando avvii volontariamente l’attivazione post-prova o aggiorni il profilo di fatturazione in area account. Tali dati servono all’esecuzione del contratto, all’emissione delle fatture elettroniche verso l’Amministrazione finanziaria ove previsto, alla sincronizzazione con il gestore dei pagamenti e agli obblighi civilistici e fiscali applicabili. Il mancato conferimento dei dati obbligatori per la fatturazione impedisce l’attivazione o la prosecuzione dell’abbonamento a pagamento.";

/** Stripe e pagamenti (privacy B2B). */
export const LEGAL_STRIPE_PAYMENT_PROCESSOR_PARAGRAPH =
  "I pagamenti dell’abbonamento Premium sono elaborati da Stripe, Inc. e società del gruppo Stripe quale fornitore di servizi di pagamento e, ove configurato, come responsabile/sub-responsabile del trattamento per i dati strettamente necessari alla transazione (es. identificativi cliente, stato abbonamento, metadati di pagamento). Stripe tratta tali dati secondo la propria informativa privacy e può operare anche al di fuori dello SEE con garanzie contrattuali previste dal GDPR. Saloni Luxury non conserva i numeri completi delle carte di pagamento.";

/** Fatturazione elettronica verso saloni partner. */
export const LEGAL_FATTURAPA_BILLING_PARAGRAPH =
  "Ove attivata la fatturazione elettronica degli abbonamenti, Saloni Luxury emette documenti fiscali verso il salone partner utilizzando i dati di fatturazione forniti e li conserva per gli obblighi di legge applicabili al titolare del servizio.";

export const LEGAL_PROCESSING_ROLES_PARAGRAPH =
  "Per i dati dei clienti del salone trattati in agenda, anagrafica, prenotazioni, chat e comunicazioni operative, il salone partner agisce di norma come titolare del trattamento verso la propria clientela; Saloni Luxury tratta tali dati come fornitore della piattaforma, secondo contratto e istruzioni necessarie all’erogazione del servizio (art. 28 GDPR ove applicabile).";

export const LEGAL_PLATFORM_ADMIN_ACCESS_PARAGRAPH =
  "Amministratori tecnici autorizzati di Saloni Luxury possono accedere, con principio di minimizzazione, ai dati strettamente necessari per gestire la piattaforma (account, sicurezza, assistenza, configurazione del servizio, prevenzione di abusi, adempimenti contrattuali e richieste degli interessati). Tale accesso non attribuisce a Saloni Luxury la titolarità sui dati della clientela del salone né sostituisce i ruoli indicati sopra.";

export const LEGAL_AUTOMATED_DECISIONS_PARAGRAPH =
  "Saloni Luxury non adotta, nell’ambito descritto da questa informativa, decisioni basate unicamente su trattamento automatizzato che producano effetti giuridici o incidano in modo analogo significativamente sull’interessato, salvo quanto eventualmente previsto da funzioni esplicitamente descritte nel servizio.";

export const LEGAL_MINORS_PARAGRAPH =
  "Il servizio non è destinato a minori di 16 anni. Non raccogliamo consapevolmente dati di minori senza idonea base giuridica e autorizzazione ove richiesta dalla legge applicabile.";

export const LEGAL_REVIEW_MODERATION_PARAGRAPH =
  "Le recensioni pubblicate sulla piattaforma possono essere moderate da Saloni Luxury per contrastare contenuti manifestamente illeciti, offensivi, spam o in violazione dei termini di servizio. In tali casi la recensione può essere nascosta dalla vetrina pubblica e non concorrere alle medie visibili. Puoi segnalare contenuti inappropriate scrivendo a privacy@saloniluxury.it indicando il salone, la data e il motivo della segnalazione; valuteremo la richiesta nei tempi ragionevoli.";

export const LEGAL_PUSH_NOTIFICATIONS_PARAGRAPH =
  "Se attivi le notifiche push dall'app mobile, registriamo il token tecnico del dispositivo (FCM), la piattaforma (iOS/Android) e l'orario di registrazione/aggiornamento per inviarti promemoria di appuntamento, conferme e altre comunicazioni operative della piattaforma. Puoi disattivare le notifiche dalle impostazioni del dispositivo o disinstallando l'app; alla chiusura account i token registrati vengono rimossi. Il servizio push è erogato tramite Google Firebase Cloud Messaging quale responsabile/sub-responsabile tecnico.";

export const LEGAL_ART28_SUBPROCESSORS_PARAGRAPH =
  "Saloni Luxury può avvalersi di sub-responsabili tecnici (hosting cloud, database, cache, geocodifica, invio email transazionali, messaggistica push) vincolati da accordi Art. 28 GDPR o clausole equivalenti. L'elenco aggiornato dei principali fornitori è descritto nelle informative privacy e può essere richiesto a privacy@saloniluxury.it. Il salone partner resta titolare verso la propria clientela; Saloni Luxury assiste il salone, nei limiti contrattuali, nell'evadere richieste degli interessati relative ai dati trattati tramite la piattaforma.";

export const LEGAL_RIGHTS_RESPONSE_PARAGRAPH =
  "Le richieste per l’esercizio dei diritti vanno inviate a " +
  LEGAL_PRIVACY_EMAIL +
  ". Rispondiamo nei termini previsti dall’art. 12 GDPR (di norma entro un mese, prorogabile nei casi di complessità o numero di richieste).";

export const LEGAL_SECURITY_MEASURES_PARAGRAPH =
  "Applichiamo misure tecniche e organizzative adeguate al rischio, tra cui controllo degli accessi, autenticazione, cifratura in transito ove prevista e procedure di gestione degli incidenti, nel rispetto dell’art. 32 GDPR.";
