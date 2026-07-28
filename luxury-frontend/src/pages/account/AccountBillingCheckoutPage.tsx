import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { fetchBillingStatus, startPremiumCheckout } from "../../api/billing";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import {
  SalonBillingProfileEditor,
  useSalonBillingProfileComplete,
} from "../../components/SalonBillingProfileEditor";
import { RouteLoadingFallback } from "../../components/RouteLoadingFallback";
import { useEffectiveSalonPlanTier } from "../../hooks/useEffectiveSalonPlanTier";
import "../../styles/luxury-account-page-shell.css";
import "../../styles/luxury-profile-page.css";

/**
 * Avvio pagamento Premium: se i dati fatturazione sono già in anagrafica (registrazione `/piani`),
 * reindirizza subito a Stripe Checkout. Solo i passaggi Free → Premium mostrano il form fatturazione.
 */
export default function AccountBillingCheckoutPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isSalonTitolare, accessToken } = useLuxuryAuth();
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
  const subscriptionActivationRequired = billingStatus.data?.subscriptionActivationRequired === true;
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

  if (billingStatus.isSuccess && !configured && !subscriptionActivationRequired) {
    return <Navigate to="/account/salone" replace />;
  }

  if (billingStatus.isPending || billingProfileLoading || (configured && profileComplete && redirecting && !checkoutError)) {
    return <RouteLoadingFallback />;
  }

  if (configured && hasActiveSubscription) {
    return <Navigate to="/account/salone" replace />;
  }

  if (configured && profileComplete) {
    return (
      <div className="luxury-account-page-shell luxury-account-page-shell--narrow">
        {checkoutError ? (
          <>
            <p className="luxury-alert luxury-alert--error" role="alert" style={{ marginTop: "1rem" }}>
              {checkoutError}
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              <button type="button" className="luxury-btn luxury-btn--primary" onClick={goToStripe}>
                Riprova pagamento
              </button>
            </p>
          </>
        ) : (
          <RouteLoadingFallback />
        )}
      </div>
    );
  }

  if (redirecting && !checkoutError) {
    return <RouteLoadingFallback />;
  }

  return (
    <div className="luxury-account-page-shell luxury-account-page-shell--narrow">
      <header className="luxury-account-page-shell__hero">
        <div className="luxury-account-page-shell__hero-inner">
          <h1 className="luxury-account-page-shell__hero-title">
            {subscriptionActivationRequired ? "Continua con Saloni Luxury" : "Attiva Premium"}
          </h1>
          <p className="luxury-account-page-shell__hero-sub">
            {subscriptionActivationRequired
              ? "La prova gratuita è terminata. Completa i dati di fatturazione e attiva l'abbonamento Premium."
              : "Completa i dati di fatturazione mancanti, poi procedi al pagamento sicuro su Stripe."}
          </p>
        </div>
      </header>

      <article className="luxury-profile-card luxury-profile-card--account" style={{ marginBottom: "1.25rem" }}>
        <div className="luxury-profile-insert-panel">
          <h2 className="luxury-section-title luxury-profile-card__title">Dati fatturazione</h2>
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
          <p className="luxury-text-muted" style={{ margin: "0 0 1rem", lineHeight: 1.55 }}>
            Salva i dati fatturazione per sbloccare il pagamento.
          </p>
          {checkoutError ? (
            <p className="luxury-alert luxury-alert--error" role="alert">
              {checkoutError}
            </p>
          ) : null}
          <p style={{ marginTop: "0.5rem" }}>
            <button
              type="button"
              className="luxury-btn luxury-btn--primary"
              disabled={!profileComplete || redirecting}
              onClick={goToStripe}
            >
              Conferma metodo di pagamento su Stripe
            </button>
          </p>
          {subscriptionActivationRequired ? (
            <p className="luxury-text-muted" style={{ marginTop: "1rem", lineHeight: 1.55, fontSize: "0.92rem" }}>
              Procedendo accetti i{" "}
              <Link to="/termini" className="luxury-link-inline">
                Termini di servizio
              </Link>{" "}
              e l&apos;{" "}
              <Link to="/privacy" className="luxury-link-inline">
                Informativa privacy saloni
              </Link>
              .
            </p>
          ) : null}
        </>
      ) : (
        <div className="luxury-alert luxury-alert--error" role="alert">
          <p style={{ margin: 0 }}>
            <strong>Pagamenti non ancora attivi su questo ambiente.</strong> Configura Stripe sul server per procedere.
          </p>
        </div>
      )}
    </div>
  );
}
