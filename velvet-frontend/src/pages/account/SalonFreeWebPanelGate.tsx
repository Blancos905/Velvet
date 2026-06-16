import { Link } from "react-router-dom";
import { SaloniLuxuryLogoMark } from "../../components/SaloniLuxuryLogoMark";
import { SUBSCRIPTION_GUARDS_SNAPSHOT } from "../../lib/subscription-guards";
import "../../styles/salon-free-web-panel-gate.css";

/**
 * Titolare piano Free su browser: card informativa al posto del pannello account.
 */
export function SalonFreeWebPanelGate() {
  const message = SUBSCRIPTION_GUARDS_SNAPSHOT.messages.freeOwnerWebPanel;
  return (
    <main className="velvet-auth-page velvet-free-web-panel-gate" aria-labelledby="velvet-free-web-panel-gate-title">
      <div className="velvet-auth-card velvet-free-web-panel-gate__card">
        <div className="velvet-free-web-panel-gate__mark">
          <SaloniLuxuryLogoMark variant="default" />
        </div>
        <p className="velvet-free-web-panel-gate__kicker">Account titolare · Piano Free</p>
        <h1 id="velvet-free-web-panel-gate-title" className="velvet-auth-title velvet-free-web-panel-gate__title">
          Pannello web riservato a Premium
        </h1>
        <p className="velvet-free-web-panel-gate__body">{message}</p>
        <div className="velvet-free-web-panel-gate__actions">
          <Link to="/piani" className="velvet-btn velvet-btn--primary velvet-free-web-panel-gate__cta">
            Vedi piani e attiva Premium
          </Link>
          <Link to="/" className="velvet-free-web-panel-gate__back">
            Torna al sito
          </Link>
        </div>
      </div>
    </main>
  );
}
