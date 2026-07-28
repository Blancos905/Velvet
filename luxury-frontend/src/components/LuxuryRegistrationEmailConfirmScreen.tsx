import type { ReactNode } from "react";
import { SaloniLuxuryLogoMark } from "./SaloniLuxuryLogoMark";
import {
  LuxuryRegistrationEmailConfirmBox,
  type LuxuryRegistrationEmailConfirmBoxProps,
} from "./LuxuryRegistrationEmailConfirmBox";
import "../styles/luxury-search-page.css";

type LuxuryRegistrationEmailConfirmSectionProps = LuxuryRegistrationEmailConfirmBoxProps & {
  errorHint?: string | null;
  heroTitle?: string;
  /** Sostituisce il box predefinito (es. flusso conferma con token). */
  confirmContent?: ReactNode;
};

/** Hero + box «Controlla la tua email» (incorporabile in `/piani` o pagine simili). */
export function LuxuryRegistrationEmailConfirmSection({
  errorHint = null,
  heroTitle = "Controlla la tua email",
  confirmContent = null,
  ...boxProps
}: LuxuryRegistrationEmailConfirmSectionProps) {
  return (
    <>
      <header className="luxury-search-hero">
        <div className="luxury-search-hero__glow" aria-hidden />
        <SaloniLuxuryLogoMark variant="hero" />
        <h1 className="luxury-page-title">
          <span className="luxury-search-hero__title-text">{heroTitle}</span>
        </h1>
      </header>
      {errorHint ? (
        <p className="luxury-alert luxury-alert--error" role="alert" style={{ maxWidth: "520px", margin: "0 auto 1rem" }}>
          {errorHint}
        </p>
      ) : null}
      <div className="luxury-plans-wrap" style={{ maxWidth: "520px", margin: "0 auto 1.5rem" }}>
        {confirmContent ?? <LuxuryRegistrationEmailConfirmBox {...boxProps} />}
      </div>
    </>
  );
}

/** Pagina intera post-registrazione (come `/piani` Premium). */
export function LuxuryRegistrationEmailConfirmScreen({
  backRow = null,
  errorHint = null,
  heroTitle,
  confirmContent = null,
  ...boxProps
}: LuxuryRegistrationEmailConfirmSectionProps & {
  backRow?: ReactNode;
}) {
  return (
    <main className="luxury-page-main luxury-search-page luxury-plans-page">
      {backRow}
      <LuxuryRegistrationEmailConfirmSection
        errorHint={errorHint}
        heroTitle={heroTitle}
        confirmContent={confirmContent}
        {...boxProps}
      />
    </main>
  );
}
