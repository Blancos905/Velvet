import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LEGAL_PRIVACY_EMAIL } from "../../content/legalReferences";

type LegalPrivacyAccordionProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function LegalPrivacyAccordion({ title, defaultOpen, children }: LegalPrivacyAccordionProps) {
  return (
    <details className="velvet-legal-public__accordion" open={defaultOpen}>
      <summary className="velvet-legal-public__accordion-summary">
        <span className="velvet-legal-public__accordion-title">{title}</span>
        <span className="velvet-legal-public__accordion-chevron" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="velvet-legal-public__accordion-body">{children}</div>
    </details>
  );
}

export function LegalPrivacyMailLink() {
  return (
    <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`} className="velvet-legal-public__inline-link">
      {LEGAL_PRIVACY_EMAIL}
    </a>
  );
}

export function LegalPrivacyLayeredShell({ children }: { children: ReactNode }) {
  return <div className="velvet-legal-public__layered">{children}</div>;
}

export type LegalPrivacyAudience = "b2b" | "b2c" | "staff";

export function LegalPrivacyAudienceNotice({ audience }: { audience: LegalPrivacyAudience }) {
  return (
    <aside className="velvet-legal-public__audience-notice" aria-label="Informativa per altro profilo utente">
      {audience === "b2b" ? (
        <p className="velvet-legal-public__text">
          Questa informativa è rivolta ai <strong>titolari dei saloni partner (B2B)</strong>. Operatori e collaboratori:{" "}
          <Link to="/privacy/staff" className="velvet-legal-public__inline-link">
            Privacy staff
          </Link>
          . Clienti finali:{" "}
          <Link to="/privacy/clienti" className="velvet-legal-public__inline-link">
            Privacy clienti (B2C)
          </Link>
          .
        </p>
      ) : null}
      {audience === "b2c" ? (
        <p className="velvet-legal-public__text">
          Questa informativa è rivolta a <strong>clienti finali e consumatori (B2C)</strong>. Titolari salone:{" "}
          <Link to="/privacy" className="velvet-legal-public__inline-link">
            Privacy saloni (B2B)
          </Link>
          . Operatori in agenda:{" "}
          <Link to="/privacy/staff" className="velvet-legal-public__inline-link">
            Privacy staff
          </Link>
          .
        </p>
      ) : null}
      {audience === "staff" ? (
        <p className="velvet-legal-public__text">
          Questa informativa è rivolta a <strong>staff e operatori</strong> registrati dal salone. Titolari e abbonamento Premium:{" "}
          <Link to="/privacy" className="velvet-legal-public__inline-link">
            Privacy saloni (B2B)
          </Link>
          . Clienti che prenotano online:{" "}
          <Link to="/privacy/clienti" className="velvet-legal-public__inline-link">
            Privacy clienti (B2C)
          </Link>
          .
        </p>
      ) : null}
    </aside>
  );
}

export const LEGAL_PRIVACY_PRE_RELEASE_UPDATED_AT = "Fase di Sviluppo (Pre-Release)";
