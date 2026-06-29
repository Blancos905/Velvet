import { legalEntitySummaryParagraph } from "../../content/legalEntity";
import { VELVET_LEGAL_PANEL_PATHS, velvetLegalPanelUrl } from "../../content/velvetLegalPanelPaths";
import { LEGAL_UPDATED_AT } from "../../content/legalSharedCopy";
import { GDPR_CITATIONS, STORE_LEGAL_CITATIONS } from "../../content/legalReferences";
import { LegalDocumentLayout } from "./LegalDocumentLayout";

const PUBLIC_SITE_ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://saloniluxury.it";

export default function LegalHubPage() {
  return (
    <LegalDocumentLayout
      title="Indice documenti e requisiti store"
      subtitle="URL pubblici da indicare in App Store Connect e Google Play Console, con riferimenti normativi collegati."
      updatedAt={LEGAL_UPDATED_AT}
      sections={[
        {
          heading: "Documenti pubblicati",
          paragraphs: [
            "Usa gli URL HTTPS del sito in produzione. In app mobile i pannelli legali caricano le stesse pagine con parametro ?embed=1.",
          ],
        },
        {
          heading: "URL per le console store",
          paragraphs: [
            `Privacy Policy URL (clienti / app B2C): ${PUBLIC_SITE_ORIGIN}${VELVET_LEGAL_PANEL_PATHS.privacyConsumer}`,
            `Privacy Policy URL (staff / operatori): ${PUBLIC_SITE_ORIGIN}${VELVET_LEGAL_PANEL_PATHS.privacyStaff}`,
            `Privacy Policy URL (saloni partner B2B): ${PUBLIC_SITE_ORIGIN}${VELVET_LEGAL_PANEL_PATHS.privacy}`,
            `Privacy Choices URL: ${PUBLIC_SITE_ORIGIN}${VELVET_LEGAL_PANEL_PATHS.privacyChoices}`,
            `Account deletion URL: ${PUBLIC_SITE_ORIGIN}${VELVET_LEGAL_PANEL_PATHS.deleteAccount}`,
            `Termini di servizio: ${PUBLIC_SITE_ORIGIN}${VELVET_LEGAL_PANEL_PATHS.terms}`,
            `Informativa cookie: ${PUBLIC_SITE_ORIGIN}${VELVET_LEGAL_PANEL_PATHS.cookies}`,
            `Info e privacy in account: ${velvetLegalPanelUrl(PUBLIC_SITE_ORIGIN, VELVET_LEGAL_PANEL_PATHS.accountInfoPrivacy)}`,
          ],
        },
        {
          heading: "Titolare",
          paragraphs: [legalEntitySummaryParagraph()],
          citations: [GDPR_CITATIONS.art13],
        },
        {
          heading: "Google Play",
          paragraphs: [
            "Richiede privacy policy accessibile, modulo Data safety coerente con l’app e conformità alla User Data policy.",
          ],
          citations: [
            STORE_LEGAL_CITATIONS.googleUserData,
            STORE_LEGAL_CITATIONS.googleDataSafety,
            STORE_LEGAL_CITATIONS.googleDeclareDataUse,
          ],
        },
        {
          heading: "Apple App Store",
          paragraphs: [
            "Richiede Privacy Policy URL, App Privacy Details in App Store Connect e, ove applicabile, privacy manifest per SDK di terze parti.",
          ],
          citations: [
            STORE_LEGAL_CITATIONS.applePrivacyDetails,
            STORE_LEGAL_CITATIONS.appleManagePrivacy,
            STORE_LEGAL_CITATIONS.applePrivacyManifests,
          ],
        },
        {
          heading: "Unione europea (GDPR)",
          paragraphs: [
            "Gli articoli sotto riassumono gli obblighi di trasparenza e i diritti degli interessati citati nei documenti pubblicati.",
          ],
          citations: [
            GDPR_CITATIONS.regulation,
            GDPR_CITATIONS.art12,
            GDPR_CITATIONS.art13,
            GDPR_CITATIONS.art14,
            GDPR_CITATIONS.edpbTransparency,
            GDPR_CITATIONS.garante,
          ],
        },
      ]}
    />
  );
}
