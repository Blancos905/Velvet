import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useLuxuryT } from "../../i18n/useLuxuryLocale";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Popup della card Plus: stesso contenuto di Premium, più ciò che Plus aggiunge.
 */
export function SalonPlusPlanInfoModal({ open, onClose }: Props) {
  const t = useLuxuryT();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const premiumItems = [
    t("plans.plus.infoPremiumBrand"),
    t("plans.plus.infoPremiumSite"),
    t("plans.plus.infoPremiumStats"),
    t("plans.plus.infoPremiumPanel"),
  ];
  const addedItems = [t("plans.plus.infoAddsVisibility"), t("plans.plus.infoAddsChosen")];

  return createPortal(
    <div
      className="luxury-plans-modal-root"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="luxury-plans-modal luxury-plus-info-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="luxury-plus-info-modal__head">
          <h2 id={titleId} className="luxury-plans-modal__title">
            {t("plans.plus.infoTitle")}
          </h2>
          <button type="button" className="luxury-plans-modal__close" onClick={onClose} aria-label={t("plans.plus.infoClose")}>
            ×
          </button>
        </div>
        <p className="luxury-plus-info-modal__lead">{t("plans.plus.infoLead")}</p>
        <p className="luxury-plus-info-modal__price">{t("plans.plus.infoPrice")}</p>
        <div className="luxury-plus-info-modal__panel">
          <h3 className="luxury-plus-info-modal__section">{t("plans.plus.infoPremiumTitle")}</h3>
          <ul className="luxury-plus-info-modal__list">
            {premiumItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="luxury-plus-info-modal__panel luxury-plus-info-modal__panel--added">
          <h3 className="luxury-plus-info-modal__section">{t("plans.plus.infoAddsTitle")}</h3>
          <ul className="luxury-plus-info-modal__list luxury-plus-info-modal__list--added">
            {addedItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>,
    document.body,
  );
}
