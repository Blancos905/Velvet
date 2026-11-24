import type { AdPopupCampaign } from "../data/adPopups";
import "../styles/luxury-ad-popup.css";

type AdPopupModalProps = {
  campaign: AdPopupCampaign;
  onClose: () => void;
};

export function AdPopupModal({ campaign, onClose }: AdPopupModalProps) {
  return (
    <div
      className="luxury-ad-popup"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="luxury-ad-popup__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="luxury-ad-popup-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="luxury-ad-popup__close" onClick={onClose} aria-label="Chiudi">
          <span aria-hidden>×</span>
        </button>

        <p className="luxury-ad-popup__sponsored">In collaborazione · Sponsorizzato</p>

        <div className="luxury-ad-popup__media">
          <img
            src={campaign.imageSrc}
            alt={campaign.imageAlt}
            className="luxury-ad-popup__image"
            width={640}
            height={360}
            decoding="async"
          />
        </div>

        <p className="luxury-ad-popup__brand">{campaign.brandName}</p>
        <h2 id="luxury-ad-popup-title" className="luxury-ad-popup__title">
          {campaign.headline}
        </h2>
        <p className="luxury-ad-popup__body">{campaign.body}</p>

        <div className="luxury-ad-popup__actions">
          <a
            className="luxury-ad-popup__cta"
            href={campaign.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={onClose}
          >
            {campaign.ctaLabel}
          </a>
          <button type="button" className="luxury-ad-popup__dismiss" onClick={onClose}>
            Continua
          </button>
        </div>
      </div>
    </div>
  );
}
