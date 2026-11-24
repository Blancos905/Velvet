import { Link } from "react-router-dom";
import { FREE_USE_LICENSE_DOCUMENT } from "../../content/freeUseLicenseDocument";
import { LegalDocumentLayout } from "./LegalDocumentLayout";

export default function FreeUseLicensePage() {
  const doc = FREE_USE_LICENSE_DOCUMENT;
  return (
    <LegalDocumentLayout title={doc.title} subtitle={doc.subtitle} updatedAt={doc.updatedAt} sections={doc.sections}>
      <p className="luxury-legal-public__text">
        <Link to="/registrati" className="luxury-legal-public__inline-link">
          Crea un account cliente
        </Link>
        {" · "}
        <Link to="/piani" className="luxury-legal-public__inline-link">
          Piano Premium per i saloni
        </Link>
        {" · "}
        <Link to="/termini" className="luxury-legal-public__inline-link">
          Termini di servizio
        </Link>
      </p>
    </LegalDocumentLayout>
  );
}
