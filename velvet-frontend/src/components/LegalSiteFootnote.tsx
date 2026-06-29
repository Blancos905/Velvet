import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import "../styles/luxury-legal-site-footnote.css";

type LegalSiteFootnoteProps = {
  className?: string;
  style?: CSSProperties;
};

export function LegalSiteFootnote({ className, style }: LegalSiteFootnoteProps) {
  const rootClass = ["luxury-legal-site-footnote", className].filter(Boolean).join(" ");

  return (
    <aside
      className={rootClass}
      style={style}
      aria-label="Informativa privacy e documenti legali"
    >
      <p className="luxury-legal-site-footnote__kicker">Privacy e dati</p>
      <p className="luxury-legal-site-footnote__lead">
        Trattiamo i dati secondo i documenti legali del servizio.
      </p>
      <nav className="luxury-legal-site-footnote__chips" aria-label="Collegamenti legali">
        <Link to="/privacy/clienti" className="luxury-legal-site-footnote__chip">
          Privacy clienti
        </Link>
        <Link to="/termini" className="luxury-legal-site-footnote__chip">
          Termini
        </Link>
        <Link to="/privacy/cookie" className="luxury-legal-site-footnote__chip">
          Cookie
        </Link>
      </nav>
      <p className="luxury-legal-site-footnote__footer-line">
        Per diritti e cancellazione:{" "}
        <Link to="/privacy/scelte" className="luxury-legal-site-footnote__link">
          Scelte privacy
        </Link>
        .
      </p>
    </aside>
  );
}
