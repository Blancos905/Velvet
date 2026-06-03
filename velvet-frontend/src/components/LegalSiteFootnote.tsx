import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

type LegalSiteFootnoteProps = {
  className?: string;
  style?: CSSProperties;
};

export function LegalSiteFootnote({ className, style }: LegalSiteFootnoteProps) {
  return (
    <p
      className={className ?? "velvet-text-muted"}
      style={{ marginTop: "1rem", fontSize: "0.92rem", ...style }}
    >
      Trattiamo i dati secondo l&apos;
      <Link to="/privacy/clienti" className="velvet-link-inline">
        informativa privacy clienti
      </Link>
      , i{" "}
      <Link to="/termini" className="velvet-link-inline">
        termini di servizio
      </Link>{" "}
      e l&apos;
      <Link to="/privacy/cookie" className="velvet-link-inline">
        informativa cookie
      </Link>
      . Per diritti e cancellazione:{" "}
      <Link to="/privacy/scelte" className="velvet-link-inline">
        Scelte privacy
      </Link>
      .
    </p>
  );
}
