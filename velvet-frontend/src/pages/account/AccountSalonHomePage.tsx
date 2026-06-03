import { Link, Navigate } from "react-router-dom";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { SalonLocationMapCard } from "../../components/salon/SalonLocationMapCard";
import { SalonPremiumPanorama } from "../../components/salon/SalonPremiumPanorama";
import { SALON_PLANS, planDisplayName } from "../../data/salonPlans";
import { useEffectiveSalonPlanTier } from "../../hooks/useEffectiveSalonPlanTier";
import { useMeSalonReviewsQuery } from "../../hooks/useMeSalonReviews";
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
  const { isSalonTitolare, salonPlanHint } = useVelvetAuth();
  const effectivePlan = useEffectiveSalonPlanTier();
  const meSalon = useMeSalonSummaryQuery();
  const salonReviews = useMeSalonReviewsQuery(isSalonTitolare);
  /** Nome commerciale da DB (`studio_groups.name`), stesso valore del campo «Nome del salone» in registrazione `/piani`. */
  const salonNameFromDb = meSalon.data?.primaryLocationName?.trim() ?? "";

  const planDef = SALON_PLANS.find((p) => p.tier === effectivePlan) ?? SALON_PLANS[0];
  const isBase = effectivePlan === "BASE";

  const recentReviewers = salonReviews.data?.slice(0, 3) ?? [];

  if (!isSalonTitolare) {
    return <Navigate to="/account/home" replace />;
  }

  if (isBase) {
    return (
      <>
        <AccountSalonPanoramaHero subtitle="Piano Free: scheda standard in ricerca; qui sotto sede sulla mappa, recensioni e invito a Premium." />
        <div className="velvet-salon-services-page velvet-salon-panorama-account">
          <div className="velvet-salon-free-page">
            <div className="velvet-salon-free-page__layout">
              <div className="velvet-salon-free-page__primary">
                {meSalon.isPending ? (
                  <p className="velvet-account-salone-free-intro velvet-account-salone-free-intro--hero">Caricamento…</p>
                ) : salonNameFromDb ? (
                  <p className="velvet-account-salone-free-intro velvet-account-salone-free-intro--hero">
                    Il salone collegato al tuo account si chiama <strong>{salonNameFromDb}</strong> (come indicato in
                    registrazione). Per agenda e dati usa i pulsanti in alto. In ricerca i clienti aprono la tua scheda
                    Luxury già impaginata: sul piano Free è la stessa struttura per tutti, senza strumenti per cambiare grafica
                    o layout—solo ciò che serve a farti trovare e prenotare.
                  </p>
                ) : (
                  <p className="velvet-account-salone-free-intro velvet-account-salone-free-intro--hero">
                    Per agenda e dati del salone usa i pulsanti in alto. Se il nome del salone non compare, attendi un
                    attimo dopo il login oppure verifica che la registrazione sia andata a buon fine. In ricerca i clienti
                    aprono la tua scheda Luxury già impaginata: sul piano Free è la stessa struttura per tutti, senza strumenti
                    per cambiare grafica o layout—solo ciò che serve a farti trovare e prenotare.
                  </p>
                )}
                <div style={{ marginTop: "1.35rem" }}>
                  <SalonLocationMapCard meSalon={meSalon.data} isPending={meSalon.isPending} compact heading="Posizione del salone" />
                </div>
                <div className="velvet-surface-card velvet-salon-services-form-card" style={{ marginTop: "1rem" }}>
                  <h2 className="velvet-card-title">Ultime recensioni ricevute</h2>
                  {salonReviews.isPending ? (
                    <p className="velvet-text-muted" style={{ margin: 0 }}>
                      Caricamento recensioni...
                    </p>
                  ) : recentReviewers.length ? (
                    <p className="velvet-text-muted" style={{ margin: 0, lineHeight: 1.55 }}>
                      {recentReviewers.map((r) => r.reviewerName).join(", ")} hanno lasciato una recensione.
                      <Link to="/account/feedback-velvet" className="velvet-link-inline" style={{ marginLeft: 6 }}>
                        Apri storico recensioni
                      </Link>
                    </p>
                  ) : (
                    <p className="velvet-text-muted" style={{ margin: 0 }}>
                      Nessuna recensione ricevuta per ora.
                    </p>
                  )}
                </div>
              </div>

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
                  <Link to="/piani" className="velvet-free-upgrade-card__cta">
                    Vedi piani e attiva Premium
                  </Link>
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
