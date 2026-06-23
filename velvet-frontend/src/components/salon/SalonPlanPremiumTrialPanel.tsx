import { Sparkles } from "lucide-react";
import { SALON_PREMIUM_TRIAL_DAYS, type SalonPlanDefinition } from "../../data/salonPlans";

type Props = {
  plan: SalonPlanDefinition;
  /** Variante compatta per card `/piani`. */
  variant?: "card" | "inline";
};

/**
 * Blocco prova gratuita Premium (allineato a Stripe Checkout: 30 giorni trial).
 */
export function SalonPlanPremiumTrialPanel({ plan, variant = "card" }: Props) {
  const priceValue = plan.priceValue ?? "20";
  const pricePeriod = plan.pricePeriod ?? "al mese";

  return (
    <div
      className={`velvet-plan-trial-panel velvet-plan-trial-panel--${variant}`}
      aria-label={`0 euro per ${SALON_PREMIUM_TRIAL_DAYS} giorni, poi ${priceValue} euro ${pricePeriod}`}
    >
      <div className="velvet-plan-trial-panel__glow" aria-hidden />
      <div className="velvet-plan-trial-panel__ribbon" aria-hidden>
        <span className="velvet-plan-trial-panel__ribbon-shine" />
        <Sparkles className="velvet-plan-trial-panel__ribbon-icon" strokeWidth={2.2} />
        <span className="velvet-plan-trial-panel__ribbon-text">Regalo di benvenuto</span>
        <Sparkles className="velvet-plan-trial-panel__ribbon-icon" strokeWidth={2.2} />
      </div>
      <p className="velvet-plan-trial-panel__intro">Un mese intero per il tuo salone online</p>
      <div className="velvet-plan-trial-panel__price-row">
        <span className="velvet-plan-trial-panel__price-value">0</span>
        <span className="velvet-plan-trial-panel__price-currency">€</span>
      </div>
      <p className="velvet-plan-trial-panel__then">
        Poi <strong>{priceValue} €</strong> {pricePeriod}
        <span className="velvet-plan-trial-panel__then-note"> · disdici quando vuoi</span>
      </p>
    </div>
  );
}
