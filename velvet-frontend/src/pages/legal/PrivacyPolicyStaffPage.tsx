import { STORE_LEGAL_CITATIONS } from "../../content/legalReferences";
import { LEGAL_PRIVACY_PRE_RELEASE_UPDATED_AT } from "./LegalPrivacyAccordion";
import { LegalDocumentLayout } from "./LegalDocumentLayout";
import { PrivacyPolicyStaffLayeredContent } from "./PrivacyPolicyStaffLayeredContent";

export default function PrivacyPolicyStaffPage() {
  return (
    <LegalDocumentLayout
      title="Informativa Privacy per lo Staff e gli Operatori (SaaS Platform)"
      subtitle="Per dipendenti, collaboratori e operatori (parrucchieri, estetisti, ecc.) registrati dal titolare del salone nell'agenda Luxury."
      updatedAt={LEGAL_PRIVACY_PRE_RELEASE_UPDATED_AT}
      sections={[]}
      storeRequirements={[
        STORE_LEGAL_CITATIONS.googleUserData,
        STORE_LEGAL_CITATIONS.googleDataSafety,
        STORE_LEGAL_CITATIONS.applePrivacyDetails,
        STORE_LEGAL_CITATIONS.appleManagePrivacy,
      ]}
    >
      <PrivacyPolicyStaffLayeredContent />
    </LegalDocumentLayout>
  );
}
