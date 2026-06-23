import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { formatAvailabilitySlotInTimeZone } from "../lib/salonOpeningHours";
import "../styles/velvet-salon-booking-native-app.css";

type BookingConfirmedModalProps = {
  startIso: string;
  timeZone?: string;
  serviceName?: string;
  /** Richiesta inviata al salone, in attesa di accettazione. */
  pendingApproval?: boolean;
  onClose: () => void;
  onViewAppointment?: () => void;
};

export function BookingConfirmedModal({
  startIso,
  timeZone = "Europe/Rome",
  serviceName,
  pendingApproval = false,
  onClose,
  onViewAppointment,
}: BookingConfirmedModalProps) {
  const titleId = useId();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div
      className="velvet-booking-slots-modal__backdrop velvet-booking-confirm-modal__backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="velvet-booking-slots-modal__dialog velvet-booking-login-modal__dialog velvet-booking-confirm-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="velvet-booking-slots-modal__glow" aria-hidden="true" />
        <div className="velvet-booking-slots-modal__head">
          <button
            type="button"
            className="velvet-booking-slots-modal__close"
            onClick={onClose}
            aria-label="Chiudi"
          >
            <span className="velvet-booking-slots-modal__close-icon" aria-hidden="true">
              ×
            </span>
          </button>
          <p className="velvet-booking-slots-modal__eyebrow">Prenotazione</p>
          <h2 id={titleId} className="velvet-booking-confirm-modal__title">
            {pendingApproval ? "Richiesta inviata" : "Appuntamento confermato"}
          </h2>
        </div>
        <div className="velvet-booking-confirm-modal__panel">
          <p className="velvet-booking-confirm-modal__slot-label">
            {formatAvailabilitySlotInTimeZone(startIso, timeZone)}
          </p>
          {serviceName?.trim() ? (
            <p className="velvet-booking-confirm-modal__hint velvet-booking-confirm-modal__hint--service">
              {serviceName.trim()}
            </p>
          ) : null}
          {pendingApproval ? (
            <p className="velvet-booking-confirm-modal__hint">
              Il salone riceverà la tua richiesta. Ti invieremo una notifica quando l&apos;appuntamento sarà confermato
              o rifiutato.
            </p>
          ) : null}
          <div className="velvet-booking-confirm-modal__actions">
            {onViewAppointment ? (
              <>
                <button
                  type="button"
                  className="velvet-booking-confirm-modal__btn velvet-booking-confirm-modal__btn--cancel"
                  onClick={onClose}
                >
                  Chiudi
                </button>
                <button
                  type="button"
                  className="velvet-header-cta-pill velvet-header-btn-primary velvet-booking-confirm-modal__btn velvet-booking-confirm-modal__btn--confirm"
                  onClick={onViewAppointment}
                >
                  Vedi prenotazione
                </button>
              </>
            ) : (
              <button
                type="button"
                className="velvet-header-cta-pill velvet-header-btn-primary velvet-booking-confirm-modal__btn velvet-booking-confirm-modal__btn--confirm"
                onClick={onClose}
              >
                Chiudi
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
