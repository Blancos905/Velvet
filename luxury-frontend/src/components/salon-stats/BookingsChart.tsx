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
  /** Arancio per dashboard super admin; default viola (statistiche salone). */
  tone?: "violet" | "orange";
  showBarValues?: boolean;
};

export default function BookingsChart({
  title,
  subtitle,
  monthlySeries,
  trendMax,
  barGradientId,
  loading,
  compareLine,
  tone = "violet",
  showBarValues = false,
}: BookingsChartProps) {
  const gradientStops =
    tone === "orange"
      ? (
          <>
            <stop offset="0%" stopColor="rgba(251, 146, 60, 0.98)" />
            <stop offset="100%" stopColor="rgba(234, 88, 12, 0.38)" />
          </>
        )
      : (
          <>
            <stop offset="0%" stopColor="rgba(120, 103, 255, 0.95)" />
            <stop offset="100%" stopColor="rgba(173, 121, 255, 0.35)" />
          </>
        );
  const axisColor = tone === "orange" ? "rgba(253, 186, 116, 0.35)" : "rgba(103, 101, 138, 0.35)";
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
                  {gradientStops}
                </linearGradient>
              </defs>
              <line x1="2" y1="38" x2="98" y2="38" stroke={axisColor} strokeWidth="0.4" />
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
                    {showBarValues && row.count > 0 ? (
                      <text
                        x={x + slot / 2}
                        y={Math.max(4, y - 1.2)}
                        textAnchor="middle"
                        className="luxury-stats-month-chart__value"
                      >
                        {row.count}
                      </text>
                    ) : null}
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
