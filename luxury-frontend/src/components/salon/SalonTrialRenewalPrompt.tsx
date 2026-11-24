import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { intlLocaleForUi } from "../../i18n/intlLocaleForUi";
import { useLuxuryLocale } from "../../i18n/useLuxuryLocale";
import { useBillingStatusQuery } from "../../hooks/useSalonFeaturePlanTier";
import { useMeSalonSummaryQuery } from "../../hooks/useMeSalonSummary";
import {
  hasPaidPremiumSubscription,
  trialRemainingMs,
  trialRenewalPromptBucket,
  trialRenewalStorageKey,
} from "../../lib/salonTrialRenewal";
import "../../styles/luxury-salon-trial.css";

function readDismissedBucket(endsAt: string): string | null {
  try {
    return localStorage.getItem(trialRenewalStorageKey(endsAt));
  } catch {
    return null;
  }
}

/** Popup di rinnovo: una volta da 48 ore, poi ogni 4 ore nell’ultimo giorno. */
export function SalonTrialRenewalPrompt() {
  const { isSalonTitolare } = useLuxuryAuth();
  const billingStatus = useBillingStatusQuery();
  const salon = useMeSalonSummaryQuery();
  const { locale, t } = useLuxuryLocale();
  const location = useLocation();
  const queryClient = useQueryClient();
  const titleId = useId();
  const expiredRefreshRef = useRef(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [dismissedBucket, setDismissedBucket] = useState<string | null>(null);

  const endsAt = billingStatus.data?.promotionalTrialEndsAt ?? null;
  const onBillingFlow =
    location.pathname.startsWith("/account/billing/checkout") ||
    location.pathname.startsWith("/account/billing/success");

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!endsAt) {
      setDismissedBucket(null);
      return;
    }
    setDismissedBucket(readDismissedBucket(endsAt));
  }, [endsAt]);

  const remaining = trialRemainingMs(endsAt, nowMs);
  const bucket = remaining == null ? null : trialRenewalPromptBucket(remaining);
  const trialActive = billingStatus.data?.promotionalTrialActive === true;
  const visible =
    isSalonTitolare &&
    !onBillingFlow &&
    trialActive &&
    !hasPaidPremiumSubscription(billingStatus.data?.subscriptionStatus) &&
    bucket != null &&
    bucket !== dismissedBucket;

  useEffect(() => {
    if (remaining == null || remaining > 0 || expiredRefreshRef.current) return;
    expiredRefreshRef.current = true;
    void queryClient.invalidateQueries({ queryKey: ["me", "billing"] });
  }, [queryClient, remaining]);

  const dismiss = () => {
    if (!endsAt || !bucket) return;
    try {
      localStorage.setItem(trialRenewalStorageKey(endsAt), bucket);
    } catch {
      /* il popup torna al prossimo bucket anche senza storage */
    }
    setDismissedBucket(bucket);
  };

  useEffect(() => {
    if (!visible || !endsAt || !bucket) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      try {
        localStorage.setItem(trialRenewalStorageKey(endsAt), bucket);
      } catch {
        /* il popup torna al prossimo bucket anche senza storage */
      }
      setDismissedBucket(bucket);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bucket, endsAt, visible]);

  if (!visible || !endsAt || !bucket) return null;

  const endLabel = new Date(endsAt).toLocaleDateString(intlLocaleForUi(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const salonName = salon.data?.primaryLocationName?.trim() ?? "";
  const salonBit = salonName ? t("account.trial.promptSalon", { name: salonName }) : "";

  return (
    <div className="luxury-salon-trial-prompt" role="presentation">
      <div
        className="luxury-salon-trial-prompt__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <span className="luxury-salon-trial-prompt__badge">{t("account.trial.promptBadge")}</span>
        <h2 id={titleId} className="luxury-salon-trial-prompt__title">
          {t("account.trial.promptTitle")}
        </h2>
        <p className="luxury-salon-trial-prompt__lead">
          {t("account.trial.promptLead", { salon: salonBit, date: endLabel })}
        </p>
        <div className="luxury-salon-trial-prompt__actions">
          <Link to="/account/billing/checkout" className="luxury-btn luxury-btn--primary">
            {t("account.trial.promptCta")}
          </Link>
          <button type="button" className="luxury-salon-trial-prompt__later" onClick={dismiss}>
            {t("account.trial.promptLater")}
          </button>
        </div>
      </div>
    </div>
  );
}
