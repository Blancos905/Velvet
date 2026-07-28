import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { LegalCitation } from "../../content/legalReferences";
import { useLuxuryEmbeddedPanel } from "../../hooks/useLuxuryEmbeddedPanel";
import { readLegalReturnTo, withLegalReturnTo } from "../../lib/legalDocumentReturnTo";
import "../../styles/luxury-search-page.css";
import "../../styles/luxury-legal-public.css";

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
    <div className="luxury-legal-public__citations-panel">
      <p className="luxury-legal-public__citations-label">Riferimenti normativi</p>
      <ul className="luxury-legal-public__citations">
        {citations.map((citation) => (
          <li key={citation.id}>
            <a href={citation.href} target="_blank" rel="noopener noreferrer" className="luxury-legal-public__citation-link">
              {citation.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
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
  const embedded = useLuxuryEmbeddedPanel();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = readLegalReturnTo(searchParams);
  const canGoBackInHistory = typeof window !== "undefined" && window.history.length > 1;
  const navLinkClass = (path: string) =>
    `luxury-legal-public__nav-link${location.pathname === path ? " is-current" : ""}`;
  const navLinkTo = (path: string) => withLegalReturnTo(path, returnTo);

  return (
    <main
      className={`luxury-page-main luxury-search-page luxury-legal-public${embedded ? " luxury-legal-public--embedded" : ""}`}
    >
      <div className="luxury-legal-public__shell">
        {!embedded ? (
          <div className="luxury-search-back-row">
            {returnTo ? (
              <Link to={returnTo} className="luxury-search-back">
                <svg className="luxury-search-back__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Indietro
              </Link>
            ) : canGoBackInHistory ? (
              <button type="button" className="luxury-search-back" onClick={() => navigate(-1)}>
                <svg className="luxury-search-back__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Indietro
              </button>
            ) : (
              <Link to="/" className="luxury-search-back">
                <svg className="luxury-search-back__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Home
              </Link>
            )}
          </div>
        ) : null}

        <header className="luxury-legal-public__header">
          <div className="luxury-legal-public__header-glow" aria-hidden />
          <div className="luxury-legal-public__header-shine" aria-hidden />
          <div className="luxury-legal-public__header-inner">
            <p className="luxury-legal-public__kicker">Documenti legali</p>
            <h1 className="luxury-legal-public__title">{title}</h1>
            <div className="luxury-legal-public__header-meta">
              <p className="luxury-legal-public__subtitle">{subtitle}</p>
              <p className="luxury-legal-public__updated">Ultimo aggiornamento: {updatedAt}</p>
            </div>
          </div>
        </header>

        <div className="luxury-legal-public__body">
          {sections.map((section) => (
            <section key={section.heading} className="luxury-legal-public__section">
              <h2 className="luxury-legal-public__section-title">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="luxury-legal-public__text">
                  {paragraph}
                </p>
              ))}
              {section.citations?.length ? <LegalCitationList citations={section.citations} /> : null}
            </section>
          ))}
          {children}
          {storeRequirements?.length ? (
            <section className="luxury-legal-public__section luxury-legal-public__section--store">
              <h2 className="luxury-legal-public__section-title">Riferimenti per App Store e Google Play</h2>
              <p className="luxury-legal-public__text">
                Gli store richiedono che l’informativa pubblicata sia coerente con le dichiarazioni inserite in App Store Connect e
                Play Console (etichette privacy / Data safety).
              </p>
              <LegalCitationList citations={storeRequirements} />
            </section>
          ) : null}
        </div>

        <nav className="luxury-legal-public__nav" aria-label="Altri documenti legali">
          <p className="luxury-legal-public__nav-title">Documenti legali</p>
          <Link to={navLinkTo("/privacy/clienti")} className={navLinkClass("/privacy/clienti")}>
            Privacy clienti (B2C)
          </Link>
          <Link to={navLinkTo("/privacy/staff")} className={navLinkClass("/privacy/staff")}>
            Privacy staff
          </Link>
          <Link to={navLinkTo("/privacy")} className={navLinkClass("/privacy")}>
            Privacy saloni (B2B)
          </Link>
          <Link to={navLinkTo("/termini")} className={navLinkClass("/termini")}>
            Termini di servizio
          </Link>
          <Link to={navLinkTo("/privacy/scelte")} className={navLinkClass("/privacy/scelte")}>
            Scelte privacy
          </Link>
          <Link to={navLinkTo("/privacy/cookie")} className={navLinkClass("/privacy/cookie")}>
            Informativa cookie
          </Link>
          <Link to={navLinkTo("/privacy/elimina-account")} className={navLinkClass("/privacy/elimina-account")}>
            Elimina account
          </Link>
          <Link to={navLinkTo("/legale")} className={navLinkClass("/legale")}>
            Indice documenti
          </Link>
        </nav>
      </div>
    </main>
  );
}
