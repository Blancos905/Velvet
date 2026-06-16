import { Link } from "react-router-dom";
import { LEGAL_UPDATED_AT } from "../../content/legalSharedCopy";
import { GDPR_CITATIONS, LEGAL_CONTACT_EMAIL, STORE_LEGAL_CITATIONS } from "../../content/legalReferences";
import { legalEntitySummaryParagraph } from "../../content/legalEntity";
import { LegalDocumentLayout } from "./LegalDocumentLayout";

const UPDATED_AT = LEGAL_UPDATED_AT;

export default function AccountDeletionPage() {
  return (
    <LegalDocumentLayout
      title="Elimina account"
      subtitle="Percorso pubblico per chiudere l’account creato su Saloni Luxury, in linea con i requisiti di Google Play e App Store."
      updatedAt={UPDATED_AT}
      storeRequirements={[STORE_LEGAL_CITATIONS.googleUserData, STORE_LEGAL_CITATIONS.appleManagePrivacy]}
      sections={[
        {
          heading: "1. Chi può richiederlo",
          paragraphs: [
            legalEntitySummaryParagraph(),
            "Il flusso self-service è disponibile per account cliente (consumatore) e titolare salone registrato tramite i piani partner. La chiusura del profilo non comporta automaticamente la rimozione immediata di ogni contenuto storico del salone (es. recensioni o prenotazioni passate), trattati secondo l’informativa privacy.",
            "Gli account staff del salone e gli account amministrativi della piattaforma non usano questo percorso: per richieste scrivi a " + LEGAL_CONTACT_EMAIL + ".",
          ],
          citations: [GDPR_CITATIONS.art17],
        },
        {
          heading: "2. Eliminazione dall’area account",
          paragraphs: [
            "Accedi al sito con le tue credenziali, apri Profilo e scorri fino alla sezione «Chiudi account». Conferma la richiesta: l’accesso viene disattivato, le sessioni revocate e i dati identificativi del profilo anonimizzati secondo l’informativa privacy.",
          ],
          citations: [GDPR_CITATIONS.art17, STORE_LEGAL_CITATIONS.googleUserData],
        },
        {
          heading: "3. Senza accesso al profilo",
          paragraphs: [
            "Se non riesci ad accedere, invia una richiesta da un indirizzo email associato all’account a " +
              LEGAL_CONTACT_EMAIL +
              " con oggetto «Eliminazione account» e i dati minimi per l’identificazione (email registrata, ruolo cliente o partner).",
          ],
          citations: [GDPR_CITATIONS.art77, GDPR_CITATIONS.garante],
        },
        {
          heading: "4. Effetti",
          paragraphs: [
            "Dopo la chiusura non potrai più accedere con le stesse credenziali. Prenotazioni, messaggi e contenuti possono essere conservati in forma anonima o per obblighi legali come descritto nell’informativa privacy.",
          ],
        },
      ]}
    >
      <section className="velvet-legal-public__section">
        <h2 className="velvet-legal-public__section-title">Avvia eliminazione (con account)</h2>
        <ul className="velvet-legal-public__actions">
          <li>
            <Link to="/account/profilo" className="velvet-legal-public__action-link">
              Vai a Profilo → Chiudi account
            </Link>
          </li>
          <li>
            <Link to="/account" className="velvet-legal-public__action-link">
              Accedi all’area account
            </Link>
          </li>
          <li>
            <a href={"mailto:" + LEGAL_CONTACT_EMAIL} className="velvet-legal-public__action-link">
              Scrivi a {LEGAL_CONTACT_EMAIL}
            </a>
          </li>
        </ul>
      </section>
    </LegalDocumentLayout>
  );
}
