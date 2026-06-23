import { Link, Navigate } from "react-router-dom";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import { SaloniLuxuryLogoMark } from "../components/SaloniLuxuryLogoMark";
import { SalonPremiumPlanCardPreview } from "../components/salon/SalonPremiumPlanCardPreview";
import {
  SALON_PLANS,
  SALON_PREMIUM_TRIAL_DAYS,
  planDisplayName,
} from "../data/salonPlans";
import { useEffectiveSalonPlanTier } from "../hooks/useEffectiveSalonPlanTier";
import { useMeSalonSummaryQuery } from "../hooks/useMeSalonSummary";
import { isNativePremiumBillingBlocked, NATIVE_PREMIUM_BILLING_BLOCKED_MESSAGE } from "../lib/nativePremiumUpgradePolicy";
import "../styles/velvet-search-page.css";
import "../styles/salon-free-premium-upgrade.css";

const premiumPlan = SALON_PLANS.find((p) => p.tier === "PREMIUM")!;

/**
 * Pagina conversione Premium per titolari piano Free (browser): solo abbonamento Premium, prova 30 giorni.
 */
export default function SalonFreePremiumUpgradePage() {
  const { isSalonTitolare, isAuthenticated } = useVelvetAuth();
  const effectivePlan = useEffectiveSalonPlanTier();
  const meSalon = useMeSalonSummaryQuery();

  if (isSalonTitolare && effectivePlan === "PREMIUM" && meSalon.data?.provisioned) {
    return <Navigate to="/account/salone" replace />;
  }

  const salonName = meSalon.data?.primaryLocationName?.trim();
  const canStartCheckout = isAuthenticated && isSalonTitolare && !isNativePremiumBillingBlocked();

  return (
    <main className="velvet-page-main velvet-search-page velvet-free-premium-upgrade">
      <div className="velvet-search-back-row">
        <Link to="/account" className="velvet-search-back" aria-label="Torna all'area account">
          <svg className="velvet-search-back__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
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

      <header className="velvet-search-hero velvet-free-premium-upgrade__hero">
        <div className="velvet-search-hero__glow" aria-hidden />
        <SaloniLuxuryLogoMark variant="hero" />
        <p className="velvet-free-premium-upgrade__kicker">Passa da Free a Premium</p>
        <h1 className="velvet-page-title">
          <span className="velvet-search-hero__title-text">
            Prova Premium gratis per {SALON_PREMIUM_TRIAL_DAYS} giorni
          </span>
        </h1>
        <p className="velvet-free-premium-upgrade__lead">
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

      <div className="velvet-free-premium-upgrade__layout">
        <article className="velvet-free-premium-upgrade__offer" aria-labelledby="velvet-free-premium-offer-title">
          <div className="velvet-free-premium-upgrade__offer-glow" aria-hidden />
          <div className="velvet-free-premium-upgrade__offer-rim" aria-hidden />

          <header className="velvet-free-premium-upgrade__offer-head">
            <div className="velvet-free-premium-upgrade__offer-brand">
              <p className="velvet-free-premium-upgrade__offer-kicker">Abbonamento</p>
              <h2 id="velvet-free-premium-offer-title" className="velvet-free-premium-upgrade__offer-title">
                {planDisplayName(premiumPlan.tier)}
              </h2>
            </div>
            <div className="velvet-free-premium-upgrade__trial-badge">
              <span className="velvet-free-premium-upgrade__trial-badge-days">{SALON_PREMIUM_TRIAL_DAYS}</span>
              <span className="velvet-free-premium-upgrade__trial-badge-label">giorni gratis</span>
            </div>
          </header>

          <div
            className="velvet-free-premium-upgrade__trial-box"
            aria-label={`0 euro per ${SALON_PREMIUM_TRIAL_DAYS} giorni, poi ${premiumPlan.priceHint}`}
          >
            <div className="velvet-free-premium-upgrade__trial-box-glow" aria-hidden />
            <p className="velvet-free-premium-upgrade__trial-box-kicker">Prova gratuita</p>
            <div className="velvet-free-premium-upgrade__trial-price-row">
              <span className="velvet-free-premium-upgrade__trial-price-value">0</span>
              <span className="velvet-free-premium-upgrade__trial-price-currency">€</span>
            </div>
            <p className="velvet-free-premium-upgrade__trial-box-sub">
              Per i primi {SALON_PREMIUM_TRIAL_DAYS} giorni · nessun addebito oggi
            </p>
            <div className="velvet-free-premium-upgrade__trial-divider" aria-hidden />
            <p className="velvet-free-premium-upgrade__trial-then">
              Poi <strong>{premiumPlan.priceValue} €</strong> {premiumPlan.pricePeriod}
              <span className="velvet-free-premium-upgrade__trial-then-note"> · disdici quando vuoi</span>
            </p>
          </div>

          <p className="velvet-free-premium-upgrade__tagline">{premiumPlan.tagline}</p>

          <div className="velvet-free-premium-upgrade__preview">
            <SalonPremiumPlanCardPreview />
          </div>

          <ul className="velvet-free-premium-upgrade__highlights" aria-label="Perché passare a Premium">
            <li>Pannello di gestione completo da browser</li>
            <li>Scheda pubblica e pagina «Esplora» con il tuo brand</li>
            <li>Staff multi-operatore, notifiche e statistiche</li>
          </ul>

          {isNativePremiumBillingBlocked() ? (
            <p className="velvet-free-premium-upgrade__blocked">{NATIVE_PREMIUM_BILLING_BLOCKED_MESSAGE}</p>
          ) : !isAuthenticated ? (
            <p className="velvet-free-premium-upgrade__hint">
              Accedi con l&apos;account titolare del salone per avviare la prova gratuita.
            </p>
          ) : !isSalonTitolare ? (
            <p className="velvet-free-premium-upgrade__hint">
              La prova gratuita è riservata ai titolari del salone.
            </p>
          ) : null}

          {canStartCheckout ? (
            <Link to="/account/billing/checkout" className="velvet-free-premium-upgrade__cta">
              Inizia la prova gratuita
            </Link>
          ) : (
            <button type="button" className="velvet-free-premium-upgrade__cta" disabled>
              Inizia la prova gratuita
            </button>
          )}

          <p className="velvet-free-premium-upgrade__legal">
            Al termine dei {SALON_PREMIUM_TRIAL_DAYS} giorni l&apos;abbonamento prosegue a {premiumPlan.priceValue} €{" "}
            {premiumPlan.pricePeriod} salvo disdetta anticipata.
          </p>
        </article>

        <aside className="velvet-free-premium-upgrade__aside" aria-label="Cosa cambia con Premium">
          <section className="velvet-free-premium-upgrade__aside-card">
            <span className="velvet-free-premium-upgrade__aside-chip">Oggi</span>
            <h2 className="velvet-free-premium-upgrade__aside-title">Con Free</h2>
            <ul className="velvet-free-premium-upgrade__aside-list">
              <li>Agenda e servizi dall&apos;app mobile</li>
              <li>Profilo essenziale e layout piattaforma</li>
              <li>Nessun pannello web da browser</li>
            </ul>
          </section>
          <section className="velvet-free-premium-upgrade__aside-card velvet-free-premium-upgrade__aside-card--premium">
            <span className="velvet-free-premium-upgrade__aside-chip velvet-free-premium-upgrade__aside-chip--premium">
              Upgrade
            </span>
            <h2 className="velvet-free-premium-upgrade__aside-title">Con Premium</h2>
            <ul className="velvet-free-premium-upgrade__aside-list">
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
