import { Link } from "react-router-dom";
import { CookiePreferencesEditor } from "../../components/CookiePreferencesEditor";
import { LEGAL_RIGHTS_RESPONSE_PARAGRAPH, LEGAL_UPDATED_AT } from "../../content/legalSharedCopy";
import { GDPR_CITATIONS, LEGAL_CONTACT_EMAIL, STORE_LEGAL_CITATIONS } from "../../content/legalReferences";
import { LegalDocumentLayout } from "./LegalDocumentLayout";

const UPDATED_AT = LEGAL_UPDATED_AT;

export default function PrivacyChoicesPage() {
  return (
    <LegalDocumentLayout
      title="Scelte privacy"
      subtitle="Pagina pubblica per esercitare diritti e gestire le preferenze, in linea con le indicazioni opzionali di Apple App Store Connect."
      updatedAt={UPDATED_AT}
      storeRequirements={[STORE_LEGAL_CITATIONS.applePrivacyDetails, STORE_LEGAL_CITATIONS.appleManagePrivacy]}
      sections={[
        {
          heading: "1. Accesso e rettifica",
          paragraphs: [
            "Dopo l’accesso puoi aggiornare molti dati da Profilo (email, nome, telefono, dati salone dove previsto).",
          ],
          citations: [GDPR_CITATIONS.art15],
        },
        {
          heading: "2. Cancellazione account",
          paragraphs: [
            "Puoi avviare la chiusura dell’account dalla sezione «Chiudi account» in Profilo oppure seguire la pagina pubblica Elimina account. Dopo la conferma, l’accesso viene disattivato e i dati identificativi del profilo sono anonimizzati secondo l’informativa privacy.",
          ],
          citations: [GDPR_CITATIONS.art17, STORE_LEGAL_CITATIONS.googleUserData],
        },
        {
          heading: "3. Portabilità ed export",
          paragraphs: [
            "Dopo l’accesso puoi scaricare un export JSON da Profilo (sezione «I tuoi dati»). In alternativa scrivi a " +
              LEGAL_CONTACT_EMAIL +
              " dall’indirizzo email registrato indicando «Richiesta portabilità dati».",
          ],
          citations: [GDPR_CITATIONS.art20],
        },
        {
          heading: "4. Geolocalizzazione",
          paragraphs: [
            "La posizione del dispositivo per suggerimenti «vicino a me» è facoltativa e richiede il permesso del browser o del sistema operativo. Puoi revocare il permesso dalle impostazioni del dispositivo.",
          ],
          citations: [GDPR_CITATIONS.art13],
        },
        {
          heading: "5. Richieste al titolare",
          paragraphs: [
            "Per accesso, portabilità, limitazione, opposizione o altre richieste privacy scrivi a " + LEGAL_CONTACT_EMAIL + " o usa l’area Assistenza dopo il login.",
            LEGAL_RIGHTS_RESPONSE_PARAGRAPH,
          ],
          citations: [GDPR_CITATIONS.art20, GDPR_CITATIONS.art77, GDPR_CITATIONS.garante],
        },
        {
          heading: "6. Percorsi in app",
          paragraphs: [
            "Se hai già un account, puoi usare direttamente le pagine dell’area personale collegate ai tuoi diritti.",
          ],
        },
      ]}
    >
      <section className="luxury-legal-public__section">
        <h2 className="luxury-legal-public__section-title">Cookie e tecnologie simili</h2>
        <p className="luxury-legal-public__text">
          Gestisci le preferenze su mappe (Google Maps) e eventuali contenuti editoriali di terze parti. Le immagini di
          ispirazione in home sono self-hosted e restano visibili. I cookie necessari al servizio
          non possono essere disattivati.
        </p>
        <CookiePreferencesEditor />
      </section>
      <section className="luxury-legal-public__section">
        <h2 className="luxury-legal-public__section-title">Collegamenti rapidi (con account)</h2>
        <ul className="luxury-legal-public__actions">
          <li>
            <Link to="/account/profilo" className="luxury-legal-public__action-link">
              Profilo e chiusura account
            </Link>
          </li>
          <li>
            <Link to="/privacy/elimina-account" className="luxury-legal-public__action-link">
              Elimina account (pagina pubblica)
            </Link>
          </li>
          <li>
            <Link to="/account/assistenza" className="luxury-legal-public__action-link">
              Assistenza
            </Link>
          </li>
          <li>
            <Link to="/account/info-privacy" className="luxury-legal-public__action-link">
              Info e privacy in area account
            </Link>
          </li>
        </ul>
      </section>
    </LegalDocumentLayout>
  );
}
