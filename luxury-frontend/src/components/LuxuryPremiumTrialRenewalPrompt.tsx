import { Link } from "react-router-dom";
import { SALON_PLANS, premiumTrialEndPhrase, planDisplayName } from "../data/salonPlans";
import "../styles/luxury-premium-trial-renewal-prompt.css";

type LuxuryPremiumTrialRenewalPromptProps = {
  salonName?: string;
  trialEndsAt?: string | null;
  checkoutAvailable: boolean;
};

function formatTrialEnd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

/** Messaggio post-prova gratuita: attivazione abbonamento Premium in-app. */
export function LuxuryPremiumTrialRenewalPrompt({
  salonName,
  trialEndsAt,
  checkoutAvailable: _checkoutAvailable,
}: LuxuryPremiumTrialRenewalPromptProps) {
  const premiumPlan = SALON_PLANS.find((p) => p.tier === "PREMIUM");
  const trialEndLabel = formatTrialEnd(trialEndsAt);
  const planName = planDisplayName("PREMIUM");

  return (
    <div className="luxury-salon-services-page luxury-salon-panorama-account">
      <div className="luxury-salon-free-page">
        <div className="luxury-salon-free-page__layout luxury-salon-free-page__layout--promo-only">
          <aside className="luxury-salon-free-page__promo" aria-label="Continua con Saloni Luxury">
            <article className="luxury-premium-trial-renewal" aria-labelledby="luxury-premium-trial-renewal-title">
              <div className="luxury-premium-trial-renewal__glow" aria-hidden />
              <div className="luxury-premium-trial-renewal__rim" aria-hidden />

              <div className="luxury-premium-trial-renewal__inner">
                <span className="luxury-premium-trial-renewal__badge">Prova gratuita conclusa</span>
                <h1 id="luxury-premium-trial-renewal-title" className="luxury-premium-trial-renewal__title">
                  Vuoi continuare a utilizzare Saloni Luxury?
                </h1>
                <p className="luxury-premium-trial-renewal__lead">
                  {salonName ? (
                    <>
                      <strong>{salonName}</strong> ha usufruito del piano {planName} in prova
                      {trialEndLabel ? <> fino al {trialEndLabel}</> : null}. Per mantenere brand, vetrina, statistiche e
                      tutti gli strumenti Premium, attiva l&apos;abbonamento.
                    </>
                  ) : (
                    <>
                      {premiumTrialEndPhrase()} potrai mantenere brand, vetrina e strumenti avanzati attivando Premium.
                    </>
                  )}
                </p>

                <ul className="luxury-premium-trial-renewal__perks">
                  <li>Brand e layout vetrina personalizzati</li>
                  <li>Statistiche e gestione staff</li>
                  <li>Chat clienti e visibilità in ricerca</li>
                </ul>

                {premiumPlan?.priceValue ? (
                  <p className="luxury-premium-trial-renewal__price">
                    Abbonamento {planName}: <strong>{premiumPlan.priceValue} €</strong>{" "}
                    {premiumPlan.pricePeriod ?? "al mese"}
                  </p>
                ) : null}

                <div className="luxury-premium-trial-renewal__actions">
                  <Link to="/account/billing/checkout" className="luxury-premium-trial-renewal__cta">
                    Procedi
                  </Link>
                  <p className="luxury-premium-trial-renewal__hint">
                    Completerai i dati di fatturazione e procederai al checkout sicuro con Stripe. Continuando accetti i{" "}
                    <Link to="/termini" className="luxury-premium-trial-renewal__legal-link">
                      Termini di servizio
                    </Link>{" "}
                    e l&apos;{" "}
                    <Link to="/privacy" className="luxury-premium-trial-renewal__legal-link">
                      Informativa privacy saloni
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </article>
          </aside>
        </div>
      </div>
    </div>
  );
}
