import { INFO_PRIVACY_HERO_ICONS } from "./InfoPrivacyAccountHeroHeader";

export function ClientReviewsHeroHeader({
  pendingCount,
  historyCount,
}: {
  pendingCount?: number;
  historyCount?: number;
}) {
  return (
    <header className="luxury-info-privacy-hero__header">
      <div className="luxury-info-privacy-hero__aurora" aria-hidden />
      <div className="luxury-info-privacy-hero__shine" aria-hidden />
      <div className="luxury-info-privacy-hero__grid">
        <div className="luxury-info-privacy-hero__badges">
          <span className="luxury-info-privacy-hero__badge">
            <span className="luxury-info-privacy-hero__badge-dot" aria-hidden />
            Area cliente
          </span>
          <span className="luxury-info-privacy-hero__badge luxury-info-privacy-hero__badge--muted">Le tue opinioni</span>
        </div>
        <h1 className="luxury-consumer-bookings-dash__headline">
          <span className="luxury-consumer-bookings-dash__headline-pre">Le mie </span>
          <span className="luxury-consumer-bookings-dash__headline-accent">recensioni</span>
        </h1>
        <div className="luxury-info-privacy-hero__subtitle-card">
          <div className="luxury-info-privacy-hero__subtitle-kicker">
            <p className="luxury-info-privacy-hero__subtitle-label">Post-visita</p>
            <span className="luxury-info-privacy-hero__subtitle-chip">Salone e operatore</span>
          </div>
          <p className="luxury-info-privacy-hero__subtitle">
            Dopo ogni appuntamento puoi <strong>valutare salone e operatore</strong>.
          </p>
          <div className="luxury-info-privacy-hero__subtitle-foot">
            <span className="luxury-info-privacy-hero__subtitle-meta">
              {INFO_PRIVACY_HERO_ICONS.calendar}
              {pendingCount != null && pendingCount > 0
                ? `${pendingCount} ${pendingCount === 1 ? "visita da valutare" : "visite da valutare"}`
                : "Nessuna valutazione in sospeso"}
            </span>
            <span className="luxury-info-privacy-hero__subtitle-meta">
              {INFO_PRIVACY_HERO_ICONS.user}
              {historyCount != null && historyCount > 0
                ? `${historyCount} ${historyCount === 1 ? "recensione inviata" : "recensioni inviate"}`
                : "Storico recensioni"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
