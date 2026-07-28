import { TERMS_OF_SERVICE_DOCUMENT } from "../../content/termsOfServiceDocument";
import { LegalDocumentLayout } from "./LegalDocumentLayout";

export default function TermsOfServicePage() {
  const doc = TERMS_OF_SERVICE_DOCUMENT;
  return (
    <LegalDocumentLayout
      title={doc.title}
      subtitle={doc.subtitle}
      updatedAt={doc.updatedAt}
      storeRequirements={doc.storeRequirements}
      sections={doc.sections}
    />
  );
}
