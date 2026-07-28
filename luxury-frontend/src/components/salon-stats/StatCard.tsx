import type { ComponentType, SVGProps } from "react";
import type { LucideIcon } from "lucide-react";

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number }>;

export type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  subValue: string;
  trend?: number | null;
  trendUp?: boolean;
  className?: string;
};

export default function StatCard({ icon: Icon, label, value, subValue, trend, trendUp, className }: StatCardProps) {
  const IconRender = Icon as unknown as IconComp;
  const showTrend = trend != null && Number.isFinite(trend);
  return (
    <article className={["luxury-stats-pro-card", className].filter(Boolean).join(" ")}>
      <div className="luxury-stats-pro-card__head">
        <span className="luxury-stats-pro-card__label">{label}</span>
        <span className="luxury-stats-pro-card__icon-wrap" aria-hidden>
          <IconRender className="luxury-stats-pro-card__icon" strokeWidth={2} />
        </span>
      </div>
      <strong className="luxury-stats-pro-card__value">{value}</strong>
      <p className="luxury-stats-pro-card__sub">{subValue}</p>
      {showTrend ? (
        <span
          className={
            "luxury-stats-pro-card__trend " +
            (trendUp === false ? "luxury-stats-pro-card__trend--down" : "luxury-stats-pro-card__trend--up")
          }
        >
          {trendUp === false ? "↓" : "↑"} {trend > 0 ? `+${trend}` : trend}% vs mese scorso
        </span>
      ) : null}
    </article>
  );
}
