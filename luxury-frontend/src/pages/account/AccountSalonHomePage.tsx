import { Link, Navigate, useLocation } from "react-router-dom";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { CLIENT_ACCOUNT_ICONS } from "../../components/account/ClientAccountContentCard";
import { ClientAccountHeroHeader } from "../../components/account/ClientAccountHeroHeader";
import { SalonPremiumPanorama } from "../../components/salon/SalonPremiumPanorama";
import { LuxuryPremiumTrialRenewalPrompt } from "../../components/LuxuryPremiumTrialRenewalPrompt";
import { SALON_PLANS, planDisplayName, premiumTrialFreeLabel, SALON_PREMIUM_TRIAL_DAYS } from "../../data/salonPlans";
import { useEffectiveSalonPlanTier } from "../../hooks/useEffectiveSalonPlanTier";
import { useLuxuryNativeAppShell } from "../../hooks/useLuxuryNativeAppShell";
import { useBillingStatusQuery, useSalonPremiumActive } from "../../hooks/useSalonFeaturePlanTier";
import { useMeSalonSummaryQuery } from "../../hooks/useMeSalonSummary";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../lib/clientAccountPageShellClasses";
import { normalizeAccountPath } from "../../lib/nativeAccountHubPaths";
import "../../styles/luxury-account-page-shell.css";
import "../../styles/luxury-consumer-bookings-page.css";
import "../../styles/luxury-info-privacy-hero.css";
import "../../styles/luxury-account-salon-services.css";
import "../../styles/luxury-salon-services-salon.css";
import "../../styles/salon-premium-panorama.css";
import "../../styles/salon-free-welcome.css";
import "../../styles/luxury-salon-panorama-salon.css";

const PANORAMA_SHELL_CLASS = `luxury-account-page-shell luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-salon-panorama-account-shell luxury-salon-panorama-account-shell--salon-side ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`;
const FREE_PANORAMA_TEASER_PATH = "/account/salone/panoramica";

function SalonPanoramaHero({
  salonName,
  planLabel,
  isBase,
  subtitle,
}: {
  salonName: string;
  planLabel: string;
  isBase: boolean;
  subtitle?: string;
}) {
  return (
    <ClientAccountHeroHeader
      headlinePre="Panoramica "
      headlineAccent="salone"
      badgePrimary="Area salone"
      badgeSecondary={planLabel}
      kickerLabel={salonName.trim() || "Il tuo salone"}
      kickerChip={isBase ? "Piano Free" : "Piano Premium"}
      subtitle={
        subtitle ?? (
          <>
            {isBase ? (
              <>
                Riepilogo del piano <strong>Free</strong> e passaggio a Premium per sbloccare logo, layout e metriche.
              </>
            ) : (
              <>
                Riepilogo piano, <strong>aree funzionali</strong> e checklist per attivare la vetrina del salone.
              </>
            )}
          </>
        )
      }
      metaItems={[
        { icon: CLIENT_ACCOUNT_ICONS.calendar, label: isBase ? "Upgrade disponibile" : "Agenda & prenotazioni" },
        { icon: CLIENT_ACCOUNT_ICONS.user, label: "Hub titolare" },
      ]}
    />
  );
}

/** Home salone (`/account/salone`) per piani **Free** e **Premium**. */
export default function AccountSalonHomePage() {
  const location = useLocation();
  const accountPath = normalizeAccountPath(location.pathname);
  const { isSalonTitolare, salonPlanHint } = useLuxuryAuth();
  const isNativeApp = useLuxuryNativeAppShell();
  const effectivePlan = useEffectiveSalonPlanTier();
  const billingStatus = useBillingStatusQuery();
  const isPremiumActive = useSalonPremiumActive();
  const checkoutAvailable = billingStatus.data?.configured === true;
  const meSalon = useMeSalonSummaryQuery();
  /** Nome commerciale da DB (`studio_groups.name`), stesso valore del campo «Nome del salone» in registrazione `/piani`. */
  const salonNameFromDb = meSalon.data?.primaryLocationName?.trim() ?? "";

  const planDef = SALON_PLANS.find((p) => p.tier === effectivePlan) ?? SALON_PLANS[0];
  const isBase = effectivePlan === "BASE";
  const isPremiumPendingPayment = effectivePlan === "PREMIUM" && !isPremiumActive;
  const subscriptionActivationRequired = billingStatus.data?.subscriptionActivationRequired === true;
  const isFreePanoramaTeaserRoute = accountPath === FREE_PANORAMA_TEASER_PATH;

  if (!isSalonTitolare) {
    return <Navigate to="/account/prenotazioni" replace />;
  }

  /* Premium: la panoramica completa resta su /account/salone. */
  if (!isBase && isFreePanoramaTeaserRoute) {
    return <Navigate to="/account/salone" replace />;
  }

  if (isPremiumPendingPayment && billingStatus.isPending) {
    return (
      <div className={PANORAMA_SHELL_CLASS}>
        <div className="luxury-consumer-bookings-dash__shell">
          <SalonPanoramaHero salonName={salonNameFromDb} planLabel={planDisplayName(effectivePlan)} isBase={false} subtitle="Caricamento stato abbonamento…" />
          <p aria-live="polite">Caricamento…</p>
        </div>
      </div>
    );
  }

  if (
    subscriptionActivationRequired &&
    billingStatus.data?.promotionalTrialActive === false &&
    !checkoutAvailable
  ) {
    return (
      <LuxuryPremiumTrialRenewalPrompt
        salonName={salonNameFromDb}
        trialEndsAt={billingStatus.data?.promotionalTrialEndsAt}
        checkoutAvailable={checkoutAvailable}
      />
    );
  }

  if (isPremiumPendingPayment && checkoutAvailable) {
    return <Navigate to="/account/billing/checkout" replace />;
  }

  if (isBase) {
    /* Titolare Free: form Premium precompilato (`/piani?plan=PREMIUM`), poi checkout Stripe. */
    const premiumUpgradeTo = "/piani?plan=PREMIUM";
    const freePanoramaTeaser = (
      <div className="luxury-salon-free-page">
        <div className="luxury-salon-free-page__layout luxury-salon-free-page__layout--promo-only">
          <aside className="luxury-salon-free-page__promo" aria-label="Panoramica Premium">
            <article className="luxury-free-upgrade-card" aria-labelledby="luxury-free-upgrade-title">
              <div className="luxury-free-upgrade-card__mesh" aria-hidden />
              <div className="luxury-free-upgrade-card__rim" aria-hidden />
              <div className="luxury-free-upgrade-card__shine" aria-hidden />
              <div className="luxury-free-upgrade-card__inner">
                <div className="luxury-free-upgrade-card__head">
                  <span className="luxury-free-upgrade-card__badge">{premiumTrialFreeLabel()}</span>
                  <span className="luxury-free-upgrade-card__spark" aria-hidden />
                </div>
                <h2 id="luxury-free-upgrade-title" className="luxury-free-upgrade-card__title">
                  La panoramica intera del salone si apre con Premium
                </h2>
                <p className="luxury-free-upgrade-card__lede">
                  Con Free resti sull’essenziale: hub, agenda e gestione quotidiana. Passa a Premium e prova tutto
                  gratis per {SALON_PREMIUM_TRIAL_DAYS} giorni — panoramica completa, vetrina, metriche e strumenti
                  avanzati, senza addebiti oggi.
                </p>
                <ul className="luxury-free-upgrade-card__perks">
                  <li>{SALON_PREMIUM_TRIAL_DAYS} giorni di prova gratuita</li>
                  <li>Panoramica e checklist operative</li>
                  <li>Logo, foto e layout vetrina</li>
                  <li>Notifiche e metriche della giornata</li>
                </ul>
                <div className="luxury-free-upgrade-card__actions">
                  <Link to={premiumUpgradeTo} className="luxury-free-upgrade-card__cta">
                    Prova Premium gratis {SALON_PREMIUM_TRIAL_DAYS} giorni
                  </Link>
                </div>
              </div>
            </article>
          </aside>
        </div>
      </div>
    );

    /*
     * App Free: hub `/account/salone` = solo bottoni; teaser solo su `/account/salone/panoramica` (tap Panoramica).
     * Web Free: teaser sulla home salone.
     */
    if (isNativeApp) {
      if (!isFreePanoramaTeaserRoute) {
        return null;
      }
      return (
        <div className={`${PANORAMA_SHELL_CLASS} luxury-salon-panorama-account-shell--free-native-teaser`}>
          <div className="luxury-consumer-bookings-dash__shell">{freePanoramaTeaser}</div>
        </div>
      );
    }

    return (
      <div className={PANORAMA_SHELL_CLASS}>
        <div className="luxury-consumer-bookings-dash__shell">
          <SalonPanoramaHero
            salonName={salonNameFromDb}
            planLabel={planDisplayName(effectivePlan)}
            isBase
            subtitle={
              <>
                Premium include {premiumTrialFreeLabel()}. Qui sotto trovi il passaggio in un tap.
              </>
            }
          />
          <div className="luxury-salon-services-page luxury-salon-services-page--salon-side luxury-salon-panorama-account luxury-salon-panorama-account--salon-side">
            {freePanoramaTeaser}
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
    <div className={PANORAMA_SHELL_CLASS}>
      <div className="luxury-consumer-bookings-dash__shell">
        <SalonPanoramaHero salonName={salonNameFromDb} planLabel={planDisplayName(effectivePlan)} isBase={false} />
        <SalonPremiumPanorama
          salonSide
          salonName={salonNameFromDb}
          planLabel={planDisplayName(effectivePlan)}
          planTagline={planDef.tagline}
          planPriceLine={planPriceLine}
          showProvisionWarning={!meSalon.data?.provisioned && !salonPlanHint}
        />
      </div>
    </div>
  );
}
