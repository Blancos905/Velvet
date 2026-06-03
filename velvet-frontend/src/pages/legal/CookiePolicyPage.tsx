import { legalEntitySummaryParagraph } from "../../content/legalEntity";
import { LEGAL_UPDATED_AT } from "../../content/legalSharedCopy";
import { GDPR_CITATIONS, LEGAL_CONTACT_EMAIL, THIRD_PARTY_CITATIONS } from "../../content/legalReferences";
import { LegalDocumentLayout } from "./LegalDocumentLayout";

const UPDATED_AT = LEGAL_UPDATED_AT;

export default function CookiePolicyPage() {
  return (
    <LegalDocumentLayout
      title="Informativa cookie e tecnologie simili"
      subtitle="Informazioni su cookie, archiviazione locale e servizi di terze parti usati dal sito Saloni Luxury."
      updatedAt={UPDATED_AT}
      sections={[
        {
          heading: "1. Titolare",
          paragraphs: [legalEntitySummaryParagraph()],
          citations: [GDPR_CITATIONS.art13],
        },
        {
          heading: "2. Cosa usiamo",
          paragraphs: [
            "Il sito utilizza principalmente tecnologie tecnicamente necessarie all’erogazione del servizio: memorizzazione della sessione di accesso, preferenze di interfaccia e cache locale per funzioni operative (es. vetrina salone).",
            "Non utilizziamo cookie di profilazione pubblicitaria o analytics di terze parti nel bundle applicativo attuale. Possono essere richiesti font tipografici da Google Fonts, immagini editoriali da Unsplash e contenuti o mappe da Google Maps quando l’utente apre funzioni collegate.",
          ],
          citations: [GDPR_CITATIONS.cookieDirective, THIRD_PARTY_CITATIONS.googleFonts, THIRD_PARTY_CITATIONS.unsplash],
        },
        {
          heading: "3. Basi giuridiche",
          paragraphs: [
            "Cookie e archiviazione locale strettamente necessari al servizio si fondano sull’esecuzione del contratto o del legittimo interesse a erogare il servizio richiesto. Eventuali strumenti facoltativi non necessari richiedono informativa e, ove previsto, consenso.",
          ],
          citations: [GDPR_CITATIONS.regulation, GDPR_CITATIONS.cookieDirective],
        },
        {
          heading: "4. Sessione e archiviazione locale",
          paragraphs: [
            "Dopo il login, il token di sessione può essere conservato in sessionStorage per mantenere l’accesso all’area account. Alcune preferenze (es. stato di interfaccia) possono essere salvate in localStorage o IndexedDB sul dispositivo.",
            "Queste memorizzazioni sono necessarie o funzionali al servizio richiesto dall’utente e non sono usate per pubblicità comportamentale.",
          ],
        },
        {
          heading: "5. Geocodifica e mappe",
          paragraphs: [
            "Per ricerca per zona o visualizzazione sedi possono essere contattati servizi di geocodifica (es. Nominatim/OpenStreetMap tramite infrastruttura Luxury) e Google Maps. L’uso di tali servizi può comportare il trattamento di indirizzi o coordinate secondo le policy dei rispettivi fornitori.",
          ],
          citations: [THIRD_PARTY_CITATIONS.nominatim, THIRD_PARTY_CITATIONS.googleMaps],
        },
        {
          heading: "6. Scelte dell’utente",
          paragraphs: [
            "Puoi cancellare cookie e dati del sito dalle impostazioni del browser. La revoca del consenso alla geolocalizzazione del dispositivo si gestisce dalle impostazioni del browser o del sistema operativo.",
            "Per richieste privacy: " + LEGAL_CONTACT_EMAIL + ". Per i diritti e la cancellazione account vedi anche Scelte privacy ed Elimina account.",
          ],
          citations: [GDPR_CITATIONS.art13, GDPR_CITATIONS.garante],
        },
      ]}
    />
  );
}
