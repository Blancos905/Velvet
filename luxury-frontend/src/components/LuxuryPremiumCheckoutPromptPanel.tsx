import { useId } from "react";
import {
  premiumTrialCheckoutCtaLabel,
  premiumTrialEndPhrase,
  premiumTrialFreeLabel,
  SALON_PREMIUM_TRIAL_POST_TRIAL_SUFFIX,
} from "../data/salonPlans";
import "../styles/luxury-premium-checkout-prompt-modal.css";

type LuxuryPremiumCheckoutPromptPanelProps = {
  onContinue: () => void;
  busy?: boolean;
  error?: string | null;
  className?: string;
};

/** Pannello attivazione Premium (inline o dentro il modal). */
export function LuxuryPremiumCheckoutPromptPanel({
  onContinue,
  busy = false,
  error = null,
  className = "",
}: LuxuryPremiumCheckoutPromptPanelProps) {
  const titleId = useId();

  return (
    <section
      className={`luxury-plans-modal luxury-premium-checkout-prompt luxury-premium-checkout-prompt--inline ${className}`.trim()}
      aria-labelledby={titleId}
    >
      <div className="luxury-premium-checkout-prompt__hero" aria-hidden>
        <span className="luxury-premium-checkout-prompt__icon-ring">
          <svg className="luxury-premium-checkout-prompt__icon" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2l2.4 6.8H22l-5.8 4.2 2.2 6.8L12 15.6 5.6 19.8l2.2-6.8L2 8.8h7.6L12 2z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      <p className="luxury-premium-checkout-prompt__kicker">Email confermata</p>
      <h2 id={titleId} className="luxury-plans-modal__title luxury-premium-checkout-prompt__title">
        Attiva il tuo salone Premium
      </h2>
      <p className="luxury-plans-modal__intro luxury-premium-checkout-prompt__lead">
        I tuoi dati sono salvati. Per attivare il salone Premium, confermi il{" "}
        <strong>metodo di pagamento</strong>: oggi non paghi nulla ({premiumTrialFreeLabel()}).{" "}
        {premiumTrialEndPhrase()} parte l&apos;abbonamento ({SALON_PREMIUM_TRIAL_POST_TRIAL_SUFFIX}).
      </p>

      {error ? (
        <p className="luxury-alert luxury-alert--error luxury-premium-checkout-prompt__error" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="luxury-premium-checkout-prompt__perks">
        <li>Brand e layout vetrina personalizzati</li>
        <li>Statistiche e strumenti avanzati</li>
        <li>Chat clienti e gestione team</li>
      </ul>

      <div className="luxury-plans-modal__actions luxury-premium-checkout-prompt__actions">
        <button
          type="button"
          className="luxury-plan-cta luxury-premium-checkout-prompt__cta"
          onClick={onContinue}
          disabled={busy}
        >
          {busy ? "Apertura checkout…" : premiumTrialCheckoutCtaLabel()}
        </button>
      </div>
    </section>
  );
}
