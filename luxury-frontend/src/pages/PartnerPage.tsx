import { Link, Navigate } from "react-router-dom";
import {
  SalonPremiumPanorama,
  SALON_PREMIUM_PANORAMA_PARTNER_CHECKLIST_KEY,
} from "../components/salon/SalonPremiumPanorama";
import { SALON_PLANS, planDisplayName } from "../data/salonPlans";
import { useLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";
import "../styles/luxury-search-page.css";
import "../styles/luxury-legal-public.css";

/** `/partner`: anteprima panoramica Premium. In app nativa → registrazione salone su `/piani`. */
export default function PartnerPage() {
  const isNativeApp = useLuxuryNativeAppShell();
  if (isNativeApp) {
    return <Navigate to="/piani" replace />;
  }

  const premiumPlan = SALON_PLANS.find((p) => p.tier === "PREMIUM");
  const planTagline = premiumPlan?.tagline ?? "";

  return (
    <main className="luxury-page-main luxury-search-page luxury-partner-panorama-public">
      <div className="luxury-search-back-row">
        <Link to="/" className="luxury-search-back">
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

      <SalonPremiumPanorama
        layoutVariant="public"
        checklistStorageKey={SALON_PREMIUM_PANORAMA_PARTNER_CHECKLIST_KEY}
        salonName="Diventa partner"
        planLabel={planDisplayName("PREMIUM")}
        planTagline={planTagline}
        planPriceLine={null}
        showProvisionWarning={false}
      />

      <nav className="luxury-legal-public__nav luxury-partner-panorama-public__legal" aria-label="Documenti legali partner">
        <Link to="/privacy" className="luxury-legal-public__nav-link">
          Privacy saloni (B2B)
        </Link>
        <Link to="/privacy/staff" className="luxury-legal-public__nav-link">
          Privacy staff
        </Link>
        <Link to="/termini" className="luxury-legal-public__nav-link">
          Termini di servizio
        </Link>
        <Link to="/privacy/scelte" className="luxury-legal-public__nav-link">
          Scelte privacy
        </Link>
        <Link to="/privacy/cookie" className="luxury-legal-public__nav-link">
          Informativa cookie
        </Link>
        <Link to="/privacy/elimina-account" className="luxury-legal-public__nav-link">
          Elimina account
        </Link>
        <Link to="/legale" className="luxury-legal-public__nav-link">
          Requisiti store
        </Link>
      </nav>
    </main>
  );
}
