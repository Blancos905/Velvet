import { FileText, ShieldCheck, Sparkles } from "lucide-react";
import {
  premiumTrialCheckoutAriaLabel,
  premiumTrialDurationLabel,
  premiumTrialNoPaymentNote,
  SALON_PREMIUM_TRIAL_BILLING_DATA_NOTE,
  SALON_PREMIUM_TRIAL_POST_TRIAL_SUFFIX,
  type SalonPlanDefinition,
} from "../../data/salonPlans";

type Props = {
  plan: SalonPlanDefinition;
  /** Variante compatta per card `/piani`. */
  variant?: "card" | "inline";
};

/**
 * Blocco prova gratuita Premium sulla card `/piani`.
 */
export function SalonPlanPremiumTrialPanel({ plan, variant = "card" }: Props) {
  const priceValue = plan.priceValue ?? "20";
  const pricePeriod = plan.pricePeriod ?? "al mese";
  const trialLabel = premiumTrialDurationLabel();

  return (
    <div
      className={`luxury-plan-trial-panel luxury-plan-trial-panel--${variant}`}
      aria-label={premiumTrialCheckoutAriaLabel(plan.priceHint)}
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
        <span className="luxury-plan-trial-panel__intro-highlight">{trialLabel}</span>
        <span className="luxury-plan-trial-panel__intro-rest"> per il tuo salone online</span>
      </p>
      <div className="luxury-plan-trial-panel__price-row">
        <span className="luxury-plan-trial-panel__price-value">0</span>
        <span className="luxury-plan-trial-panel__price-currency">€</span>
      </div>
      <p className="luxury-plan-trial-panel__then">
        <span className="luxury-plan-trial-panel__then-badge">Dopo la prova</span>
        <span className="luxury-plan-trial-panel__then-price">
          {priceValue} € <span className="luxury-plan-trial-panel__then-period">{pricePeriod}</span>
        </span>
        <span className="luxury-plan-trial-panel__then-suffix"> · {SALON_PREMIUM_TRIAL_POST_TRIAL_SUFFIX}</span>
      </p>
      <div className="luxury-plan-trial-panel__notes">
        <p className="luxury-plan-trial-panel__note luxury-plan-trial-panel__note--shield">
          <ShieldCheck className="luxury-plan-trial-panel__note-icon" strokeWidth={2.1} aria-hidden />
          <span>{premiumTrialNoPaymentNote()}</span>
        </p>
        <p className="luxury-plan-trial-panel__note luxury-plan-trial-panel__note--billing">
          <FileText className="luxury-plan-trial-panel__note-icon" strokeWidth={2.1} aria-hidden />
          <span>{SALON_PREMIUM_TRIAL_BILLING_DATA_NOTE}</span>
        </p>
      </div>
    </div>
  );
}
