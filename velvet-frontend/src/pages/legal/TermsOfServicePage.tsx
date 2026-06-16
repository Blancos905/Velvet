import { legalEntitySummaryParagraph } from "../../content/legalEntity";
import {
  LEGAL_MINORS_PARAGRAPH,
  LEGAL_PROCESSING_ROLES_PARAGRAPH,
  LEGAL_REVIEW_MODERATION_PARAGRAPH,
  LEGAL_UPDATED_AT,
} from "../../content/legalSharedCopy";
import { GDPR_CITATIONS, LEGAL_CONTACT_EMAIL, STORE_LEGAL_CITATIONS } from "../../content/legalReferences";
import { LegalDocumentLayout } from "./LegalDocumentLayout";

const UPDATED_AT = LEGAL_UPDATED_AT;

export default function TermsOfServicePage() {
  return (
    <LegalDocumentLayout
      title="Termini di servizio"
      subtitle="Condizioni d’uso della piattaforma Saloni Luxury per clienti, saloni partner e operatori."
      updatedAt={UPDATED_AT}
      storeRequirements={[STORE_LEGAL_CITATIONS.googleUserData, STORE_LEGAL_CITATIONS.applePrivacyDetails]}
      sections={[
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
            "Le funzioni disponibili dipendono dal piano (Free o Premium) e dallo stato dell’account. La registrazione al piano Free per titolari salone è disponibile dall’app mobile; il pannello web completo per titolari Free è limitato come descritto nel servizio.",
            "Alcune integrazioni o personalizzazioni possono richiedere accordi aggiuntivi con Saloni Luxury.",
          ],
        },
        {
          heading: "5. Rapporto salone–piattaforma (Art. 28 GDPR)",
          paragraphs: [
            LEGAL_PROCESSING_ROLES_PARAGRAPH,
            "Il salone partner è responsabile delle istruzioni impartite a Saloni Luxury sul trattamento dei dati dei propri clienti nell’ambito del gestionale (agenda, anagrafica, prenotazioni). Saloni Luxury tratta tali dati esclusivamente per erogare il servizio contrattualmente concordato.",
          ],
          citations: [GDPR_CITATIONS.art13],
        },
        {
          heading: "6. Uso lecito e contenuti",
          paragraphs: [
            "È vietato un uso illecito, fraudolento o lesivo di terzi, incluso l’invio di contenuti illeciti, spam o dati non autorizzati. Saloni Luxury può sospendere o chiudere account in caso di violazioni gravi o ripetute.",
            LEGAL_REVIEW_MODERATION_PARAGRAPH,
            "Per segnalazioni urgenti puoi anche usare l’area Assistenza dopo il login.",
          ],
        },
        {
          heading: "7. Proprietà intellettuale",
          paragraphs: [
            "Marchi, software, layout e materiali della piattaforma restano di titolarità di Saloni Luxury o dei rispettivi licenzianti. I contenuti caricati dal salone restano di competenza del salone, che concede a Saloni Luxury le licenze necessarie a pubblicarli e erogare il servizio.",
          ],
        },
        {
          heading: "8. Limitazione di responsabilità",
          paragraphs: [
            "Il servizio è fornito nei limiti delle funzionalità tecniche e contrattuali concordate. Saloni Luxury non risponde di disservizi imputabili a terze parti (es. mappe, connettività) né dell’operato autonomo del salone verso i propri clienti, nei limiti consentiti dalla legge applicabile.",
          ],
        },
        {
          heading: "9. Chiusura account",
          paragraphs: [
            "L’utente può richiedere la chiusura dell’account dalla pagina Elimina account, dalle impostazioni profilo o contattando " +
              LEGAL_CONTACT_EMAIL +
              ". La chiusura comporta l’interruzione dell’accesso, la revoca delle sessioni e l’anonimizzazione del profilo secondo l’informativa privacy; alcuni contenuti storici (es. recensioni) possono restare in forma non identificabile.",
          ],
          citations: [GDPR_CITATIONS.art17],
        },
        {
          heading: "10. Legge applicabile e foro",
          paragraphs: [
            "I presenti termini sono regolati dalla legge italiana, fatti salvi i diritti inderogabili del consumatore. Per ogni controversia è competente il foro del luogo di residenza o domicilio del consumatore, se previsto dalla normativa a tutela dei consumatori.",
          ],
        },
        {
          heading: "11. Contatti",
          paragraphs: ["Per informazioni sui termini: " + LEGAL_CONTACT_EMAIL + "."],
        },
      ]}
    />
  );
}
