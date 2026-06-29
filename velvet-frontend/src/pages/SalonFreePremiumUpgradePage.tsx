import { Link, Navigate } from "react-router-dom";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import { SaloniLuxuryLogoMark } from "../components/SaloniLuxuryLogoMark";
import { SalonPlanCardTagline } from "../components/salon/SalonPlanCardTagline";
import { SalonPremiumPlanCardPreview } from "../components/salon/SalonPremiumPlanCardPreview";
import {
  SALON_PLANS,
  premiumTrialCheckoutAriaLabel,
  premiumTrialEndPhrase,
  premiumTrialFreeLabel,
  premiumTrialNoPaymentNote,
  premiumTrialPostTrialPriceLine,
  SALON_PREMIUM_TRIAL_BILLING_DATA_NOTE,
  SALON_PREMIUM_TRIAL_POST_TRIAL_SUFFIX,
  SALON_PREMIUM_TRIAL_MONTHS,
  planDisplayName,
} from "../data/salonPlans";
import { useEffectiveSalonPlanTier } from "../hooks/useEffectiveSalonPlanTier";
import { useMeSalonSummaryQuery } from "../hooks/useMeSalonSummary";
import { useSalonPremiumCheckoutPolicyQuery } from "../hooks/useSalonPremiumCheckoutPolicy";
import { useBillingStatusQuery } from "../hooks/useSalonFeaturePlanTier";
import { isNativePremiumBillingBlocked, NATIVE_PREMIUM_BILLING_BLOCKED_MESSAGE } from "../lib/nativePremiumUpgradePolicy";
import { isSalonPremiumCheckoutRequired, shouldOfferSalonPremiumCheckout } from "../lib/salonPremiumCheckoutPolicy";
import "../styles/luxury-plans.css";
import "../styles/luxury-search-page.css";
import "../styles/salon-free-premium-upgrade.css";

const premiumPlan = SALON_PLANS.find((p) => p.tier === "PREMIUM")!;

/**
 * Pagina conversione Premium per titolari piano Free (browser): prova gratuita Premium.
 */
export default function SalonFreePremiumUpgradePage() {
  const { isSalonTitolare, isAuthenticated } = useVelvetAuth();
  const effectivePlan = useEffectiveSalonPlanTier();
  const meSalon = useMeSalonSummaryQuery();
  const checkoutPolicy = useSalonPremiumCheckoutPolicyQuery();
  const billingStatus = useBillingStatusQuery();
  const premiumCheckoutRequired = isSalonPremiumCheckoutRequired(checkoutPolicy.data);
  const canStartCheckout =
    isAuthenticated &&
    isSalonTitolare &&
    !isNativePremiumBillingBlocked() &&
    shouldOfferSalonPremiumCheckout(premiumCheckoutRequired, billingStatus.data);

  if (isNativePremiumBillingBlocked()) {
    return <Navigate to="/piani" replace />;
  }

  if (isSalonTitolare && effectivePlan === "PREMIUM" && meSalon.data?.provisioned) {
    return <Navigate to="/account/salone" replace />;
  }

  const salonName = meSalon.data?.primaryLocationName?.trim();

  return (
    <main className="luxury-page-main luxury-search-page luxury-free-premium-upgrade">
      <div className="luxury-search-back-row">
        <Link to="/account" className="luxury-search-back" aria-label="Torna all'area account">
          <svg className="luxury-search-back__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Indietro
        </Link>
      </div>

      <header className="luxury-search-hero luxury-free-premium-upgrade__hero">
        <div className="luxury-search-hero__glow" aria-hidden />
        <SaloniLuxuryLogoMark variant="hero" />
        <p className="luxury-free-premium-upgrade__kicker">Passa da Free a Premium</p>
        <h1 className="luxury-page-title">
          <span className="luxury-search-hero__title-text">
            Prova Premium gratis per {premiumTrialFreeLabel()}
          </span>
        </h1>
        <p className="luxury-free-premium-upgrade__lead">
          {salonName ? (
            <>
              <strong>{salonName}</strong> merita una vetrina completa: pannello web da browser, brand personalizzato,
              statistiche e strumenti avanzati per far crescere l&apos;attività.
            </>
          ) : (
            <>
              Sblocca il pannello web da browser, la vetrina personalizzata e tutti gli strumenti Premium per far
              crescere il salone.
            </>
          )}
        </p>
      </header>

      <div className="luxury-free-premium-upgrade__layout">
        <article className="luxury-free-premium-upgrade__offer" aria-labelledby="luxury-free-premium-offer-title">
          <div className="luxury-free-premium-upgrade__offer-glow" aria-hidden />
          <div className="luxury-free-premium-upgrade__offer-rim" aria-hidden />

          <header className="luxury-free-premium-upgrade__offer-head">
            <div className="luxury-free-premium-upgrade__offer-brand">
              <p className="luxury-free-premium-upgrade__offer-kicker">Abbonamento</p>
              <h2 id="luxury-free-premium-offer-title" className="luxury-free-premium-upgrade__offer-title">
                {planDisplayName(premiumPlan.tier)}
              </h2>
            </div>
            <div className="luxury-free-premium-upgrade__trial-badge">
              <span className="luxury-free-premium-upgrade__trial-badge-days">{SALON_PREMIUM_TRIAL_MONTHS}</span>
              <span className="luxury-free-premium-upgrade__trial-badge-label">mesi gratis</span>
            </div>
          </header>

          <div
            className="luxury-free-premium-upgrade__trial-box"
            aria-label={premiumTrialCheckoutAriaLabel(premiumPlan.priceHint)}
          >
            <div className="luxury-free-premium-upgrade__trial-box-glow" aria-hidden />
            <p className="luxury-free-premium-upgrade__trial-box-kicker">Prova gratuita</p>
            <div className="luxury-free-premium-upgrade__trial-price-row">
              <span className="luxury-free-premium-upgrade__trial-price-value">0</span>
              <span className="luxury-free-premium-upgrade__trial-price-currency">€</span>
            </div>
            <p className="luxury-free-premium-upgrade__trial-box-sub">{premiumTrialNoPaymentNote()}</p>
            <div className="luxury-free-premium-upgrade__trial-divider" aria-hidden />
            <p className="luxury-free-premium-upgrade__trial-then">
              {premiumTrialPostTrialPriceLine(premiumPlan.priceValue ?? "20", premiumPlan.pricePeriod ?? "al mese")}
              <span className="luxury-free-premium-upgrade__trial-then-note">
                {" "}
                · {SALON_PREMIUM_TRIAL_POST_TRIAL_SUFFIX}
              </span>
            </p>
            <p className="luxury-free-premium-upgrade__trial-billing-note">{SALON_PREMIUM_TRIAL_BILLING_DATA_NOTE}</p>
          </div>

          <SalonPlanCardTagline tier="PREMIUM" content={premiumPlan.taglineContent} variant="upgrade" />

          <div className="luxury-free-premium-upgrade__preview">
            <SalonPremiumPlanCardPreview />
          </div>

          <ul className="luxury-free-premium-upgrade__highlights" aria-label="Perché passare a Premium">
            <li>Pannello di gestione completo da browser</li>
            <li>Scheda pubblica e pagina «Esplora» con il tuo brand</li>
            <li>Staff multi-operatore, notifiche e statistiche</li>
          </ul>

          {isNativePremiumBillingBlocked() ? (
            <p className="luxury-free-premium-upgrade__blocked">{NATIVE_PREMIUM_BILLING_BLOCKED_MESSAGE}</p>
          ) : !isAuthenticated ? (
            <p className="luxury-free-premium-upgrade__hint">
              Accedi con l&apos;account titolare del salone per avviare la prova gratuita.
            </p>
          ) : !isSalonTitolare ? (
            <p className="luxury-free-premium-upgrade__hint">
              La prova gratuita è riservata ai titolari del salone.
            </p>
          ) : null}

          {canStartCheckout ? (
            <Link to="/account/billing/checkout" className="luxury-free-premium-upgrade__cta">
              Inizia la prova gratuita
            </Link>
          ) : (
            <button type="button" className="luxury-free-premium-upgrade__cta" disabled>
              Inizia la prova gratuita
            </button>
          )}

          {!isNativePremiumBillingBlocked() ? (
            <p className="luxury-free-premium-upgrade__legal">
              {premiumTrialEndPhrase()} potrai attivare l&apos;abbonamento a {premiumPlan.priceValue} €{" "}
              {premiumPlan.pricePeriod}. Fino ad allora nessun pagamento è dovuto.
            </p>
          ) : null}
        </article>

        <aside className="luxury-free-premium-upgrade__aside" aria-label="Cosa cambia con Premium">
          <section className="luxury-free-premium-upgrade__aside-card">
            <span className="luxury-free-premium-upgrade__aside-chip">Oggi</span>
            <h2 className="luxury-free-premium-upgrade__aside-title">Con Free</h2>
            <ul className="luxury-free-premium-upgrade__aside-list">
              <li>Agenda e servizi dall&apos;app mobile</li>
              <li>Profilo essenziale e layout piattaforma</li>
              <li>Nessun pannello web da browser</li>
            </ul>
          </section>
          <section className="luxury-free-premium-upgrade__aside-card luxury-free-premium-upgrade__aside-card--premium">
            <span className="luxury-free-premium-upgrade__aside-chip luxury-free-premium-upgrade__aside-chip--premium">
              Upgrade
            </span>
            <h2 className="luxury-free-premium-upgrade__aside-title">Con Premium</h2>
            <ul className="luxury-free-premium-upgrade__aside-list">
              <li>Gestione completa anche da browser</li>
              <li>Brand, sito del salone e ricerca geolocalizzata</li>
              <li>Statistiche, staff e notifiche avanzate</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
