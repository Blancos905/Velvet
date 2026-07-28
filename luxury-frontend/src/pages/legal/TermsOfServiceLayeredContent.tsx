import { TERMS_OF_SERVICE_DOCUMENT } from "../../content/termsOfServiceDocument";
import { LegalCitationList } from "./LegalDocumentLayout";
import { LegalPrivacyAccordion, LegalPrivacyLayeredShell } from "./LegalPrivacyAccordion";

export function TermsOfServiceLayeredContent() {
  return (
    <LegalPrivacyLayeredShell>
      {TERMS_OF_SERVICE_DOCUMENT.sections.map((section, index) => (
        <LegalPrivacyAccordion key={section.heading} title={section.heading} defaultOpen={index === 0}>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="luxury-legal-public__text">
              {paragraph}
            </p>
          ))}
          {section.citations?.length ? <LegalCitationList citations={section.citations} /> : null}
        </LegalPrivacyAccordion>
      ))}
    </LegalPrivacyLayeredShell>
  );
}
