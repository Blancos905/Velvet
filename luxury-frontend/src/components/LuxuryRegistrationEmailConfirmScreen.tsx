import { useLayoutEffect, type ReactNode } from "react";
import { SaloniLuxuryLogoMark } from "./SaloniLuxuryLogoMark";
import {
  LuxuryRegistrationEmailConfirmBox,
  type LuxuryRegistrationEmailConfirmBoxProps,
} from "./LuxuryRegistrationEmailConfirmBox";
import "../styles/luxury-search-page.css";

/** Il modulo è lungo: senza questo reset la pagina finita resta scrollata e il titolo in alto esce dal viewport. */
function scrollRegistrationConfirmPageToTop(): void {
  window.scrollTo(0, 0);
  const root = document.scrollingElement;
  if (root) root.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const layout = document.querySelector(".luxury-layout-main");
  if (layout instanceof HTMLElement) layout.scrollTop = 0;
}

type LuxuryRegistrationEmailConfirmSectionProps = LuxuryRegistrationEmailConfirmBoxProps & {
  errorHint?: string | null;
  heroTitle?: string;
  /** Nasconde la card logo+titolo quando ripete il box sotto. */
  hideHero?: boolean;
  /** Sostituisce il box predefinito (es. flusso conferma con token). */
  confirmContent?: ReactNode;
};

/** Hero + box «Controlla la tua email» (incorporabile in `/piani` o pagine simili). */
export function LuxuryRegistrationEmailConfirmSection({
  errorHint = null,
  heroTitle = "Controlla la tua email",
  hideHero = false,
  confirmContent = null,
  ...boxProps
}: LuxuryRegistrationEmailConfirmSectionProps) {
  return (
    <>
      {hideHero ? (
        <h1 className="luxury-registration-confirm-page__sr-title">{heroTitle}</h1>
      ) : (
        <header className="luxury-search-hero">
          <div className="luxury-search-hero__glow" aria-hidden />
          <SaloniLuxuryLogoMark variant="hero" />
          <h1 className="luxury-page-title">
            <span className="luxury-search-hero__title-text">{heroTitle}</span>
          </h1>
        </header>
      )}
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
  hideHero = false,
  confirmContent = null,
  className,
  ...boxProps
}: LuxuryRegistrationEmailConfirmSectionProps & {
  backRow?: ReactNode;
  className?: string;
}) {
  useLayoutEffect(() => {
    scrollRegistrationConfirmPageToTop();
    const frame = window.requestAnimationFrame(scrollRegistrationConfirmPageToTop);
    const soon = window.setTimeout(scrollRegistrationConfirmPageToTop, 0);
    const afterPaint = window.setTimeout(scrollRegistrationConfirmPageToTop, 80);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(soon);
      window.clearTimeout(afterPaint);
    };
  }, [heroTitle]);

  return (
    <main
      className={`luxury-page-main luxury-search-page luxury-plans-page luxury-registration-confirm-page${className ? ` ${className}` : ""}`}
    >
      {backRow}
      <LuxuryRegistrationEmailConfirmSection
        errorHint={errorHint}
        heroTitle={heroTitle}
        hideHero={hideHero}
        confirmContent={confirmContent}
        {...boxProps}
      />
    </main>
  );
}
