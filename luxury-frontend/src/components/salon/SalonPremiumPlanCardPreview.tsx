import type { LucideIcon } from "lucide-react";
import { BarChart2, Bell, Globe, Users } from "lucide-react";
import { SALON_PREMIUM_PANORAMA_FEATURES } from "../../data/salonPremiumPanoramaContent";

const FEATURE_ICONS: LucideIcon[] = [Globe, Bell, Users, BarChart2];

const FEATURE_LABELS = ["Brand & vetrina", "Notifiche", "Staff & agenda", "Statistiche"] as const;

/**
 * Anteprima statica (pagina `/piani`, card Premium) allineata ai blocchi della panoramica salone Premium.
 */
export function SalonPremiumPlanCardPreview() {
  return (
    <div className="luxury-plan-premium-preview">
      <header className="luxury-plan-premium-preview__head">
        <h3 className="luxury-plan-premium-preview__title">Cosa include</h3>
        <span className="luxury-plan-premium-preview__chip">4 aree</span>
      </header>

      <ul className="luxury-plan-premium-preview__grid" aria-label="Funzionalità Premium">
        {SALON_PREMIUM_PANORAMA_FEATURES.map((f, i) => {
          const Icon = FEATURE_ICONS[i] ?? Globe;
          const label = FEATURE_LABELS[i] ?? f.text.split(".")[0];

          return (
            <li key={f.text} className="luxury-plan-premium-preview__item">
              <span className="luxury-plan-premium-preview__icon" aria-hidden>
                <Icon strokeWidth={2.1} />
              </span>
              <div className="luxury-plan-premium-preview__item-body">
                <span className="luxury-plan-premium-preview__item-label">{label}</span>
                <span className="luxury-plan-premium-preview__item-text">{f.text}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
