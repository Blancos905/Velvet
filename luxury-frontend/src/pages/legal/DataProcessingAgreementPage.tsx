import {
  companyLegalName,
  companyName,
  legalEntitySummaryParagraph,
} from "../../content/legalEntity";
import {
  LEGAL_ART28_SUBPROCESSORS_PARAGRAPH,
  LEGAL_DPA_DOCUMENT_VERSION,
  LEGAL_PROCESSING_ROLES_PARAGRAPH,
  LEGAL_RIGHTS_RESPONSE_PARAGRAPH,
  LEGAL_SECURITY_MEASURES_PARAGRAPH,
  LEGAL_UPDATED_AT,
} from "../../content/legalSharedCopy";
import { GDPR_CITATIONS, LEGAL_CONTACT_EMAIL } from "../../content/legalReferences";
import { LegalDocumentLayout } from "./LegalDocumentLayout";

const UPDATED_AT = LEGAL_UPDATED_AT;

export default function DataProcessingAgreementPage() {
  return (
    <LegalDocumentLayout
      title="Accordo sul trattamento dei dati personali (Art. 28 GDPR)"
      subtitle={`DPA tra il salone partner (Titolare) e ${companyName} (Responsabile) per l'uso della piattaforma Saloni Luxury.`}
      updatedAt={UPDATED_AT}
      sections={[
        {
          heading: "1. Parti e ruoli",
          paragraphs: [
            legalEntitySummaryParagraph(),
            `Il presente accordo («DPA») integra i Termini di servizio e l'informativa privacy B2B e disciplina il trattamento dei dati personali effettuato da ${companyLegalName} («${companyName}», «Responsabile») per conto del salone partner («Titolare», «Salone») nell'ambito del servizio SaaS Saloni Luxury.`,
            LEGAL_PROCESSING_ROLES_PARAGRAPH,
            "Il Salone resta titolare del trattamento verso la propria clientela (anagrafica, prenotazioni, comunicazioni operative). Saloni Luxury tratta tali dati esclusivamente secondo le istruzioni documentate del Salone e per erogare le funzioni contrattualmente previste (agenda, vetrina, notifiche, chat ove attiva, export e cancellazione ove richiesti dal Titolare).",
          ],
          citations: [GDPR_CITATIONS.art28, GDPR_CITATIONS.art13],
        },
        {
          heading: "2. Oggetto, durata e istruzioni",
          paragraphs: [
            "Oggetto: hosting, elaborazione e messa a disposizione dei dati inseriti o generati tramite la piattaforma per le finalità del contratto di servizio.",
            "Durata: per tutta la durata dell'account salone e, successivamente, per il tempo strettamente necessario alla restituzione/cancellazione dei dati e agli obblighi di legge applicabili al Responsabile.",
            "Istruzioni: le istruzioni iniziali sono quelle descritte nei Termini di servizio, nell'informativa privacy B2B e nelle funzioni tecniche del gestionale. Istruzioni aggiuntive possono essere impartite per iscritto a " +
              LEGAL_CONTACT_EMAIL +
              " o tramite Assistenza, nei limiti delle funzionalità disponibili.",
            "Il Responsabile informa il Titolare se ritiene che un'istruzione violi il GDPR o altre disposizioni applicabili in materia di protezione dei dati.",
          ],
          citations: [GDPR_CITATIONS.art28],
        },
        {
          heading: "3. Dati, interessati e finalità",
          paragraphs: [
            "Categorie di interessati: clienti del salone, operatori/staff del salone, visitatori della vetrina pubblica ove identificabili, titolare e referenti del salone.",
            "Tipologie di dati: anagrafica e contatti, appuntamenti e storico servizi, recensioni, messaggi operativi, immagini e contenuti vetrina, dati tecnici di accesso e sicurezza, token notifiche push ove abilitati.",
            "Finalità: erogazione del servizio di prenotazione e gestione salone, comunicazioni di servizio, sicurezza, assistenza, statistiche aggregate ove previste dal piano, adempimenti richiesti dalla legge.",
            "È vietato al Titolare utilizzare la piattaforma per finalità illecite o per trattamenti non pertinenti all'attività del salone verso la propria clientela.",
          ],
          citations: [GDPR_CITATIONS.regulation, GDPR_CITATIONS.art28],
        },
        {
          heading: "4. Obblighi del Responsabile (Saloni Luxury)",
          paragraphs: [
            "Trattare i dati solo su istruzioni documentate del Titolare, salvo obblighi di legge.",
            "Garantire che le persone autorizzate al trattamento si siano impegnate alla riservatezza o abbiano un adeguato obbligo legale.",
            LEGAL_SECURITY_MEASURES_PARAGRAPH,
            "Non coinvolgere un altro responsabile (sub-responsabile) senza autorizzazione generale o specifica del Titolare, secondo quanto indicato al successivo paragrafo.",
            "Assistere il Titolare, ove possibile, nell'adempimento degli obblighi relativi ai diritti degli interessati (accesso, rettifica, cancellazione, limitazione, portabilità, opposizione).",
            "Assistere il Titolare nel rispetto degli obblighi di cui agli artt. 32–36 GDPR (sicurezza, notifica violazioni, valutazioni d'impatto, consultazione preventiva), tenuto conto della natura del trattamento e delle informazioni disponibili.",
            "A cessazione del servizio, cancellare o restituire i dati personali secondo la scelta del Titolare e quanto tecnicamente possibile, salvo conservazione imposta dalla legge.",
            "Mettere a disposizione del Titolare le informazioni necessarie per dimostrare il rispetto dell'art. 28 GDPR e consentire audit documentali ragionevoli, previo accordo su tempi e modalità.",
          ],
          citations: [GDPR_CITATIONS.art28, GDPR_CITATIONS.art32],
        },
        {
          heading: "5. Obblighi del Titolare (salone partner)",
          paragraphs: [
            "Garantire una base giuridica valida per il trattamento dei dati dei propri clienti e staff e fornire informative agli interessati ove richiesto dalla legge.",
            "Configurare correttamente il gestionale (accessi staff, contenuti pubblici, conservazione dati) e impartire istruzioni lecite al Responsabile.",
            "Non inserire nella piattaforma dati non necessari o categorie particolari di dati salvo base giuridica e misure adeguate.",
            "Informare tempestivamente il Responsabile di richieste degli interessati, reclami o contestazioni rilevanti che richiedano assistenza tecnica.",
            "Mantenere aggiornati i propri recapiti e i referenti per comunicazioni privacy e assistenza.",
          ],
          citations: [GDPR_CITATIONS.art24, GDPR_CITATIONS.art28],
        },
        {
          heading: "6. Sub-responsabili",
          paragraphs: [
            LEGAL_ART28_SUBPROCESSORS_PARAGRAPH,
            "Il Titolare autorizza sin d'ora l'impiego dei sub-responsabili tecnici elencati nell'informativa privacy B2B e nelle comunicazioni aggiornate da Saloni Luxury. In caso di sostituzione o aggiunta di sub-responsabili rilevanti, Saloni Luxury informerà il Titolare con congruo preavviso, dando la possibilità di opporsi per motivi legittimi connessi alla protezione dei dati.",
          ],
          citations: [GDPR_CITATIONS.art28],
        },
        {
          heading: "7. Trasferimenti verso paesi terzi",
          paragraphs: [
            "Ove i sub-responsabili trattino dati al di fuori dello SEE, Saloni Luxury impiega garanzie adeguate previste dal GDPR (es. clausole contrattuali tipo, decisioni di adeguatezza), come descritto nelle informative privacy.",
          ],
          citations: [GDPR_CITATIONS.art44, GDPR_CITATIONS.art46],
        },
        {
          heading: "8. Violazioni dei dati personali (data breach)",
          paragraphs: [
            "Il Responsabile notifica al Titolare senza ingiustificato ritardo, e ove possibile entro 48 ore dal venirne a conoscenza, le violazioni dei dati personali che riguardano dati trattati per conto del Titolare, fornendo le informazioni disponibili per consentire l'eventuale notifica al Garante e agli interessati.",
            "Il Titolare resta responsabile delle notifiche verso l'autorità di controllo e gli interessati nella misura di sua competenza.",
          ],
          citations: [GDPR_CITATIONS.art33, GDPR_CITATIONS.art34],
        },
        {
          heading: "9. Cancellazione e portabilità",
          paragraphs: [
            "Il Titolare può richiedere la cancellazione dei dati dei propri clienti nei limiti delle funzioni del gestionale e della normativa applicabile.",
            "Gli utenti con account collegato possono esercitare diritti self-service (export, elimina account) secondo l'informativa B2C; il Salone resta titolare verso i propri clienti non registrati o trattati solo in anagrafica salone.",
            LEGAL_RIGHTS_RESPONSE_PARAGRAPH,
          ],
          citations: [GDPR_CITATIONS.art17, GDPR_CITATIONS.art20],
        },
        {
          heading: "10. Accettazione e versione",
          paragraphs: [
            `Versione documento DPA: ${LEGAL_DPA_DOCUMENT_VERSION}.`,
            "L'accettazione del presente DPA avviene in fase di registrazione del salone partner (checkbox dedicata) o tramite sottoscrizione separata comunicata da Saloni Luxury. L'uso continuato del servizio dopo aggiornamenti sostanziali del DPA costituisce accettazione ove consentito dai Termini di servizio e previa comunicazione al Titolare.",
            "Per domande scrivi a " + LEGAL_CONTACT_EMAIL + ".",
          ],
        },
        {
          heading: "11. Legge applicabile",
          paragraphs: [
            "Il presente DPA è regolato dalla legge italiana. Per le controversie tra imprese si applicano i fori previsti dai Termini di servizio; restano salvi i diritti inderogabili e le competenze previste dal GDPR.",
            "Documenti correlati: Termini di servizio (/termini), Informativa privacy B2B (/privacy), Informativa clienti (/privacy/clienti).",
          ],
          citations: [GDPR_CITATIONS.regulation],
        },
      ]}
    />
  );
}
