import { Link, Navigate } from "react-router-dom";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { isNativePremiumBillingBlocked, NATIVE_PREMIUM_BILLING_BLOCKED_MESSAGE } from "../../lib/nativePremiumUpgradePolicy";
import { SalonPremiumPanorama } from "../../components/salon/SalonPremiumPanorama";
import { SALON_PLANS, planDisplayName } from "../../data/salonPlans";
import { useEffectiveSalonPlanTier } from "../../hooks/useEffectiveSalonPlanTier";
import { useBillingStatusQuery, useSalonPremiumActive } from "../../hooks/useSalonFeaturePlanTier";
import { useMeSalonSummaryQuery } from "../../hooks/useMeSalonSummary";
import "../../styles/velvet-account-page-shell.css";
import "../../styles/velvet-account-salon-services.css";
import "../../styles/salon-free-welcome.css";

/** Home salone (`/account/salone`) per piani **Free** e **Premium**. */
export default function AccountSalonHomePage() {
  const { isSalonTitolare, salonPlanHint } = useVelvetAuth();
  const effectivePlan = useEffectiveSalonPlanTier();
  const billingStatus = useBillingStatusQuery();
  const isPremiumActive = useSalonPremiumActive();
  const meSalon = useMeSalonSummaryQuery();
  /** Nome commerciale da DB (`studio_groups.name`), stesso valore del campo «Nome del salone» in registrazione `/piani`. */
  const salonNameFromDb = meSalon.data?.primaryLocationName?.trim() ?? "";

  const planDef = SALON_PLANS.find((p) => p.tier === effectivePlan) ?? SALON_PLANS[0];
  const isBase = effectivePlan === "BASE";
  const isPremiumPendingPayment = effectivePlan === "PREMIUM" && !isPremiumActive;

  if (!isSalonTitolare) {
    return <Navigate to="/account/prenotazioni" replace />;
  }

  if (isPremiumPendingPayment && billingStatus.isPending) {
    return (
      <div className="velvet-salon-services-page velvet-salon-panorama-account">
        <p aria-live="polite">Caricamento…</p>
      </div>
    );
  }

  if (isPremiumPendingPayment) {
    return <Navigate to="/account/billing/checkout" replace />;
  }

  if (isBase) {
    return (
      <div className="velvet-salon-services-page velvet-salon-panorama-account">
        <div className="velvet-salon-free-page">
          <div className="velvet-salon-free-page__layout velvet-salon-free-page__layout--promo-only">
            <aside className="velvet-salon-free-page__promo" aria-label="Passa a Premium">
              <article className="velvet-free-upgrade-card" aria-labelledby="velvet-free-upgrade-title">
                <div className="velvet-free-upgrade-card__mesh" aria-hidden />
                <div className="velvet-free-upgrade-card__rim" aria-hidden />
                <div className="velvet-free-upgrade-card__shine" aria-hidden />
                <div className="velvet-free-upgrade-card__inner">
                  <div className="velvet-free-upgrade-card__head">
                    <span className="velvet-free-upgrade-card__badge">Passa a Premium</span>
                    <span className="velvet-free-upgrade-card__spark" aria-hidden />
                  </div>
                  <h2 id="velvet-free-upgrade-title" className="velvet-free-upgrade-card__title">
                    Basta con la scheda anonima: con Premium il cliente capisce subito che è entrato nel <em>tuo</em> salone,
                    non in un clone uguale agli altri.
                  </h2>
                  <p className="velvet-free-upgrade-card__lede">
                    Logo e foto in evidenza, layout dal catalogo Luxury, notifiche e numeri utili per la giornata — da 15 € al
                    mese.
                  </p>
                  <ul className="velvet-free-upgrade-card__perks">
                    <li>Logo e immagini sul profilo pubblico</li>
                    <li>Layout dal catalogo</li>
                    <li>Notifiche e metriche</li>
                  </ul>
                  <div className="velvet-free-upgrade-card__actions">
                    {isNativePremiumBillingBlocked() ? (
                      <p className="velvet-text-muted" style={{ margin: 0, lineHeight: 1.55 }}>
                        {NATIVE_PREMIUM_BILLING_BLOCKED_MESSAGE}
                      </p>
                    ) : (
                      <>
                        <Link to="/account/billing/checkout" className="velvet-free-upgrade-card__cta">
                          Attiva Premium con Stripe
                        </Link>
                        <Link to="/piani" className="velvet-link-inline" style={{ marginLeft: "0.75rem" }}>
                          Dettagli piani
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </article>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  const planPriceLine =
    planDef.priceValue != null && planDef.priceValue !== ""
      ? `Riferimento commerciale: ${planDef.priceValue} €${planDef.pricePeriod ? ` ${planDef.pricePeriod}` : ""}`
      : null;

  return (
    <SalonPremiumPanorama
      salonName={salonNameFromDb}
      planLabel={planDisplayName(effectivePlan)}
      planTagline={planDef.tagline}
      planPriceLine={planPriceLine}
      showProvisionWarning={!meSalon.data?.provisioned && !salonPlanHint}
    />
  );
}
