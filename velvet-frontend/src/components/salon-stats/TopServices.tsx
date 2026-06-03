import { formatPriceEUR } from "../../lib/format";

export type ServiceRow = { name: string; count: number; revenue: number };

type TopServicesProps = {
  rows: ServiceRow[];
  totalBookings: number;
};

export default function TopServices({ rows, totalBookings }: TopServicesProps) {
  const denom = totalBookings > 0 ? totalBookings : 1;
  return (
    <section className="velvet-surface-card velvet-stats-metric-card velvet-stats-panel velvet-stats-pro-panel">
      <h2 className="velvet-stats-panel__title">Servizi più richiesti</h2>
      <p className="velvet-stats-panel__desc">Quota sul totale prenotazioni del mese corrente.</p>
      {rows.length === 0 ? (
        <p className="velvet-stats-metric-muted velvet-stats-panel__empty">Nessun servizio nel mese corrente.</p>
      ) : (
        <ul className="velvet-stats-services">
          {rows.map((s, idx) => (
            <li key={s.name} className="velvet-stats-services__row">
              <div className="velvet-stats-services__top">
                <span className="velvet-stats-services__rank">{idx + 1}</span>
                <span className="velvet-stats-services__name">{s.name}</span>
                <span className="velvet-stats-services__meta">
                  {s.count} · {formatPriceEUR(s.revenue)}
                </span>
              </div>
              <div className="velvet-stats-services__bar-track">
                <div className="velvet-stats-services__bar-fill" style={{ width: `${(s.count / denom) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
