import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useLuxuryT } from "../../i18n/useLuxuryLocale";

type SalonBillingIntroPromptProps = {
  onContinue: () => void;
};

/** Popup alto sul form di fatturazione: Prosegui lo chiude e lascia compilare i campi. */
export function SalonBillingIntroPrompt({ onContinue }: SalonBillingIntroPromptProps) {
  const t = useLuxuryT();
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onContinue();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onContinue]);

  return createPortal(
    <div className="luxury-trial-billing-prompt" role="presentation">
      <div className="luxury-trial-billing-prompt__card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <img className="luxury-trial-billing-prompt__logo" src="/logo-saloni-luxury.png" alt="Saloni Luxury" width={148} height={148} />
        <h2 id={titleId} className="luxury-trial-billing-prompt__title">
          {t("account.trial.billingPromptTitle")}
        </h2>
        <p className="luxury-trial-billing-prompt__lead">{t("account.trial.billingPromptLead")}</p>
        <button type="button" className="luxury-btn luxury-btn--primary luxury-trial-billing-prompt__go" onClick={onContinue}>
          {t("account.trial.billingPromptCta")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
