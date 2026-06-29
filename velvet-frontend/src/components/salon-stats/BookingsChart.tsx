import type { ReactNode } from "react";

export type MonthlyCountPoint = { key: string; count: number; label: string };

type BookingsChartProps = {
  title: string;
  subtitle: string;
  monthlySeries: MonthlyCountPoint[];
  trendMax: number;
  barGradientId: string;
  loading: boolean;
  compareLine: ReactNode;
};

export default function BookingsChart({
  title,
  subtitle,
  monthlySeries,
  trendMax,
  barGradientId,
  loading,
  compareLine,
}: BookingsChartProps) {
  return (
    <section className="luxury-stats-pro-panel luxury-stats-metric-card">
      <div className="luxury-stats-chart-card__head">
        <h2 className="luxury-stats-chart-card__title">{title}</h2>
        <p className="luxury-stats-chart-card__subtitle">{subtitle}</p>
      </div>
      {loading ? (
        <p className="luxury-stats-metric-muted luxury-stats-chart-card__loading">Caricamento serie storica…</p>
      ) : (
        <>
          <div className="luxury-stats-month-chart" role="img" aria-label="Grafico a barre appuntamenti per mese">
            <svg viewBox="0 0 100 42" className="luxury-stats-month-chart__svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(120, 103, 255, 0.95)" />
                  <stop offset="100%" stopColor="rgba(173, 121, 255, 0.35)" />
                </linearGradient>
              </defs>
              <line x1="2" y1="38" x2="98" y2="38" stroke="rgba(103, 101, 138, 0.35)" strokeWidth="0.4" />
              {monthlySeries.map((row, i) => {
                const n = monthlySeries.length;
                const gap = 1.2;
                const slot = (96 - gap * (n - 1)) / n;
                const x = 2 + i * (slot + gap);
                const hMax = 32;
                const barH = trendMax === 0 ? 0 : (row.count / trendMax) * hMax;
                const y = 38 - barH;
                return (
                  <g key={row.key}>
                    <rect
                      x={x}
                      y={y}
                      width={slot}
                      height={barH || 0.4}
                      rx="0.8"
                      fill={`url(#${barGradientId})`}
                      opacity={barH === 0 ? 0.35 : 1}
                    />
                  </g>
                );
              })}
            </svg>
            <div className="luxury-stats-month-chart__labels">
              {monthlySeries.map((row) => (
                <span key={row.key} className="luxury-stats-month-chart__lab">
                  {row.label}
                </span>
              ))}
            </div>
          </div>
          <div className="luxury-stats-chart-card__compare">{compareLine}</div>
        </>
      )}
    </section>
  );
}
