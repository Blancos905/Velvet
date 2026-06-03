import { Link } from "react-router-dom";
import {
  SalonPremiumPanorama,
  SALON_PREMIUM_PANORAMA_PARTNER_CHECKLIST_KEY,
} from "../components/salon/SalonPremiumPanorama";
import { SALON_PLANS, planDisplayName } from "../data/salonPlans";
import "../styles/velvet-search-page.css";
import "../styles/velvet-legal-public.css";

/** `/partner`: anteprima panoramica Premium. */
export default function PartnerPage() {
  const premiumPlan = SALON_PLANS.find((p) => p.tier === "PREMIUM");
  const planTagline = premiumPlan?.tagline ?? "";

  return (
    <main className="velvet-page-main velvet-search-page velvet-partner-panorama-public">
      <div className="velvet-search-back-row">
        <Link to="/" className="velvet-search-back">
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

      <SalonPremiumPanorama
        layoutVariant="public"
        checklistStorageKey={SALON_PREMIUM_PANORAMA_PARTNER_CHECKLIST_KEY}
        salonName="Diventa partner"
        planLabel={planDisplayName("PREMIUM")}
        planTagline={planTagline}
        planPriceLine={null}
        showProvisionWarning={false}
      />

      <nav className="velvet-legal-public__nav velvet-partner-panorama-public__legal" aria-label="Documenti legali partner">
        <Link to="/privacy" className="velvet-legal-public__nav-link">
          Privacy saloni (B2B)
        </Link>
        <Link to="/privacy/staff" className="velvet-legal-public__nav-link">
          Privacy staff
        </Link>
        <Link to="/termini" className="velvet-legal-public__nav-link">
          Termini di servizio
        </Link>
        <Link to="/privacy/scelte" className="velvet-legal-public__nav-link">
          Scelte privacy
        </Link>
        <Link to="/privacy/cookie" className="velvet-legal-public__nav-link">
          Informativa cookie
        </Link>
        <Link to="/privacy/elimina-account" className="velvet-legal-public__nav-link">
          Elimina account
        </Link>
        <Link to="/legale" className="velvet-legal-public__nav-link">
          Requisiti store
        </Link>
      </nav>
    </main>
  );
}
