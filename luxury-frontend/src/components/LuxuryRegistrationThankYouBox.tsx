import "../styles/luxury-email-confirm-box.css";

export type LuxuryRegistrationThankYouBoxProps = {
  /** Es. «cliente» o «titolare salone» */
  accountLabel?: string;
  message?: string | null;
  extraNote?: string | null;
  onContinue: () => void;
};

export function LuxuryRegistrationThankYouBox({
  accountLabel = "cliente",
  message = null,
  extraNote = null,
  onContinue,
}: LuxuryRegistrationThankYouBoxProps) {
  const lead =
    message?.trim() ||
    `Il tuo account ${accountLabel} è attivo. Clicca Continua per iniziare.`;

  return (
    <section className="luxury-email-confirm-box luxury-email-confirm-box--thankyou" aria-live="polite">
      <div className="luxury-email-confirm-box__glow" aria-hidden />
      <div className="luxury-email-confirm-box__icon-wrap" aria-hidden>
        <svg className="luxury-email-confirm-box__icon" viewBox="0 0 24 24" fill="none">
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

      <p className="luxury-email-confirm-box__kicker">Email confermata</p>
      <h2 className="luxury-email-confirm-box__title">Grazie per esserti registrato</h2>
      <p className="luxury-email-confirm-box__lead">{lead}</p>

      {extraNote ? (
        <p className="luxury-email-confirm-box__extra" role="status">
          {extraNote}
        </p>
      ) : null}

      <div className="luxury-email-confirm-box__actions">
        <button
          type="button"
          className="luxury-email-confirm-box__cta luxury-email-confirm-box__cta--primary"
          onClick={onContinue}
        >
          Continua
        </button>
      </div>
    </section>
  );
}
