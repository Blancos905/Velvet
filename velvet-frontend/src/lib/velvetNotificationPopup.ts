import type { MeSalonNotificationMessage } from "../api/types";

export type VelvetNotificationPopupPayload = {
  id?: string;
  title: string;
  body: string;
  notificationType?: string;
  status?: string;
  sentAt?: string | null;
  clientName?: string;
  appointmentId?: string | null;
  /** Alert urgente salone/operatore: layout interattivo + suono. */
  urgent?: boolean;
  playSound?: boolean;
};

const SALON_INTERACTIVE_ALERT_TYPES = new Set([
  "BOOKING_CREATED_FOR_SALON",
  "BOOKING_UPDATED",
  "BOOKING_CANCELLED_BY_CONSUMER",
]);

export function isSalonInteractiveAlertType(type: string | undefined): boolean {
  return Boolean(type && SALON_INTERACTIVE_ALERT_TYPES.has(type));
}

export function salonAlertTitleForType(type: string | undefined): string {
  switch (type) {
    case "BOOKING_CREATED_FOR_SALON":
      return "Richiesta prenotazione";
    case "BOOKING_UPDATED":
      return "Orario cambiato";
    case "BOOKING_CANCELLED_BY_CONSUMER":
      return "Prenotazione disdetta";
    default:
      return humanizeNotificationType(type);
  }
}

export function salonAlertBannerForType(type: string | undefined): string {
  switch (type) {
    case "BOOKING_CREATED_FOR_SALON":
      return "Nuova richiesta — rispondi subito";
    case "BOOKING_UPDATED":
      return "Orario cambiato — controlla l'agenda";
    case "BOOKING_CANCELLED_BY_CONSUMER":
      return "Disdetta cliente — controlla l'agenda";
    default:
      return "Aggiornamento prenotazione";
  }
}

export const VELVET_NOTIFICATION_OPEN_EVENT = "velvet-notification-open";
const PENDING_POPUP_STORAGE_KEY = "velvet.pendingNotificationPopup";

type PopupListener = (payload: VelvetNotificationPopupPayload) => void;

let popupListener: PopupListener | null = null;
const pendingPopups: VelvetNotificationPopupPayload[] = [];

function drainPendingPopups(): void {
  if (!popupListener || pendingPopups.length === 0) return;
  while (pendingPopups.length > 0) {
    const next = pendingPopups.shift();
    if (next) popupListener(next);
  }
}

export function registerVelvetNotificationPopupListener(listener: PopupListener | null): void {
  popupListener = listener;
  drainPendingPopups();
}

export function openVelvetNotificationPopup(payload: VelvetNotificationPopupPayload): void {
  if (typeof window === "undefined") return;
  if (!payload.title?.trim() && !payload.body?.trim()) return;

  if (popupListener) {
    popupListener(payload);
  } else {
    pendingPopups.push(payload);
  }

  window.dispatchEvent(new CustomEvent(VELVET_NOTIFICATION_OPEN_EVENT, { detail: payload }));
}

export function storePendingNotificationPopup(payload: VelvetNotificationPopupPayload): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_POPUP_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export function consumePendingNotificationPopup(): VelvetNotificationPopupPayload | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_POPUP_STORAGE_KEY);
    sessionStorage.removeItem(PENDING_POPUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VelvetNotificationPopupPayload;
    if (!parsed?.title?.trim() && !parsed?.body?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function humanizeNotificationType(type: string | undefined): string {
  if (!type) return "Notifica";
  switch (type) {
    case "BOOKING_CREATED_FOR_SALON":
      return "Richiesta prenotazione";
    case "BOOKING_CONFIRMATION":
      return "Conferma prenotazione";
    case "BOOKING_UPDATED":
      return "Prenotazione aggiornata";
    case "BOOKING_CANCELLED_BY_CONSUMER":
    case "BOOKING_CANCELLED_BY_SALON":
    case "BOOKING_CANCELLED":
      return "Prenotazione annullata";
    case "REMINDER_24H":
      return "Promemoria 24 ore";
    case "REMINDER_1H":
      return "Promemoria 2 ore";
    case "REVIEW_INVITE":
      return "Invito recensione";
    case "ADMIN_PLATFORM_MESSAGE":
      return "Messaggio Luxury";
    case "SUPPORT_REQUEST_TO_VELVET":
      return "Richiesta assistenza";
    default:
      return type.replaceAll("_", " ").toLowerCase();
  }
}

export function messageToNotificationPopup(
  message: MeSalonNotificationMessage,
  categoryLabel?: string,
): VelvetNotificationPopupPayload {
  const interactive = isSalonInteractiveAlertType(message.notificationType);
  const title =
    categoryLabel?.trim()
    || (interactive ? salonAlertTitleForType(message.notificationType) : humanizeNotificationType(message.notificationType));
  return {
    id: message.id,
    title,
    body: message.previewLine,
    notificationType: message.notificationType,
    status: message.status,
    sentAt: message.sentAt,
    clientName: message.clientName,
    appointmentId: message.appointmentId,
    urgent: interactive,
    playSound: true,
  };
}

export function normalizePushNotificationOpen(raw: unknown): VelvetNotificationPopupPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const map = raw as Record<string, unknown>;
  const title = typeof map.title === "string" ? map.title.trim() : "";
  const body = typeof map.body === "string" ? map.body.trim() : "";
  const notificationType = typeof map.type === "string" ? map.type.trim() : undefined;
  const id = typeof map.notificationId === "string" ? map.notificationId.trim() : undefined;
  const appointmentId = typeof map.appointmentId === "string" ? map.appointmentId.trim() : null;
  if (!title && !body && !notificationType) return null;
  const interactive = isSalonInteractiveAlertType(notificationType);
  return {
    id: id || undefined,
    title: title || salonAlertTitleForType(notificationType),
    body: body || title || "Nuova notifica",
    notificationType,
    appointmentId,
    urgent: interactive,
    playSound: true,
  };
}
