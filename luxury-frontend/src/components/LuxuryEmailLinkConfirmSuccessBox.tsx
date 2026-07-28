import "../styles/luxury-email-verified-success-box.css";

/** Pagina minimale aperta dal link nell'email: niente checkout o login, solo istruzioni per tornare alla registrazione. */
export function LuxuryEmailLinkConfirmSuccessBox() {
  return (
    <section className="luxury-email-verified-box" aria-live="polite">
      <div className="luxury-email-verified-box__glow" aria-hidden />
      <div className="luxury-email-verified-box__burst" aria-hidden />

      <div className="luxury-email-verified-box__icon-wrap" aria-hidden>
        <svg className="luxury-email-verified-box__icon" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M8 12.2l2.4 2.4L16 9.2"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p className="luxury-email-verified-box__kicker">Tutto ok</p>
      <h2 className="luxury-email-verified-box__title">Email confermata</h2>
      <p className="luxury-email-verified-box__lead">
        Torna alla pagina precedente per continuare con i passaggi successivi.
      </p>

      <div className="luxury-email-verified-box__badge">
        <span className="luxury-email-verified-box__badge-dot" aria-hidden />
        Puoi chiudere questa scheda
      </div>
    </section>
  );
}
