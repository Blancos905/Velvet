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
};

export default function StatCard({ icon: Icon, label, value, subValue, trend, trendUp }: StatCardProps) {
  const IconRender = Icon as unknown as IconComp;
  const showTrend = trend != null && Number.isFinite(trend);
  return (
    <article className="velvet-stats-pro-card">
      <div className="velvet-stats-pro-card__head">
        <span className="velvet-stats-pro-card__label">{label}</span>
        <span className="velvet-stats-pro-card__icon-wrap" aria-hidden>
          <IconRender className="velvet-stats-pro-card__icon" strokeWidth={2} />
        </span>
      </div>
      <strong className="velvet-stats-pro-card__value">{value}</strong>
      <p className="velvet-stats-pro-card__sub">{subValue}</p>
      {showTrend ? (
        <span
          className={
            "velvet-stats-pro-card__trend " +
            (trendUp === false ? "velvet-stats-pro-card__trend--down" : "velvet-stats-pro-card__trend--up")
          }
        >
          {trendUp === false ? "↓" : "↑"} {trend > 0 ? `+${trend}` : trend}% vs mese scorso
        </span>
      ) : null}
    </article>
  );
}
