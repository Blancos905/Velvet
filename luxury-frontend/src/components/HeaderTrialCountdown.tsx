import { useNavigate } from "react-router-dom";
import { SALON_PREMIUM_TRIAL_DAYS } from "../data/salonPlans";
import { useBillingStatusQuery } from "../hooks/useSalonFeaturePlanTier";
import { useLuxuryT } from "../i18n/useLuxuryLocale";
import { hasPaidPremiumSubscription, trialDaysRemaining } from "../lib/salonTrialRenewal";

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Conto alla rovescia in header: il clic apre il form con il popup sopra. */
export function HeaderTrialCountdown() {
  const t = useLuxuryT();
  const navigate = useNavigate();
  const billing = useBillingStatusQuery();
  const status = billing.data;

  if (!status || hasPaidPremiumSubscription(status.subscriptionStatus)) return null;
  const show = status.promotionalTrialActive === true || status.subscriptionActivationRequired === true;
  if (!show) return null;

  const days = trialDaysRemaining(status.promotionalTrialEndsAt, Date.now()) ?? 0;
  const progress = Math.max(0, Math.min(1, days / SALON_PREMIUM_TRIAL_DAYS));
  const label = t("account.trial.headerAria", { days });

  return (
    <button
      type="button"
      className="luxury-header-trial"
      aria-label={label}
      title={label}
      onClick={() => navigate("/account/billing/checkout", { state: { showBillingIntro: Date.now() } })}
    >
      <svg className="luxury-header-trial__ring" viewBox="0 0 40 40" aria-hidden>
        <circle className="luxury-header-trial__track" cx="20" cy="20" r={RADIUS} />
        <circle
          className="luxury-header-trial__value"
          cx="20"
          cy="20"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
        />
      </svg>
      <span className="luxury-header-trial__num">{days}</span>
    </button>
  );
}
