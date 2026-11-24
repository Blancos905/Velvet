import { Link } from "react-router-dom";
import { useBillingStatusQuery } from "../hooks/useSalonFeaturePlanTier";
import { useLuxuryT } from "../i18n/useLuxuryLocale";
import { trialDaysRemaining } from "../lib/salonTrialRenewal";
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
  activationPending = false,
  continueTo = "/salone",
  onContinue,
}: LuxuryPremiumSubscriptionSuccessBoxProps) {
  const t = useLuxuryT();
  const billing = useBillingStatusQuery();
  const continuePath = continueTo?.trim() || "/salone";
  const days = trialDaysRemaining(billing.data?.promotionalTrialEndsAt, Date.now());
  const trialStillFree = billing.data?.promotionalTrialActive === true && (days ?? 0) > 0;
  const title = activationPending
    ? t("account.premiumSuccess.pending")
    : billing.isPending
      ? ""
      : trialStillFree
        ? days === 1
          ? t("account.premiumSuccess.trialDay")
          : t("account.premiumSuccess.trialDays", { days: days ?? 0 })
        : t("account.premiumSuccess.premium");

  return (
    <section className="luxury-premium-success-box" aria-live="polite">
      <div className="luxury-premium-success-box__glow" aria-hidden />
      <div className="luxury-premium-success-box__burst luxury-premium-success-box__burst--check" aria-hidden />

      <div className="luxury-premium-success-box__icon-wrap luxury-premium-success-box__icon-wrap--check">
        <svg className="luxury-premium-success-box__icon luxury-premium-success-box__icon--check" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h2 className="luxury-premium-success-box__title luxury-premium-success-box__title--solo">{title}</h2>

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
