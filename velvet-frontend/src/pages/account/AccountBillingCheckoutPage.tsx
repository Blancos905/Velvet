import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { fetchBillingStatus, startPremiumCheckout } from "../../api/billing";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { NativePremiumBillingBlockedPanel } from "../../components/NativePremiumBillingBlockedPanel";
import {
  SalonBillingProfileEditor,
  useSalonBillingProfileComplete,
} from "../../components/SalonBillingProfileEditor";
import { useEffectiveSalonPlanTier } from "../../hooks/useEffectiveSalonPlanTier";
import { isNativePremiumBillingBlocked } from "../../lib/nativePremiumUpgradePolicy";
import "../../styles/velvet-account-page-shell.css";
import "../../styles/velvet-profile-page.css";

/**
 * Avvio pagamento Premium: se i dati fatturazione sono già in anagrafica (registrazione `/piani`),
 * reindirizza subito a Stripe Checkout. Solo i passaggi Free → Premium mostrano il form fatturazione.
 */
export default function AccountBillingCheckoutPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isSalonTitolare, accessToken } = useVelvetAuth();
  const effectivePlan = useEffectiveSalonPlanTier();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const autoCheckoutStartedRef = useRef(false);

  const billingStatus = useQuery({
    queryKey: ["me", "billing", "status", accessToken],
    queryFn: () => fetchBillingStatus(accessToken),
    enabled: Boolean(isSalonTitolare && accessToken),
  });

  const { isLoading: billingProfileLoading, isComplete: profileComplete } =
    useSalonBillingProfileComplete(accessToken);

  const configured = billingStatus.data?.configured === true;
  const hasActiveSubscription =
    billingStatus.data?.subscriptionStatus === "active" ||
    billingStatus.data?.subscriptionStatus === "trialing" ||
    (effectivePlan === "PREMIUM" &&
      billingStatus.data?.premiumAccess &&
      billingStatus.data?.subscriptionStatus != null);

  const handleCheckoutError = (err: unknown) => {
    setRedirecting(false);
    autoCheckoutStartedRef.current = false;
    const message = err instanceof Error ? err.message : "Impossibile aprire il pagamento Stripe.";
    if (message.includes("ALREADY_SUBSCRIBED") || message.toLowerCase().includes("già un abbonamento")) {
      void queryClient.invalidateQueries({ queryKey: ["me", "billing"] });
      navigate("/account/salone", { replace: true });
      return;
    }
    setCheckoutError(message);
  };

  const goToStripe = () => {
    if (!accessToken) return;
    setRedirecting(true);
    setCheckoutError(null);
    void startPremiumCheckout(accessToken).catch(handleCheckoutError);
  };

  useEffect(() => {
    if (
      autoCheckoutStartedRef.current ||
      !configured ||
      hasActiveSubscription ||
      !profileComplete ||
      !accessToken ||
      billingStatus.isPending ||
      billingProfileLoading
    ) {
      return;
    }
    autoCheckoutStartedRef.current = true;
    setRedirecting(true);
    setCheckoutError(null);
    void startPremiumCheckout(accessToken).catch(handleCheckoutError);
  }, [
    accessToken,
    billingProfileLoading,
    billingStatus.isPending,
    configured,
    hasActiveSubscription,
    profileComplete,
  ]);

  if (!isSalonTitolare) {
    return <Navigate to="/account/salone" replace />;
  }

  if (isNativePremiumBillingBlocked()) {
    return <NativePremiumBillingBlockedPanel title="Accesso alla sezione" />;
  }

  if (billingStatus.isPending || billingProfileLoading) {
    return (
      <div className="velvet-account-page-shell velvet-account-page-shell--narrow">
        <p aria-live="polite">Preparazione pagamento…</p>
      </div>
    );
  }

  if (configured && hasActiveSubscription) {
    return <Navigate to="/account/salone" replace />;
  }

  if (configured && profileComplete) {
    return (
      <div className="velvet-account-page-shell velvet-account-page-shell--narrow">
        <p aria-live="polite">{redirecting ? "Reindirizzamento a Stripe…" : "Preparazione pagamento…"}</p>
        {checkoutError ? (
          <p className="velvet-alert velvet-alert--error" role="alert" style={{ marginTop: "1rem" }}>
            {checkoutError}
          </p>
        ) : null}
        {checkoutError ? (
          <p style={{ marginTop: "0.75rem" }}>
            <button type="button" className="velvet-btn velvet-btn--primary" onClick={goToStripe}>
              Riprova pagamento Stripe
            </button>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="velvet-account-page-shell velvet-account-page-shell--narrow">
      <header className="velvet-account-page-shell__hero">
        <div className="velvet-account-page-shell__hero-inner">
          <h1 className="velvet-account-page-shell__hero-title">Attiva Premium</h1>
          <p className="velvet-account-page-shell__hero-sub">
            Completa i dati di fatturazione mancanti, poi procedi al pagamento sicuro su Stripe.
          </p>
        </div>
      </header>

      <article className="velvet-profile-card velvet-profile-card--account" style={{ marginBottom: "1.25rem" }}>
        <div className="velvet-profile-insert-panel">
          <h2 className="velvet-section-title velvet-profile-card__title">Dati fatturazione</h2>
          <SalonBillingProfileEditor
            accessToken={accessToken}
            context="checkout"
            onSaved={() => {
              void queryClient.invalidateQueries({ queryKey: ["me", "billing"] });
              setCheckoutError(null);
            }}
          />
        </div>
      </article>

      {configured ? (
        <>
          <p className="velvet-text-muted" style={{ margin: "0 0 1rem", lineHeight: 1.55 }}>
            Salva i dati fatturazione per sbloccare il pagamento.
          </p>
          {checkoutError ? (
            <p className="velvet-alert velvet-alert--error" role="alert">
              {checkoutError}
            </p>
          ) : null}
          <p style={{ marginTop: "0.5rem" }}>
            <button
              type="button"
              className="velvet-btn velvet-btn--primary"
              disabled={!profileComplete || redirecting}
              onClick={goToStripe}
            >
              {redirecting ? "Reindirizzamento…" : "Continua al pagamento Stripe"}
            </button>
          </p>
        </>
      ) : (
        <div className="velvet-alert velvet-alert--error" role="alert">
          <p style={{ margin: 0 }}>
            <strong>Pagamenti non ancora attivi su questo ambiente.</strong> Configura Stripe sul server per procedere.
          </p>
        </div>
      )}
    </div>
  );
}
