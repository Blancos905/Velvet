import { Sparkles } from "lucide-react";
import { SALON_PREMIUM_TRIAL_DAYS, SALON_PREMIUM_TRIAL_POST_TRIAL_SUFFIX, type SalonPlanDefinition } from "../../data/salonPlans";

type Props = {
  plan: SalonPlanDefinition;
  /** Variante compatta per card `/piani`. */
  variant?: "card" | "inline";
};

/**
 * Blocco prova gratuita Premium sulla card `/piani` (allineato a Stripe Checkout: 60 giorni trial).
 */
export function SalonPlanPremiumTrialPanel({ plan, variant = "card" }: Props) {
  const priceValue = plan.priceValue ?? "20";
  const pricePeriod = plan.pricePeriod ?? "al mese";

  return (
    <div
      className={`luxury-plan-trial-panel luxury-plan-trial-panel--${variant}`}
      aria-label={`0 euro per ${SALON_PREMIUM_TRIAL_DAYS} giorni, poi ${priceValue} euro ${pricePeriod}`}
    >
      <div className="luxury-plan-trial-panel__glow" aria-hidden />
      <div className="luxury-plan-trial-panel__mesh" aria-hidden />
      <div className="luxury-plan-trial-panel__ribbon" aria-hidden>
        <span className="luxury-plan-trial-panel__ribbon-shine" />
        <Sparkles className="luxury-plan-trial-panel__ribbon-icon" strokeWidth={2.2} />
        <span className="luxury-plan-trial-panel__ribbon-text">Regalo di benvenuto</span>
        <Sparkles className="luxury-plan-trial-panel__ribbon-icon" strokeWidth={2.2} />
      </div>
      <p className="luxury-plan-trial-panel__intro">
        <span className="luxury-plan-trial-panel__intro-highlight">{SALON_PREMIUM_TRIAL_DAYS} giorni</span>
        <span className="luxury-plan-trial-panel__intro-rest"> per il tuo salone online</span>
      </p>
      <div className="luxury-plan-trial-panel__price-row">
        <span className="luxury-plan-trial-panel__price-value">0</span>
        <span className="luxury-plan-trial-panel__price-currency">€</span>
      </div>
      <p className="luxury-plan-trial-panel__then">
        Poi <strong>{priceValue} €</strong> {pricePeriod}
        <span className="luxury-plan-trial-panel__then-suffix"> · {SALON_PREMIUM_TRIAL_POST_TRIAL_SUFFIX}</span>
      </p>
    </div>
  );
}
