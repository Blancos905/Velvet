import type { KeyboardEvent, MouseEvent } from "react";
import type { MeSalonNotificationMessage } from "../api/types";
import { messageToNotificationPopup, openVelvetNotificationPopup } from "../lib/velvetNotificationPopup";

type SalonNotificationMessageLineProps = {
  message: MeSalonNotificationMessage;
  categoryLabel: string;
  deleteLabel?: string;
  deleting?: boolean;
  onDelete: (messageId: string) => void;
};

export function SalonNotificationMessageLine({
  message,
  categoryLabel,
  deleteLabel = "Elimina",
  deleting = false,
  onDelete,
}: SalonNotificationMessageLineProps) {
  const openPopup = (event?: MouseEvent | KeyboardEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    openVelvetNotificationPopup(messageToNotificationPopup(message, categoryLabel));
  };

  const meta =
    message.status === "SENT" && message.sentAt
      ? `Inviata ${new Date(message.sentAt).toLocaleString("it-IT")}`
      : message.status === "PENDING"
        ? "In coda"
        : message.status;

  return (
    <li className="velvet-salon-notif-detail__line velvet-salon-notif-detail__line--interactive">
      <button
        type="button"
        className="velvet-salon-notif-detail__open"
        aria-label={`Apri notifica: ${message.previewLine}`}
        onClick={openPopup}
      >
        <span className="velvet-salon-notif-detail__text">{message.previewLine}</span>
        <span className="velvet-salon-notif-detail__meta" title={message.status}>
          {meta}
        </span>
      </button>
      <button
        type="button"
        className="velvet-btn velvet-btn--secondary velvet-salon-notif-detail__delete"
        title={`${deleteLabel} notifica`}
        aria-label={`${deleteLabel} notifica`}
        disabled={deleting}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDelete(message.id);
        }}
      >
        {deleting ? "…" : deleteLabel}
      </button>
    </li>
  );
}
