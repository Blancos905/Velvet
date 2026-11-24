import type { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { CLIENT_ACCOUNT_ICONS } from "../../components/account/ClientAccountContentCard";
import { ClientAccountHeroHeader } from "../../components/account/ClientAccountHeroHeader";
import { SalonPremiumPanorama } from "../../components/salon/SalonPremiumPanorama";
import { LuxuryPremiumTrialRenewalPrompt } from "../../components/LuxuryPremiumTrialRenewalPrompt";
import { SALON_PLANS, planDisplayName, premiumTrialFreeLabel } from "../../data/salonPlans";
import { useEffectiveSalonPlanTier } from "../../hooks/useEffectiveSalonPlanTier";
import { useBillingStatusQuery, useSalonPremiumActive } from "../../hooks/useSalonFeaturePlanTier";
import { useMeSalonSummaryQuery } from "../../hooks/useMeSalonSummary";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../lib/clientAccountPageShellClasses";
import "../../styles/luxury-account-page-shell.css";
import "../../styles/luxury-consumer-bookings-page.css";
import "../../styles/luxury-info-privacy-hero.css";
import "../../styles/luxury-account-salon-services.css";
import "../../styles/luxury-salon-services-salon.css";
import "../../styles/salon-premium-panorama.css";
import "../../styles/luxury-salon-panorama-salon.css";

const PANORAMA_SHELL_CLASS = `luxury-account-page-shell luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-salon-panorama-account-shell luxury-salon-panorama-account-shell--salon-side ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`;

function SalonPanoramaHero({
  salonName,
  planLabel,
  subtitle,
}: {
  salonName: string;
  planLabel: string;
  subtitle?: ReactNode;
}) {
  return (
    <ClientAccountHeroHeader
      headlinePre="Panoramica "
      headlineAccent="salone"
      badgePrimary="Area salone"
      badgeSecondary={planLabel}
      kickerLabel={salonName.trim() || "Il tuo salone"}
      kickerChip="Piano Premium"
      subtitle={
        subtitle ?? (
          <>
            Riepilogo piano, <strong>aree funzionali</strong> e checklist per attivare la vetrina del salone.
          </>
        )
      }
      metaItems={[
        { icon: CLIENT_ACCOUNT_ICONS.calendar, label: "Agenda & prenotazioni" },
        { icon: CLIENT_ACCOUNT_ICONS.user, label: "Hub titolare" },
      ]}
    />
  );
}

/** Panoramica salone, aperta dal tasto dell’hub. Senza Premium attivo il titolare vede il percorso di attivazione. */
export default function AccountSalonHomePage() {
  const { isSalonTitolare, salonPlanHint } = useLuxuryAuth();
  const effectivePlan = useEffectiveSalonPlanTier();
  const billingStatus = useBillingStatusQuery();
  const isPremiumActive = useSalonPremiumActive();
  const checkoutAvailable = billingStatus.data?.configured === true;
  const meSalon = useMeSalonSummaryQuery();
  /** Nome commerciale da DB (`studio_groups.name`), stesso valore del campo «Nome del salone» in registrazione `/piani`. */
  const salonNameFromDb = meSalon.data?.primaryLocationName?.trim() ?? "";

  const planDef =
    SALON_PLANS.find((p) => p.tier === effectivePlan) ??
    SALON_PLANS.find((p) => p.tier === "PREMIUM") ??
    SALON_PLANS[0];
  const needsPremiumActivation = effectivePlan !== "PREMIUM" && effectivePlan !== "PLUS";
  const isPremiumPendingPayment = (effectivePlan === "PREMIUM" || effectivePlan === "PLUS") && !isPremiumActive;
  const commercialPlanLabel = planDisplayName(effectivePlan === "PLUS" ? "PLUS" : "PREMIUM");
  const subscriptionActivationRequired = billingStatus.data?.subscriptionActivationRequired === true;

  if (!isSalonTitolare) {
    return <Navigate to="/account/prenotazioni" replace />;
  }

  if (isPremiumPendingPayment && billingStatus.isPending) {
    return (
      <div className={PANORAMA_SHELL_CLASS}>
        <div className="luxury-consumer-bookings-dash__shell">
          <SalonPanoramaHero salonName={salonNameFromDb} planLabel={commercialPlanLabel} subtitle="Caricamento stato abbonamento…" />
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

  if (needsPremiumActivation) {
    return (
      <div className={PANORAMA_SHELL_CLASS}>
        <div className="luxury-consumer-bookings-dash__shell">
          <SalonPanoramaHero
            salonName={salonNameFromDb}
            planLabel="Premium"
            subtitle={
              <>
                L&apos;abbonamento Premium non è attivo. Attivalo per usare vetrina, chat e strumenti del salone.
                La prova include {premiumTrialFreeLabel()}.
              </>
            }
          />
          <p>
            <Link to="/piani?plan=PREMIUM" className="luxury-btn luxury-btn--primary">
              Attiva Premium
            </Link>
          </p>
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
        <SalonPanoramaHero salonName={salonNameFromDb} planLabel={commercialPlanLabel} />
        <SalonPremiumPanorama
          salonSide
          salonName={salonNameFromDb}
          planLabel={commercialPlanLabel}
          planTagline={planDef.tagline}
          planPriceLine={planPriceLine}
          showProvisionWarning={!meSalon.data?.provisioned && !salonPlanHint}
        />
      </div>
    </div>
  );
}
