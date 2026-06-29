import { STORE_LEGAL_CITATIONS } from "../../content/legalReferences";
import { LEGAL_PRIVACY_PUBLISHED_AT } from "./LegalPrivacyAccordion";
import { LegalDocumentLayout } from "./LegalDocumentLayout";
import { PrivacyPolicyLayeredContent } from "./PrivacyPolicyLayeredContent";

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentLayout
      title="Informativa Privacy per i Saloni Partner (B2B)"
      subtitle="Per titolari, staff e gestione Premium del salone. Documento richiesto da App Store e Google Play."
      updatedAt={LEGAL_PRIVACY_PUBLISHED_AT}
      sections={[]}
      storeRequirements={[
        STORE_LEGAL_CITATIONS.googleUserData,
        STORE_LEGAL_CITATIONS.googleDataSafety,
        STORE_LEGAL_CITATIONS.applePrivacyDetails,
        STORE_LEGAL_CITATIONS.appleManagePrivacy,
      ]}
    >
      <PrivacyPolicyLayeredContent />
    </LegalDocumentLayout>
  );
}
