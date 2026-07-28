import { STORE_LEGAL_CITATIONS } from "../../content/legalReferences";
import { LEGAL_PRIVACY_PUBLISHED_AT } from "./LegalPrivacyAccordion";
import { LegalDocumentLayout } from "./LegalDocumentLayout";
import { PrivacyPolicyConsumerLayeredContent } from "./PrivacyPolicyConsumerLayeredContent";

export default function PrivacyPolicyConsumerPage() {
  return (
    <LegalDocumentLayout
      title="Informativa Privacy per i Clienti (Consumatori B2C)"
      subtitle="Per chi usa il sito pubblico, la ricerca saloni, la registrazione cliente e l'app mobile Luxury per prenotare e lasciare recensioni."
      updatedAt={LEGAL_PRIVACY_PUBLISHED_AT}
      sections={[]}
      storeRequirements={[
        STORE_LEGAL_CITATIONS.googleUserData,
        STORE_LEGAL_CITATIONS.googleDataSafety,
        STORE_LEGAL_CITATIONS.applePrivacyDetails,
        STORE_LEGAL_CITATIONS.appleManagePrivacy,
      ]}
    >
      <PrivacyPolicyConsumerLayeredContent />
    </LegalDocumentLayout>
  );
}
