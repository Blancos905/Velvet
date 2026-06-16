import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { fetchBillingStatus, startPremiumCheckout } from "../../api/billing";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { NativePremiumBillingBlockedPanel } from "../../components/NativePremiumBillingBlockedPanel";
import { SALON_PLANS } from "../../data/salonPlans";
import { useEffectiveSalonPlanTier } from "../../hooks/useEffectiveSalonPlanTier";
import { isNativePremiumBillingBlocked } from "../../lib/nativePremiumUpgradePolicy";
import "../../styles/velvet-account-page-shell.css";

/**
 * Passo intermedio dopo registrazione Premium: reindirizza a Stripe Checkout se configurato,
 * altrimenti spiega che i pagamenti non sono ancora attivi sul server.
 */
export default function AccountBillingCheckoutPage() {
  const { isSalonTitolare, accessToken } = useVelvetAuth();
  const effectivePlan = useEffectiveSalonPlanTier();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const autoStarted = useRef(false);

  const billingStatus = useQuery({
    queryKey: ["me", "billing", "status", accessToken],
    queryFn: () => fetchBillingStatus(accessToken),
    enabled: Boolean(isSalonTitolare && accessToken),
  });

  const premiumPlan = SALON_PLANS.find((p) => p.tier === "PREMIUM");
  const priceLabel = premiumPlan?.priceHint ?? "Premium";

  useEffect(() => {
    if (!isSalonTitolare || !accessToken || autoStarted.current) return;
    if (billingStatus.isPending) return;

    const status = billingStatus.data;
    if (!status?.configured) return;

    const hasActiveSubscription =
      status.subscriptionStatus === "active" ||
      status.subscriptionStatus === "trialing" ||
      (effectivePlan === "PREMIUM" && status.premiumAccess && status.subscriptionStatus != null);

    if (hasActiveSubscription) return;

    autoStarted.current = true;
    setRedirecting(true);
    setCheckoutError(null);
    void startPremiumCheckout(accessToken)
      .catch((err: unknown) => {
        autoStarted.current = false;
        setRedirecting(false);
        setCheckoutError(err instanceof Error ? err.message : "Impossibile aprire il pagamento Stripe.");
      });
  }, [
    accessToken,
    billingStatus.data,
    billingStatus.isPending,
    effectivePlan,
    isSalonTitolare,
  ]);

  if (!isSalonTitolare) {
    return <Navigate to="/account/home" replace />;
  }

  if (isNativePremiumBillingBlocked()) {
    return <NativePremiumBillingBlockedPanel title="Accesso alla sezione" />;
  }

  if (billingStatus.isPending) {
    return (
      <div className="velvet-account-page-shell velvet-account-page-shell--narrow">
        <p aria-live="polite">Preparazione pagamento…</p>
      </div>
    );
  }

  const configured = billingStatus.data?.configured === true;
  const hasActiveSubscription =
    billingStatus.data?.subscriptionStatus === "active" ||
    billingStatus.data?.subscriptionStatus === "trialing";

  if (configured && hasActiveSubscription) {
    return <Navigate to="/account/salone" replace />;
  }

  const retryCheckout = () => {
    if (!accessToken) return;
    setRedirecting(true);
    setCheckoutError(null);
    void startPremiumCheckout(accessToken)
      .catch((err: unknown) => {
        setRedirecting(false);
        setCheckoutError(err instanceof Error ? err.message : "Impossibile aprire il pagamento Stripe.");
      });
  };

  return (
    <div className="velvet-account-page-shell velvet-account-page-shell--narrow">
      <header className="velvet-account-page-shell__hero">
        <div className="velvet-account-page-shell__hero-inner">
          <h1 className="velvet-account-page-shell__hero-title">Attiva Premium</h1>
          <p className="velvet-account-page-shell__hero-sub">
            Registrazione completata. Per sbloccare il piano Premium ({priceLabel}) completa il pagamento sicuro su
            Stripe.
          </p>
        </div>
      </header>

      {configured ? (
        <>
          {redirecting ? (
            <p aria-live="polite">Reindirizzamento a Stripe…</p>
          ) : (
            <p>
              Se non vieni reindirizzato automaticamente, usa il pulsante qui sotto per aprire la pagina di pagamento.
            </p>
          )}
          {checkoutError ? (
            <p className="velvet-alert velvet-alert--error" role="alert">
              {checkoutError}
            </p>
          ) : null}
          <p style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="velvet-btn velvet-btn--primary"
              disabled={redirecting}
              onClick={retryCheckout}
            >
              {redirecting ? "Apertura…" : "Vai al pagamento Stripe"}
            </button>
          </p>
        </>
      ) : (
        <div className="velvet-alert velvet-alert--error" role="alert">
          <p style={{ margin: 0 }}>
            <strong>Pagamenti non ancora attivi su questo ambiente.</strong> Il backend non ha Stripe configurato
            ({`VELVET_BILLING_ENABLED`}, chiave segreta e Price ID). Finché non sono impostati, dopo la registrazione
            Premium non compare la pagina di pagamento.
          </p>
          <p style={{ margin: "0.75rem 0 0" }}>
            In sviluppo: copia le variabili da{" "}
            <code>velvet/spring-dev.local.env.example</code> in <code>velvet/spring-dev.local.env</code>, crea un
            prodotto/prezzo in Stripe test mode e riavvia il backend. Poi ripeti la registrazione o usa «Vai al
            pagamento» da panoramica salone.
          </p>
        </div>
      )}

      <p style={{ marginTop: "1.25rem" }}>
        <Link to="/account/salone">Panoramica salone</Link>
        {" · "}
        <Link to="/account/profilo">Profilo</Link>
        {" · "}
        <Link to="/piani">Piani</Link>
      </p>
    </div>
  );
}
