import { useMemo, useState } from "react";
import {
  AD_POPUP_DEMO_PLACEHOLDERS,
  pickAdPopupForZone,
  pickRandomAdPopupForZone,
  type AdPopupZone,
} from "../data/adPopups";
import { hasSeenAdPopup, markAdPopupSeen } from "../lib/adPopupGate";
import "../styles/luxury-ad-soft.css";

const SOFT_ZONES: readonly AdPopupZone[] = [
  "client_profile",
  "client_bookings",
  "client_home",
];

type AdSoftPlacementProps = {
  zone: "client_profile" | "client_bookings" | "client_home";
  /** `profile` = card più presente; `strip` = barra compatta in fondo pagina. */
  variant?: "profile" | "strip";
};

/**
 * Inserzione soft (non popup): dismissibile, max 1 volta / giorno per campagna.
 * Pensata per area cliente senza interrompere il flusso.
 */
export function AdSoftPlacement({ zone, variant = "strip" }: AdSoftPlacementProps) {
  const campaign = useMemo(() => {
    if (!SOFT_ZONES.includes(zone)) return null;
    return AD_POPUP_DEMO_PLACEHOLDERS
      ? pickRandomAdPopupForZone(zone)
      : pickAdPopupForZone(zone);
  }, [zone]);

  const [hidden, setHidden] = useState(false);

  if (!campaign || hidden) return null;
  if (hasSeenAdPopup(campaign.id, campaign.frequency ?? "once_per_day")) return null;

  const dismiss = () => {
    markAdPopupSeen(campaign.id, campaign.frequency ?? "once_per_day");
    setHidden(true);
  };

  const isProfile = variant === "profile";

  return (
    <aside
      className={`luxury-ad-soft${isProfile ? " luxury-ad-soft--profile" : " luxury-ad-soft--strip"}`}
      aria-label={`In collaborazione con ${campaign.brandName}`}
    >
      <p className="luxury-ad-soft__label">In collaborazione</p>
      <button type="button" className="luxury-ad-soft__close" onClick={dismiss} aria-label="Nascondi suggerimento">
        ×
      </button>

      <div className="luxury-ad-soft__row">
        <img
          src={campaign.imageSrc}
          alt=""
          className="luxury-ad-soft__thumb"
          width={isProfile ? 200 : 120}
          height={isProfile ? 112 : 68}
          decoding="async"
        />
        <div className="luxury-ad-soft__copy">
          <p className="luxury-ad-soft__brand">{campaign.brandName}</p>
          <p className="luxury-ad-soft__headline">{campaign.headline}</p>
          {isProfile ? <p className="luxury-ad-soft__body">{campaign.body}</p> : null}
          <a
            className="luxury-ad-soft__cta"
            href={campaign.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={dismiss}
          >
            {campaign.ctaLabel}
          </a>
        </div>
      </div>
    </aside>
  );
}
