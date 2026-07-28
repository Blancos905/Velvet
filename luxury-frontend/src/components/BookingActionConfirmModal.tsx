import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import "../styles/luxury-salon-booking-native-app.css";

export type BookingActionConfirmModalProps = {
  open: boolean;
  eyebrow?: string;
  title: string;
  detail?: string;
  hint?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function BookingActionConfirmModal({
  open,
  eyebrow = "Conferma",
  title,
  detail,
  hint,
  confirmLabel = "Conferma",
  cancelLabel = "Annulla",
  busy = false,
  onConfirm,
  onCancel,
}: BookingActionConfirmModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="luxury-booking-slots-modal__backdrop luxury-booking-confirm-modal__backdrop"
      role="presentation"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        className="luxury-booking-slots-modal__dialog luxury-booking-login-modal__dialog luxury-booking-confirm-modal__dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={hint ? `${titleId}-hint` : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="luxury-booking-slots-modal__glow" aria-hidden="true" />
        <div className="luxury-booking-slots-modal__head">
          <button
            type="button"
            className="luxury-booking-slots-modal__close"
            onClick={onCancel}
            disabled={busy}
            aria-label="Chiudi"
          >
            <span className="luxury-booking-slots-modal__close-icon" aria-hidden="true">
              ×
            </span>
          </button>
          <p className="luxury-booking-slots-modal__eyebrow">{eyebrow}</p>
          <h2 id={titleId} className="luxury-booking-confirm-modal__title">
            {title}
          </h2>
        </div>
        <div className="luxury-booking-confirm-modal__panel">
          {detail ? <p className="luxury-booking-confirm-modal__slot-label">{detail}</p> : null}
          {hint ? (
            <p id={`${titleId}-hint`} className="luxury-booking-confirm-modal__hint">
              {hint}
            </p>
          ) : null}
          <div className="luxury-booking-confirm-modal__actions">
            <button
              type="button"
              className="luxury-booking-confirm-modal__btn luxury-booking-confirm-modal__btn--cancel"
              onClick={onCancel}
              disabled={busy}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className="luxury-header-cta-pill luxury-header-btn-primary luxury-booking-confirm-modal__btn luxury-booking-confirm-modal__btn--confirm"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? "Attendere…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
