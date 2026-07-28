import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { BarChart2, CalendarDays, Globe, LayoutDashboard, Palette, Sparkles } from "lucide-react";
import type { SalonPlanTaglineContent, SalonPlanTier } from "../../data/salonPlans";

type Props = {
  tier: SalonPlanTier;
  content: SalonPlanTaglineContent;
  /** Variante pagina upgrade Free → Premium. */
  variant?: "card" | "upgrade";
};

const HIGHLIGHT_ICONS: Partial<Record<string, LucideIcon>> = {
  "Agenda essenziale": CalendarDays,
  "Credibilità quotidiana": Sparkles,
  "Brand personalizzato": Palette,
  "Sito del salone": Globe,
  Statistiche: BarChart2,
  "Pannello web completo": LayoutDashboard,
};

/**
 * Tagline piano con lead tipografica e pillole evidenziate (card `/piani` e upgrade).
 */
export function SalonPlanCardTagline({ tier, content, variant = "card" }: Props) {
  const rootClass = [
    "luxury-plan-card__tagline",
    `luxury-plan-card__tagline--${tier.toLowerCase()}`,
    variant === "upgrade" ? "luxury-plan-card__tagline--upgrade" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} aria-label={content.lead}>
      <p className="luxury-plan-card__tagline-lead">{content.lead}</p>
      <ul className="luxury-plan-card__tagline-pills" aria-label={content.highlights.join(", ")}>
        {content.highlights.map((label, index) => {
          const Icon = HIGHLIGHT_ICONS[label];
          return (
            <li
              key={label}
              className="luxury-plan-card__tagline-pill"
              style={{ "--pill-i": index } as CSSProperties}
            >
              {Icon ? (
                <span className="luxury-plan-card__tagline-pill-icon" aria-hidden>
                  <Icon strokeWidth={2.15} />
                </span>
              ) : null}
              <span className="luxury-plan-card__tagline-pill-text">{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
