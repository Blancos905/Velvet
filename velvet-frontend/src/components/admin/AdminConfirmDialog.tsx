import { useId } from "react";

export type AdminConfirmDialogVariant = "default" | "danger";

export type AdminConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  subject?: string;
  subjectLabel?: string;
  warningNotes?: string[];
  variant?: AdminConfirmDialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function DangerIcon() {
  return (
    <svg
      className="luxury-admin-confirm-dialog__icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AdminConfirmDialog({
  open,
  title,
  message,
  subject,
  subjectLabel,
  warningNotes,
  variant = "default",
  confirmLabel = "Conferma",
  cancelLabel = "Annulla",
  busy = false,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  const titleId = useId();
  const isDanger = variant === "danger";

  if (!open) return null;

  return (
    <div
      className={`luxury-plans-modal-root luxury-admin-confirm-dialog-root${isDanger ? " luxury-admin-confirm-dialog-root--danger" : ""}`}
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className={`luxury-plans-modal luxury-admin-confirm-dialog${isDanger ? " luxury-admin-confirm-dialog--danger" : ""}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-desc`}
      >
        {isDanger ? (
          <div className="luxury-admin-confirm-dialog__hero" aria-hidden>
            <span className="luxury-admin-confirm-dialog__icon-ring">
              <span className="luxury-admin-confirm-dialog__icon">
                <DangerIcon />
              </span>
            </span>
          </div>
        ) : null}

        <div className="luxury-plans-modal__head luxury-admin-confirm-dialog__head">
          <div className="luxury-admin-confirm-dialog__title-block">
            {isDanger ? (
              <p className="luxury-admin-confirm-dialog__kicker">Azione irreversibile</p>
            ) : null}
            <h2 id={titleId} className="luxury-plans-modal__title luxury-admin-confirm-dialog__title">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="luxury-plans-modal__close luxury-admin-confirm-dialog__close"
            onClick={onCancel}
            disabled={busy}
            aria-label="Chiudi"
          >
            ×
          </button>
        </div>

        {subject ? (
          <p className="luxury-admin-confirm-dialog__subject" aria-label="Elemento interessato">
            {subjectLabel ? (
              <span className="luxury-admin-confirm-dialog__subject-label">{subjectLabel}</span>
            ) : null}
            <span className="luxury-admin-confirm-dialog__subject-name">{subject}</span>
          </p>
        ) : null}

        <div
          id={`${titleId}-desc`}
          className={`luxury-admin-confirm-dialog__body${isDanger ? " luxury-admin-confirm-dialog__body--danger" : ""}`}
        >
          <p className="luxury-plans-modal__intro luxury-admin-confirm-dialog__message">{message}</p>
          {warningNotes && warningNotes.length > 0 ? (
            <ul className="luxury-admin-confirm-dialog__warnings">
              {warningNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="luxury-plans-modal__actions luxury-admin-confirm-dialog__actions">
          <button
            type="button"
            className={`luxury-plan-cta luxury-plan-cta--secondary luxury-admin-confirm-dialog__cancel${isDanger ? " luxury-admin-confirm-dialog__cancel--danger" : ""}`}
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`luxury-plan-cta luxury-admin-confirm-dialog__confirm${isDanger ? " luxury-admin-confirm-dialog__confirm--danger" : " luxury-admin-btn--danger"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Attendere…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
