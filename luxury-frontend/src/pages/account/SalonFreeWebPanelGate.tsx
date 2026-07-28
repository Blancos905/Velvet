import { Link } from "react-router-dom";
import { SaloniLuxuryLogoMark } from "../../components/SaloniLuxuryLogoMark";
import { SUBSCRIPTION_GUARDS_SNAPSHOT } from "../../lib/subscription-guards";
import "../../styles/salon-free-web-panel-gate.css";

/**
 * Titolare piano Free su browser: card informativa al posto del pannello account.
 */
export function SalonFreeWebPanelGate() {
  const { kicker, title, lead, premiumHint, freeAppFeatures } =
    SUBSCRIPTION_GUARDS_SNAPSHOT.messages.freeOwnerWebPanel;

  return (
    <main className="luxury-auth-page luxury-free-web-panel-gate" aria-labelledby="luxury-free-web-panel-gate-title">
      <div className="luxury-auth-card luxury-free-web-panel-gate__card">
        <div className="luxury-free-web-panel-gate__mark">
          <SaloniLuxuryLogoMark variant="default" />
        </div>
        <p className="luxury-free-web-panel-gate__kicker">{kicker}</p>
        <h1 id="luxury-free-web-panel-gate-title" className="luxury-auth-title luxury-free-web-panel-gate__title">
          {title}
        </h1>
        <p className="luxury-free-web-panel-gate__lead">{lead}</p>

        <div className="luxury-free-web-panel-gate__panel" aria-label="Cosa include il piano Free in app">
          <p className="luxury-free-web-panel-gate__panel-label">Disponibile ora in app</p>
          <ul className="luxury-free-web-panel-gate__feature-list">
            {freeAppFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>

        <div className="luxury-free-web-panel-gate__premium-panel">
          <span className="luxury-free-web-panel-gate__premium-badge" aria-hidden>
            Premium
          </span>
          <p className="luxury-free-web-panel-gate__premium-copy">{premiumHint}</p>
        </div>

        <div className="luxury-free-web-panel-gate__actions">
          <Link to="/piani/premium-prova" className="luxury-btn luxury-btn--primary luxury-free-web-panel-gate__cta">
            Scopri Premium e provalo gratis
          </Link>
          <Link to="/" className="luxury-free-web-panel-gate__back">
            Torna al sito
          </Link>
        </div>
      </div>
    </main>
  );
}
