import { formatPriceEUR } from "../../lib/format";

export type ServiceRow = { name: string; count: number; revenue: number };

type TopServicesProps = {
  rows: ServiceRow[];
  totalBookings: number;
};

export default function TopServices({ rows, totalBookings }: TopServicesProps) {
  const denom = totalBookings > 0 ? totalBookings : 1;
  return (
    <section className="luxury-surface-card luxury-stats-metric-card luxury-stats-panel luxury-stats-pro-panel">
      <h2 className="luxury-stats-panel__title">Servizi più richiesti</h2>
      <p className="luxury-stats-panel__desc">Quota sul totale prenotazioni del mese corrente.</p>
      {rows.length === 0 ? (
        <p className="luxury-stats-metric-muted luxury-stats-panel__empty">Nessun servizio nel mese corrente.</p>
      ) : (
        <ul className="luxury-stats-services">
          {rows.map((s, idx) => (
            <li key={s.name} className="luxury-stats-services__row">
              <div className="luxury-stats-services__top">
                <span className="luxury-stats-services__rank">{idx + 1}</span>
                <span className="luxury-stats-services__name">{s.name}</span>
                <span className="luxury-stats-services__meta">
                  {s.count} · {formatPriceEUR(s.revenue)}
                </span>
              </div>
              <div className="luxury-stats-services__bar-track">
                <div className="luxury-stats-services__bar-fill" style={{ width: `${(s.count / denom) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
