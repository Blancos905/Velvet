import { Link, Navigate } from "react-router-dom";
import { useState } from "react";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { startPremiumCheckout } from "../../api/billing";
import { isNativePremiumBillingBlocked, NATIVE_PREMIUM_BILLING_BLOCKED_MESSAGE } from "../../lib/nativePremiumUpgradePolicy";
import { SalonPremiumPanorama } from "../../components/salon/SalonPremiumPanorama";
import { SALON_PLANS, planDisplayName } from "../../data/salonPlans";
import { useEffectiveSalonPlanTier } from "../../hooks/useEffectiveSalonPlanTier";
import { useMeSalonSummaryQuery } from "../../hooks/useMeSalonSummary";
import "../../styles/velvet-account-page-shell.css";
import "../../styles/velvet-account-salon-services.css";
import "../../styles/salon-free-welcome.css";

function AccountSalonPanoramaHero({ subtitle }: { subtitle: string }) {
  return (
    <div className="velvet-account-page-shell velvet-account-page-shell--narrow velvet-account-page-shell--salon-panorama">
      <header className="velvet-account-page-shell__hero">
        <div className="velvet-account-page-shell__hero-glow" aria-hidden />
        <div className="velvet-account-page-shell__hero-inner">
          <Link to="/account/home" className="velvet-link-back">
            ← Area account
          </Link>
          <h1 className="velvet-salon-panorama-hero__headline">
            <span className="velvet-salon-panorama-hero__headline-pre">Panoramica </span>
            <span className="velvet-salon-panorama-hero__headline-accent">salone</span>
          </h1>
          <p className="velvet-account-page-shell__hero-sub">{subtitle}</p>
        </div>
      </header>
    </div>
  );
}

/** Home titolare (`/account/salone`) per piani **Free** e **Premium**. */
export default function AccountSalonHomePage() {
  const { isSalonTitolare, salonPlanHint, accessToken } = useVelvetAuth();
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const effectivePlan = useEffectiveSalonPlanTier();
  const meSalon = useMeSalonSummaryQuery();
  /** Nome commerciale da DB (`studio_groups.name`), stesso valore del campo «Nome del salone» in registrazione `/piani`. */
  const salonNameFromDb = meSalon.data?.primaryLocationName?.trim() ?? "";

  const planDef = SALON_PLANS.find((p) => p.tier === effectivePlan) ?? SALON_PLANS[0];
  const isBase = effectivePlan === "BASE";

  if (!isSalonTitolare) {
    return <Navigate to="/account/home" replace />;
  }

  if (isBase) {
    return (
      <>
        <AccountSalonPanoramaHero subtitle="Passa a Premium per personalizzare la scheda del tuo salone in ricerca." />
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
                      {checkoutError ? (
                        <p className="velvet-alert velvet-alert--error" role="alert" style={{ marginBottom: "0.75rem" }}>
                          {checkoutError}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        className="velvet-free-upgrade-card__cta"
                        disabled={checkoutBusy}
                        onClick={() => {
                          setCheckoutError(null);
                          setCheckoutBusy(true);
                          void startPremiumCheckout(accessToken)
                            .catch((err: unknown) => {
                              setCheckoutError(err instanceof Error ? err.message : "Impossibile avviare il checkout.");
                            })
                            .finally(() => setCheckoutBusy(false));
                        }}
                      >
                        {checkoutBusy ? "Reindirizzamento…" : "Attiva Premium con Stripe"}
                      </button>
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
      </>
    );
  }

  const planPriceLine =
    planDef.priceValue != null && planDef.priceValue !== ""
      ? `Riferimento commerciale: ${planDef.priceValue} €${planDef.pricePeriod ? ` ${planDef.pricePeriod}` : ""}`
      : null;

  return (
    <>
      <AccountSalonPanoramaHero subtitle="Cosa include il Premium, checklist e accessi rapidi nel blocco qui sotto." />
      <SalonPremiumPanorama
        salonName={salonNameFromDb}
        planLabel={planDisplayName(effectivePlan)}
        planTagline={planDef.tagline}
        planPriceLine={planPriceLine}
        showProvisionWarning={!meSalon.data?.provisioned && !salonPlanHint}
      />
    </>
  );
}
