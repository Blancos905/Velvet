import { createPortal } from "react-dom";
import { SalonPremiumOwnerInfoPrivacyContent } from "../../pages/account/SalonPremiumOwnerInfoPrivacyContent";
import "../../styles/luxury-info-privacy-premium.css";

type SalonPremiumOwnerInfoPrivacyModalProps = {
  open: boolean;
  onClose: () => void;
  salonName?: string | null;
  supportEmail?: string | null;
  showAccountActions?: boolean;
};

export function SalonPremiumOwnerInfoPrivacyModal({
  open,
  onClose,
  salonName,
  supportEmail,
  showAccountActions = true,
}: SalonPremiumOwnerInfoPrivacyModalProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="luxury-info-privacy-premium-modal-root"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="luxury-info-privacy-premium-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="luxury-info-privacy-premium-modal-title"
      >
        <div className="luxury-info-privacy-premium-modal__toolbar">
          <h2 id="luxury-info-privacy-premium-modal-title" className="luxury-info-privacy-premium-modal__title">
            Informativa privacy partner
          </h2>
          <button type="button" className="luxury-info-privacy-premium-modal__close" onClick={onClose}>
            Chiudi
          </button>
        </div>
        <SalonPremiumOwnerInfoPrivacyContent
          supportEmail={supportEmail}
          salonName={salonName}
          showAccountActions={showAccountActions}
        />
      </div>
    </div>,
    document.body,
  );
}
