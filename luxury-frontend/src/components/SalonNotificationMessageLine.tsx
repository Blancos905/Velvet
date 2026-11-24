import type { KeyboardEvent, MouseEvent } from "react";
import type { MeSalonNotificationMessage } from "../api/types";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import {
  messageToNotificationPopup,
  openLuxuryNotificationPopup,
  resolveSalonNotificationViewerRole,
} from "../lib/luxuryNotificationPopup";

type SalonNotificationMessageLineProps = {
  message: MeSalonNotificationMessage;
  categoryLabel: string;
  deleteLabel?: string;
  deleting?: boolean;
  onDelete: (messageId: string) => void;
};

function notificationPreviewLine(message: MeSalonNotificationMessage): string {
  const line = message.previewLine?.trim();
  if (line) return line;
  const client = message.clientName?.trim();
  if (client) return `Notifica — ${client}`;
  return "Notifica prenotazione";
}

export function SalonNotificationMessageLine({
  message,
  categoryLabel,
  deleteLabel = "Elimina",
  deleting = false,
  onDelete,
}: SalonNotificationMessageLineProps) {
  const { isSalonStaff, isSalonTitolare } = useLuxuryAuth();
  const viewerRole = resolveSalonNotificationViewerRole(isSalonStaff, isSalonTitolare);

  const openPopup = (event?: MouseEvent | KeyboardEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    // Riapertura dallo storico: solo popup, senza chime/suono urgente.
    openLuxuryNotificationPopup({
      ...messageToNotificationPopup(message, categoryLabel, viewerRole),
      playSound: false,
    });
  };

  const previewLine = notificationPreviewLine(message);

  const meta =
    message.status === "SENT" && message.sentAt
      ? `Inviata ${new Date(message.sentAt).toLocaleString("it-IT")}`
      : message.status === "PENDING"
        ? "In coda"
        : message.status;

  return (
    <li className="luxury-salon-notif-detail__line luxury-salon-notif-detail__line--interactive">
      <button
        type="button"
        className="luxury-salon-notif-detail__open"
        aria-label={`Apri notifica: ${previewLine}`}
        onClick={openPopup}
      >
        <span className="luxury-salon-notif-detail__text">{previewLine}</span>
        <span className="luxury-salon-notif-detail__meta" title={message.status} data-status={message.status}>
          {meta}
        </span>
      </button>
      <button
        type="button"
        className="luxury-salon-notif-detail__delete"
        title={`${deleteLabel} notifica`}
        aria-label={`${deleteLabel} notifica`}
        disabled={deleting}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDelete(message.id);
        }}
      >
        <span className="luxury-salon-notif-detail__delete-icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M9 3h6l1 2h4v2H4V5h4l1-2zM6 9h12l-1 11H7L6 9z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="luxury-salon-notif-detail__delete-label">{deleting ? "…" : deleteLabel}</span>
      </button>
    </li>
  );
}
