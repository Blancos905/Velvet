import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { formatAvailabilitySlotInTimeZone } from "../lib/salonOpeningHours";
import "../styles/luxury-salon-booking-native-app.css";

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
      className="luxury-booking-slots-modal__backdrop luxury-booking-confirm-modal__backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="luxury-booking-slots-modal__dialog luxury-booking-login-modal__dialog luxury-booking-confirm-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="luxury-booking-slots-modal__glow" aria-hidden="true" />
        <div className="luxury-booking-slots-modal__head">
          <button
            type="button"
            className="luxury-booking-slots-modal__close"
            onClick={onClose}
            aria-label="Chiudi"
          >
            <span className="luxury-booking-slots-modal__close-icon" aria-hidden="true">
              ×
            </span>
          </button>
          <p className="luxury-booking-slots-modal__eyebrow">Prenotazione</p>
          <h2 id={titleId} className="luxury-booking-confirm-modal__title">
            {pendingApproval ? "Richiesta inviata" : "Appuntamento confermato"}
          </h2>
        </div>
        <div className="luxury-booking-confirm-modal__panel">
          <p className="luxury-booking-confirm-modal__slot-label">
            {formatAvailabilitySlotInTimeZone(startIso, timeZone)}
          </p>
          {serviceName?.trim() ? (
            <p className="luxury-booking-confirm-modal__hint luxury-booking-confirm-modal__hint--service">
              {serviceName.trim()}
            </p>
          ) : null}
          {pendingApproval ? (
            <p className="luxury-booking-confirm-modal__hint">
              Il salone riceverà la tua richiesta. Ti invieremo una notifica quando l&apos;appuntamento sarà confermato
              o rifiutato.
            </p>
          ) : (
            <p className="luxury-booking-confirm-modal__hint">
              La prenotazione è confermata. La trovi nell&apos;elenco dei tuoi appuntamenti.
            </p>
          )}
          <div className="luxury-booking-confirm-modal__actions">
            {onViewAppointment ? (
              <>
                <button
                  type="button"
                  className="luxury-booking-confirm-modal__btn luxury-booking-confirm-modal__btn--cancel"
                  onClick={onClose}
                >
                  Chiudi
                </button>
                <button
                  type="button"
                  className="luxury-header-cta-pill luxury-header-btn-primary luxury-booking-confirm-modal__btn luxury-booking-confirm-modal__btn--confirm"
                  onClick={onViewAppointment}
                >
                  Vedi prenotazione
                </button>
              </>
            ) : (
              <button
                type="button"
                className="luxury-header-cta-pill luxury-header-btn-primary luxury-booking-confirm-modal__btn luxury-booking-confirm-modal__btn--confirm"
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
