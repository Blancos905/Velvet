import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { fetchBillingStatus, startPremiumCheckout } from "../../api/billing";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import {
  BILLING_CHECKOUT_FORM_ID,
  SalonBillingProfileEditor,
  useSalonBillingProfileComplete,
} from "../../components/SalonBillingProfileEditor";
import { RouteLoadingFallback } from "../../components/RouteLoadingFallback";
import { SalonBillingIntroPrompt } from "../../components/salon/SalonBillingIntroPrompt";
import { useEffectiveSalonPlanTier } from "../../hooks/useEffectiveSalonPlanTier";
import { useLuxuryT } from "../../i18n/useLuxuryLocale";
import { hasPaidPremiumSubscription } from "../../lib/salonTrialRenewal";
import "../../styles/luxury-account-page-shell.css";
import "../../styles/luxury-profile-page.css";
import "../../styles/luxury-billing-checkout.css";

/**
 * Pagamento Premium dal cerchio in header: prima i dati fiscali, poi Stripe.
 * Se restano almeno 49 ore di prova, l'addebito parte a fine prova.
 */
export default function AccountBillingCheckoutPage() {
  const t = useLuxuryT();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const introToken = (location.state as { showBillingIntro?: number } | null)?.showBillingIntro ?? null;
  const [dismissedIntro, setDismissedIntro] = useState<number | null>(null);
  const introOpen = introToken != null && introToken !== dismissedIntro;
  const { isSalonTitolare, accessToken } = useLuxuryAuth();
  const effectivePlan = useEffectiveSalonPlanTier();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);

  const billingStatus = useQuery({
    queryKey: ["me", "billing", "status", accessToken],
    queryFn: () => fetchBillingStatus(accessToken),
    enabled: Boolean(isSalonTitolare && accessToken),
  });

  const { isLoading: billingProfileLoading } = useSalonBillingProfileComplete(accessToken);

  const configured = billingStatus.data?.configured === true;
  const trialStillRunning = billingStatus.data?.promotionalTrialActive === true;
  const trialKnown = Boolean(billingStatus.data?.promotionalTrialEndsAt);
  const subscriptionActivationRequired = billingStatus.data?.subscriptionActivationRequired === true;
  const hasActiveSubscription =
    hasPaidPremiumSubscription(billingStatus.data?.subscriptionStatus) ||
    ((effectivePlan === "PREMIUM" || effectivePlan === "PLUS") &&
      billingStatus.data?.premiumAccess &&
      billingStatus.data?.subscriptionStatus != null &&
      !trialStillRunning);

  const handleCheckoutError = (err: unknown) => {
    setRedirecting(false);
    const message = err instanceof Error ? err.message : t("account.billing.checkoutError");
    if (message.includes("ALREADY_SUBSCRIBED") || message.toLowerCase().includes("già un abbonamento")) {
      void queryClient.invalidateQueries({ queryKey: ["me", "billing"] });
      navigate("/salone", { replace: true });
      return;
    }
    setCheckoutError(message);
  };

  const goToStripe = () => {
    if (!accessToken || redirecting) return;
    setRedirecting(true);
    setCheckoutError(null);
    void startPremiumCheckout(accessToken).catch(handleCheckoutError);
  };

  const closeIntro = useCallback(() => {
    setDismissedIntro(introToken);
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(".luxury-billing-checkout-card input, .luxury-billing-checkout-card select")
        ?.focus();
    });
  }, [introToken]);

  if (!isSalonTitolare) {
    return <Navigate to="/salone" replace />;
  }

  if (
    billingStatus.isSuccess &&
    !configured &&
    !subscriptionActivationRequired &&
    !trialStillRunning &&
    !trialKnown
  ) {
    return <Navigate to="/salone" replace />;
  }

  if ((billingStatus.isPending || billingProfileLoading) && !introOpen) {
    return <RouteLoadingFallback />;
  }

  if (configured && hasActiveSubscription) {
    return <Navigate to="/salone" replace />;
  }

  const billingKnown = billingStatus.isSuccess;
  const paymentBusy = redirecting || savingBilling;

  return (
    <div className="luxury-account-page-shell luxury-account-page-shell--narrow">
      <header className="luxury-account-page-shell__hero luxury-billing-checkout-hero">
        <div className="luxury-account-page-shell__hero-inner">
          <h1 className="luxury-account-page-shell__hero-title">{t("account.billing.checkoutTitle")}</h1>
        </div>
      </header>

      <article className="luxury-profile-card luxury-profile-card--account luxury-billing-checkout-card">
        <div className="luxury-profile-insert-panel">
          <h2 className="luxury-section-title luxury-profile-card__title">{t("account.billing.detailsTitle")}</h2>
          <SalonBillingProfileEditor
            accessToken={accessToken}
            context="checkout"
            onPendingChange={setSavingBilling}
            onSaved={(saved) => {
              void queryClient.invalidateQueries({ queryKey: ["me", "billing"] });
              setCheckoutError(null);
              if (saved.complete && configured) {
                goToStripe();
              }
            }}
          />

          {billingKnown && configured ? (
            <div className="luxury-billing-checkout-card__pay">
              {trialStillRunning ? (
                <p className="luxury-billing-checkout-card__hint">{t("account.billing.checkoutWaitTrial")}</p>
              ) : null}
              {checkoutError ? (
                <p className="luxury-alert luxury-alert--error" role="alert">
                  {checkoutError}
                </p>
              ) : null}
              <button
                type="submit"
                form={BILLING_CHECKOUT_FORM_ID}
                className="luxury-btn luxury-btn--primary luxury-billing-checkout-card__stripe"
                disabled={!configured || paymentBusy}
              >
                {paymentBusy ? t("account.billing.checkoutStripeOpening") : t("account.billing.checkoutStripe")}
              </button>
              <p className="luxury-billing-checkout-card__legal">
                {t("account.billing.checkoutLegal")}{" "}
                <Link to="/termini" className="luxury-link-inline">
                  {t("account.billing.terms")}
                </Link>{" "}
                {t("account.billing.checkoutLegalAnd")}{" "}
                <Link to="/privacy" className="luxury-link-inline">
                  {t("account.billing.privacy")}
                </Link>
                .
              </p>
            </div>
          ) : billingKnown ? (
            <div className="luxury-billing-checkout-card__unavailable" role="status">
              <p>{t("account.billing.checkoutUnavailable")}</p>
            </div>
          ) : null}
        </div>
      </article>
      {introOpen ? <SalonBillingIntroPrompt onContinue={closeIntro} /> : null}
    </div>
  );
}
