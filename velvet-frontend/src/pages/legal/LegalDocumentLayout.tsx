import { Link } from "react-router-dom";
import type { LegalCitation } from "../../content/legalReferences";
import { useVelvetEmbeddedPanel } from "../../hooks/useVelvetEmbeddedPanel";
import "../../styles/velvet-legal-public.css";

export type LegalDocumentSection = {
  heading: string;
  paragraphs: string[];
  citations?: LegalCitation[];
};

export type LegalDocumentLayoutProps = {
  title: string;
  subtitle: string;
  updatedAt: string;
  sections: LegalDocumentSection[];
  storeRequirements?: LegalCitation[];
  children?: React.ReactNode;
};

export function LegalCitationList({ citations }: { citations: LegalCitation[] }) {
  if (!citations.length) return null;
  return (
    <ul className="velvet-legal-public__citations">
      {citations.map((citation) => (
        <li key={citation.id}>
          <a href={citation.href} target="_blank" rel="noopener noreferrer" className="velvet-legal-public__citation-link">
            {citation.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function LegalDocumentLayout({
  title,
  subtitle,
  updatedAt,
  sections,
  storeRequirements,
  children,
}: LegalDocumentLayoutProps) {
  const embedded = useVelvetEmbeddedPanel();
  return (
    <main
      className={`velvet-page-main velvet-search-page velvet-legal-public${embedded ? " velvet-legal-public--embedded" : ""}`}
    >
      <div className="velvet-legal-public__shell">
        {!embedded ? (
          <div className="velvet-search-back-row">
            <Link to="/" className="velvet-search-back">
              ← Home
            </Link>
          </div>
        ) : null}

        <header className="velvet-legal-public__header">
          <p className="velvet-legal-public__kicker">Documenti legali</p>
          <h1 className="velvet-legal-public__title">{title}</h1>
          <p className="velvet-legal-public__subtitle">{subtitle}</p>
          <p className="velvet-legal-public__updated">Ultimo aggiornamento: {updatedAt}</p>
        </header>

        <div className="velvet-legal-public__body">
          {sections.map((section) => (
            <section key={section.heading} className="velvet-legal-public__section">
              <h2 className="velvet-legal-public__section-title">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="velvet-legal-public__text">
                  {paragraph}
                </p>
              ))}
              {section.citations?.length ? <LegalCitationList citations={section.citations} /> : null}
            </section>
          ))}
          {children}
          {storeRequirements?.length ? (
            <section className="velvet-legal-public__section velvet-legal-public__section--store">
              <h2 className="velvet-legal-public__section-title">Riferimenti per App Store e Google Play</h2>
              <p className="velvet-legal-public__text">
                Gli store richiedono che l’informativa pubblicata sia coerente con le dichiarazioni inserite in App Store Connect e
                Play Console (etichette privacy / Data safety).
              </p>
              <LegalCitationList citations={storeRequirements} />
            </section>
          ) : null}
        </div>

        <nav className="velvet-legal-public__nav" aria-label="Altri documenti legali">
          <p className="velvet-legal-public__nav-title">Documenti legali</p>
          <Link to="/privacy/clienti" className="velvet-legal-public__nav-link">
            Privacy clienti (B2C)
          </Link>
          <Link to="/privacy/staff" className="velvet-legal-public__nav-link">
            Privacy staff
          </Link>
          <Link to="/privacy" className="velvet-legal-public__nav-link">
            Privacy saloni (B2B)
          </Link>
          <Link to="/termini" className="velvet-legal-public__nav-link">
            Termini di servizio
          </Link>
          <Link to="/privacy/scelte" className="velvet-legal-public__nav-link">
            Scelte privacy
          </Link>
          <Link to="/privacy/cookie" className="velvet-legal-public__nav-link">
            Informativa cookie
          </Link>
          <Link to="/privacy/elimina-account" className="velvet-legal-public__nav-link">
            Elimina account
          </Link>
          <Link to="/legale" className="velvet-legal-public__nav-link">
            Indice documenti
          </Link>
        </nav>
      </div>
    </main>
  );
}
