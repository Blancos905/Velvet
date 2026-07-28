import { Link } from "react-router-dom";
import { premiumTrialGrantedPhrase } from "../data/salonPlans";
import "../styles/luxury-premium-subscription-success-box.css";

type LuxuryPremiumSubscriptionSuccessBoxProps = {
  salonName?: string | null;
  /** true se il webhook non ha ancora aggiornato il piano in DB. */
  activationPending?: boolean;
  /** Destinazione del pulsante Continua (default panoramica salone). */
  continueTo?: string;
  /** Se impostato, il CTA usa un pulsante (es. redirect programmatico post-registrazione). */
  onContinue?: () => void;
};

export function LuxuryPremiumSubscriptionPendingBox() {
  return (
    <section className="luxury-premium-success-box luxury-premium-success-box--pending" aria-live="polite" aria-busy="true">
      <div className="luxury-premium-success-box__glow" aria-hidden />
      <div className="luxury-premium-success-box__spinner" aria-hidden />
      <p className="luxury-premium-success-box__kicker">Quasi fatto</p>
      <h2 className="luxury-premium-success-box__title">Conferma in corso…</h2>
      <p className="luxury-premium-success-box__lead">
        Stiamo attivando il tuo abbonamento Premium. Non chiudere questa pagina.
      </p>
    </section>
  );
}

export function LuxuryPremiumSubscriptionSuccessBox({
  salonName,
  activationPending = false,
  continueTo = "/account/salone",
  onContinue,
}: LuxuryPremiumSubscriptionSuccessBoxProps) {
  const salonLabel = salonName?.trim() ? salonName.trim() : "Il tuo salone";
  const continuePath = continueTo?.trim() || "/account/salone";

  return (
    <section className="luxury-premium-success-box" aria-live="polite">
      <div className="luxury-premium-success-box__glow" aria-hidden />
      <div className="luxury-premium-success-box__burst" aria-hidden />

      <div className="luxury-premium-success-box__icon-wrap" aria-hidden>
        <svg className="luxury-premium-success-box__icon" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2l2.4 6.8H22l-5.8 4.2 2.2 6.8L12 15.6 5.6 19.8l2.2-6.8L2 8.8h7.6L12 2z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p className="luxury-premium-success-box__kicker">Benvenuto in Premium</p>
      <h2 className="luxury-premium-success-box__title">Grazie, il tuo salone è attivo</h2>
      <p className="luxury-premium-success-box__lead">
        {activationPending
          ? `${salonLabel} ha completato il pagamento. L'attivazione completa può richiedere qualche minuto: troverai tutto aggiornato nel profilo.`
          : `${salonLabel} è ora su Saloni Luxury Premium: ${premiumTrialGrantedPhrase()} e accesso a tutte le funzionalità avanzate.`}
      </p>

      <div className="luxury-premium-success-box__badge">
        <span className="luxury-premium-success-box__badge-dot" aria-hidden />
        {activationPending ? "Pagamento ricevuto" : "Abbonamento Premium attivo"}
      </div>

      <div className="luxury-premium-success-box__actions">
        {onContinue ? (
          <button
            type="button"
            className="luxury-premium-success-box__cta luxury-premium-success-box__cta--primary"
            onClick={onContinue}
          >
            Vai al tuo salone
          </button>
        ) : (
          <Link to={continuePath} className="luxury-premium-success-box__cta luxury-premium-success-box__cta--primary">
            Continua
          </Link>
        )}
      </div>
    </section>
  );
}
