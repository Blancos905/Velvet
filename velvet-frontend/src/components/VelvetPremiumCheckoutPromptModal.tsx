import { useId } from "react";
import { SALON_PREMIUM_TRIAL_DAYS } from "../data/salonPlans";
import "../styles/velvet-premium-checkout-prompt-modal.css";

type VelvetPremiumCheckoutPromptModalProps = {
  open: boolean;
  onContinue: () => void;
  busy?: boolean;
  error?: string | null;
};

/** Popup post-conferma email titolare Premium: un passo prima di Stripe Checkout. */
export function VelvetPremiumCheckoutPromptModal({
  open,
  onContinue,
  busy = false,
  error = null,
}: VelvetPremiumCheckoutPromptModalProps) {
  const titleId = useId();

  if (!open) return null;

  return (
    <div className="velvet-plans-modal-root velvet-premium-checkout-prompt-root" role="presentation">
      <div
        className="velvet-plans-modal velvet-premium-checkout-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="velvet-premium-checkout-prompt__hero" aria-hidden>
          <span className="velvet-premium-checkout-prompt__icon-ring">
            <svg className="velvet-premium-checkout-prompt__icon" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2l2.4 6.8H22l-5.8 4.2 2.2 6.8L12 15.6 5.6 19.8l2.2-6.8L2 8.8h7.6L12 2z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        <p className="velvet-premium-checkout-prompt__kicker">Email confermata</p>
        <h2 id={titleId} className="velvet-plans-modal__title velvet-premium-checkout-prompt__title">
          Attiva il tuo salone Premium
        </h2>
        <p className="velvet-plans-modal__intro velvet-premium-checkout-prompt__lead">
          Il tuo account è attivo e i dati inseriti in registrazione sono già salvati. Prosegui con il pagamento
          sicuro su Stripe per sbloccare brand, vetrina e statistiche ({SALON_PREMIUM_TRIAL_DAYS} giorni di prova
          gratuita).
        </p>

        {error ? (
          <p className="velvet-alert velvet-alert--error velvet-premium-checkout-prompt__error" role="alert">
            {error}
          </p>
        ) : null}

        <ul className="velvet-premium-checkout-prompt__perks">
          <li>Brand e layout vetrina personalizzati</li>
          <li>Statistiche e strumenti avanzati</li>
          <li>Chat clienti e gestione team</li>
        </ul>

        <div className="velvet-plans-modal__actions velvet-premium-checkout-prompt__actions">
          <button
            type="button"
            className="velvet-plan-cta velvet-premium-checkout-prompt__cta"
            onClick={onContinue}
            disabled={busy}
          >
            {busy ? "Apertura checkout…" : "Continua al pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
