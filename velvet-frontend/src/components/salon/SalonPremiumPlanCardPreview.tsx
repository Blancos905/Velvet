import {
  SALON_PREMIUM_PANORAMA_FEATURES,
  SALON_PREMIUM_PANORAMA_STEPS,
} from "../../data/salonPremiumPanoramaContent";

/**
 * Anteprima statica (pagina `/piani`, card Premium) allineata ai blocchi della panoramica salone Premium.
 */
export function SalonPremiumPlanCardPreview() {
  return (
    <div className="velvet-plan-premium-preview">
      <div className="velvet-plan-premium-preview__row">
        <span className="velvet-plan-premium-preview__chip">4 aree</span>
      </div>

      <ul className="velvet-plan-premium-preview__features">
        {SALON_PREMIUM_PANORAMA_FEATURES.map((f) => (
          <li key={f.text} className="velvet-plan-premium-preview__feature">
            {f.text}
          </li>
        ))}
      </ul>

      <ul className="velvet-plan-premium-preview__steps">
        {SALON_PREMIUM_PANORAMA_STEPS.map((s) => (
          <li key={s.id} className="velvet-plan-premium-preview__step">
            <span className="velvet-plan-premium-preview__step-text">{s.text}</span>
            <span className="velvet-plan-premium-preview__step-action">{s.actionLabel}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
