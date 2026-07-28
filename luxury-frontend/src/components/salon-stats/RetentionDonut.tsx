type RetentionDonutProps = {
  /** Percentuale clienti abituali (0–100). */
  returningPct: number | null;
  loading: boolean;
};

export default function RetentionDonut({ returningPct, loading }: RetentionDonutProps) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const ret = returningPct != null ? Math.max(0, Math.min(100, returningPct)) : 0;
  const dashOrange = (ret / 100) * c;

  return (
    <section className="luxury-surface-card luxury-stats-metric-card luxury-stats-panel luxury-stats-pro-panel">
      <h2 className="luxury-stats-panel__title">Fidelizzazione clienti</h2>
      <p className="luxury-stats-panel__desc">
        Tra i clienti con appuntamento nel mese: abituali (prima visita registrata prima di questo mese) vs nuovi
        (prima visita in questo mese, nei dati disponibili).
      </p>
      {loading ? (
        <p className="luxury-stats-metric-muted luxury-stats-panel__empty" style={{ margin: 0 }}>
          Calcolo…
        </p>
      ) : returningPct == null ? (
        <p className="luxury-stats-metric-muted luxury-stats-panel__empty" style={{ margin: 0 }}>
          Nessun dato sufficiente per il grafico.
        </p>
      ) : (
        <div className="luxury-stats-donut">
          <div className="luxury-stats-donut__chart">
            <svg viewBox="0 0 48 48" className="luxury-stats-donut__svg" aria-hidden>
              <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth="6" />
              <circle
                cx="24"
                cy="24"
                r={r}
                fill="none"
                stroke="rgb(249, 115, 22)"
                strokeWidth="6"
                strokeDasharray={`${dashOrange} ${c}`}
                strokeLinecap="round"
                transform="rotate(-90 24 24)"
              />
            </svg>
            <div className="luxury-stats-donut__center">
              <strong className="luxury-stats-donut__pct">{Math.round(ret)}%</strong>
              <span className="luxury-stats-donut__hint">tasso di ritorno</span>
            </div>
          </div>
          <ul className="luxury-stats-donut__legend">
            <li>
              <i className="luxury-stats-donut__swatch luxury-stats-donut__swatch--ret" /> Clienti abituali{" "}
              <strong>{Math.round(ret)}%</strong>
            </li>
            <li>
              <i className="luxury-stats-donut__swatch luxury-stats-donut__swatch--new" /> Nuovi nel mese{" "}
              <strong>{Math.round(100 - ret)}%</strong>
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}
