import type { MeSalonNotificationMessage } from "../api/types";

export type LuxuryNotificationPopupPayload = {
  id?: string;
  title: string;
  body: string;
  notificationType?: string;
  status?: string;
  sentAt?: string | null;
  clientName?: string;
  appointmentId?: string | null;
  serviceName?: string | null;
  operatorName?: string | null;
  appointmentStart?: string | null;
  previousAppointmentStart?: string | null;
  /** Stato appuntamento (BOOKED / CONFIRMED / …) — disabilita Accetta se non più in attesa. */
  appointmentStatus?: string | null;
  /** Layout/suono prominente: richiesta operatore o disdetta cliente (solo informativo). */
  urgent?: boolean;
  /** Solo operatore STAFF: mostra Accetta/Rifiuta nel modale. */
  canRespond?: boolean;
  playSound?: boolean;
};

const SALON_BOOKING_REQUEST_TYPES = new Set([
  "BOOKING_CREATED_FOR_SALON",
  "BOOKING_RESCHEDULED_BY_CONSUMER",
]);

const SALON_OWNER_INFO_TYPES = new Set([
  "BOOKING_CREATED_FOR_SALON",
  "BOOKING_UPDATED",
  "BOOKING_CANCELLED_BY_CONSUMER",
  "BOOKING_REJECTED_BY_OPERATOR",
]);

const SALON_APPOINTMENT_INFO_TYPES = new Set([
  "BOOKING_UPDATED",
  "BOOKING_CANCELLED_BY_CONSUMER",
]);

const CONSUMER_APPOINTMENT_ALERT_TYPES = new Set([
  "BOOKING_CONFIRMATION",
  "BOOKING_UPDATED",
  "BOOKING_CANCELLED_BY_SALON",
  "BOOKING_CANCELLED_BY_CONSUMER",
  "BOOKING_REQUEST_REJECTED",
]);

const CANCELLATION_ALERT_TYPES = new Set([
  "BOOKING_CANCELLED_BY_CONSUMER",
  "BOOKING_CANCELLED_BY_SALON",
  "BOOKING_CANCELLED",
]);

export function isSalonBookingRequestType(type: string | undefined): boolean {
  return Boolean(type && SALON_BOOKING_REQUEST_TYPES.has(type));
}

/** Eventi consumer visibili al titolare come sola informativa (con operatore in copy backend). */
export function isSalonOwnerConsumerEventType(type: string | undefined): boolean {
  return Boolean(type && SALON_OWNER_INFO_TYPES.has(type));
}

export type SalonNotificationViewerRole = "owner" | "staff";

/** Modale Accetta/Rifiuta: solo account operatore (STAFF senza OWNER) su richieste ancora BOOKED. */
export function canRespondToSalonBookingRequest(
  type: string | undefined,
  role: SalonNotificationViewerRole,
  appointmentStatus?: string | null,
): boolean {
  if (role !== "staff" || !isSalonBookingRequestType(type)) return false;
  const status = appointmentStatus?.trim().toUpperCase();
  /* Push legacy senza status: lascia Accetta (l'API rifiuta se già gestita). */
  if (!status) return true;
  return status === "BOOKED";
}

/** Disdetta cliente: modale urgente informativo solo per l'operatore assegnato. */
export function isSalonUrgentInfoType(type: string | undefined): boolean {
  return type === "BOOKING_CANCELLED_BY_CONSUMER";
}

/** Popup automatico operatore: richieste + disdetta del proprio appuntamento. */
export function isSalonStaffPopupType(type: string | undefined): boolean {
  return isSalonBookingRequestType(type) || isSalonUrgentInfoType(type);
}

export function resolveSalonPopupUrgent(
  type: string | undefined,
  role: SalonNotificationViewerRole,
  appointmentStatus?: string | null,
): boolean {
  if (role !== "staff") return false;
  return canRespondToSalonBookingRequest(type, role, appointmentStatus) || isSalonUrgentInfoType(type);
}

export function resolveSalonNotificationViewerRole(
  isSalonStaff: boolean,
  isSalonTitolare: boolean,
): SalonNotificationViewerRole {
  return isSalonStaff && !isSalonTitolare ? "staff" : "owner";
}

export function isSalonAppointmentInfoType(type: string | undefined): boolean {
  return Boolean(type && SALON_APPOINTMENT_INFO_TYPES.has(type));
}

export function isConsumerAppointmentAlertType(type: string | undefined): boolean {
  return Boolean(type && CONSUMER_APPOINTMENT_ALERT_TYPES.has(type));
}

export function isCancellationAlertType(type: string | undefined): boolean {
  return Boolean(type && CANCELLATION_ALERT_TYPES.has(type));
}

export function isConfirmationAlertType(type: string | undefined): boolean {
  return type === "BOOKING_CONFIRMATION";
}

export function isAppointmentAlertType(type: string | undefined): boolean {
  return (
    isSalonBookingRequestType(type)
    || isSalonAppointmentInfoType(type)
    || isConsumerAppointmentAlertType(type)
  );
}

/** Popup prominente lato salone/operatore (richieste + avvisi informativi agenda). */
export function isSalonInteractiveAlertType(type: string | undefined): boolean {
  return isSalonBookingRequestType(type) || isSalonAppointmentInfoType(type);
}

/** Suono insistente per richieste operatore; chime breve per tutte le altre notifiche con playSound. */
export function resolveNotificationPopupSoundMode(
  payload: LuxuryNotificationPopupPayload,
): "request" | "chime" | "none" {
  if (payload.playSound === false) return "none";
  if (payload.canRespond || payload.urgent === true) {
    return "request";
  }
  return "chime";
}

export function shouldPlayOperatorAlertSound(payload: LuxuryNotificationPopupPayload): boolean {
  return resolveNotificationPopupSoundMode(payload) === "request";
}

export function shouldPlayNotificationChime(payload: LuxuryNotificationPopupPayload): boolean {
  return resolveNotificationPopupSoundMode(payload) === "chime";
}

function inferSalonSideNotificationType(type: string | undefined): boolean {
  return isSalonBookingRequestType(type) || isSalonAppointmentInfoType(type);
}

export function salonAlertTitleForType(type: string | undefined): string {
  switch (type) {
    case "BOOKING_CREATED_FOR_SALON":
      return "Richiesta prenotazione";
    case "BOOKING_RESCHEDULED_BY_CONSUMER":
      return "Cambio orario prenotazione";
    case "BOOKING_UPDATED":
      return "Orario cambiato";
    case "BOOKING_CANCELLED_BY_CONSUMER":
      return "Appuntamento annullato";
    case "BOOKING_REJECTED_BY_OPERATOR":
      return "Richiesta rifiutata";
    case "REVIEW_RECEIVED_FOR_SALON":
      return "Nuova recensione cliente";
    default:
      return humanizeNotificationType(type);
  }
}

export function consumerAlertTitleForType(type: string | undefined): string {
  switch (type) {
    case "BOOKING_CONFIRMATION":
      return "Conferma appuntamento";
    case "BOOKING_REQUEST_REJECTED":
      return "Richiesta non confermata";
    case "BOOKING_UPDATED":
      return "Orario aggiornato";
    case "BOOKING_CANCELLED_BY_SALON":
    case "BOOKING_CANCELLED_BY_CONSUMER":
    case "BOOKING_CANCELLED":
      return "Appuntamento annullato";
    default:
      return humanizeNotificationType(type);
  }
}

export function appointmentAlertTitleForType(type: string | undefined, salonSide: boolean): string {
  return salonSide ? salonAlertTitleForType(type) : consumerAlertTitleForType(type);
}

export function salonAlertBannerForType(
  type: string | undefined,
  options?: { canRespond?: boolean },
): string {
  switch (type) {
    case "BOOKING_CREATED_FOR_SALON":
      return options?.canRespond ? "Nuova richiesta — rispondi subito" : "Nuova prenotazione cliente";
    case "BOOKING_RESCHEDULED_BY_CONSUMER":
      return options?.canRespond ? "Orario cambiato — conferma o rifiuta" : "Cambio orario prenotazione";
    case "BOOKING_UPDATED":
      return "Orario cambiato — controlla l'agenda";
    case "BOOKING_CANCELLED_BY_CONSUMER":
      return "Disdetta cliente — orario libero in agenda";
    default:
      return "Aggiornamento prenotazione";
  }
}

export function consumerAlertBannerForType(type: string | undefined): string {
  switch (type) {
    case "BOOKING_CONFIRMATION":
      return "Il salone ha confermato il tuo appuntamento";
    case "BOOKING_REQUEST_REJECTED":
      return "La richiesta non è stata confermata";
    case "BOOKING_UPDATED":
      return "Orario aggiornato — controlla i dettagli";
    case "BOOKING_CANCELLED_BY_SALON":
    case "BOOKING_CANCELLED_BY_CONSUMER":
    case "BOOKING_CANCELLED":
      return "Appuntamento non più in programma";
    default:
      return "Aggiornamento appuntamento";
  }
}

export function appointmentAlertBannerForType(
  type: string | undefined,
  salonSide: boolean,
  options?: { canRespond?: boolean },
): string {
  return salonSide ? salonAlertBannerForType(type, options) : consumerAlertBannerForType(type);
}

export const LUXURY_NOTIFICATION_OPEN_EVENT = "luxury-notification-open";
const PENDING_POPUP_STORAGE_KEY = "luxury.pendingNotificationPopup";

type PopupListener = (payload: LuxuryNotificationPopupPayload) => void;

let popupListener: PopupListener | null = null;
const pendingPopups: LuxuryNotificationPopupPayload[] = [];

function drainPendingPopups(): void {
  if (!popupListener || pendingPopups.length === 0) return;
  while (pendingPopups.length > 0) {
    const next = pendingPopups.shift();
    if (next) popupListener(next);
  }
}

export function registerLuxuryNotificationPopupListener(listener: PopupListener | null): void {
  popupListener = listener;
  drainPendingPopups();
}

export function openLuxuryNotificationPopup(payload: LuxuryNotificationPopupPayload): void {
  if (typeof window === "undefined") return;
  if (!payload.title?.trim() && !payload.body?.trim()) return;

  if (popupListener) {
    popupListener(payload);
  } else {
    pendingPopups.push(payload);
  }

  window.dispatchEvent(new CustomEvent(LUXURY_NOTIFICATION_OPEN_EVENT, { detail: payload }));
}

export function storePendingNotificationPopup(payload: LuxuryNotificationPopupPayload): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_POPUP_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export function consumePendingNotificationPopup(): LuxuryNotificationPopupPayload | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_POPUP_STORAGE_KEY);
    sessionStorage.removeItem(PENDING_POPUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LuxuryNotificationPopupPayload;
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
    case "BOOKING_RESCHEDULED_BY_CONSUMER":
      return "Cambio orario prenotazione";
    case "BOOKING_CONFIRMATION":
      return "Conferma prenotazione";
    case "BOOKING_UPDATED":
      return "Prenotazione aggiornata";
    case "BOOKING_CANCELLED_BY_CONSUMER":
    case "BOOKING_CANCELLED_BY_SALON":
    case "BOOKING_CANCELLED":
    case "BOOKING_REJECTED_BY_OPERATOR":
    case "BOOKING_REQUEST_REJECTED":
      return "Prenotazione annullata";
    case "REMINDER_24H":
      return "Promemoria 24 ore";
    case "REMINDER_1H":
      return "Promemoria 2 ore";
    case "REVIEW_INVITE":
      return "Invito recensione";
    case "REVIEW_RECEIVED_FOR_SALON":
      return "Nuova recensione";
    case "ADMIN_PLATFORM_MESSAGE":
      return "Messaggio Luxury";
    case "SUPPORT_REQUEST_TO_LUXURY":
      return "Richiesta assistenza";
    default:
      return type.replaceAll("_", " ").toLowerCase();
  }
}

export function messageToNotificationPopup(
  message: MeSalonNotificationMessage,
  categoryLabel?: string,
  role: SalonNotificationViewerRole = "owner",
): LuxuryNotificationPopupPayload {
  const type = message.notificationType;
  const salonSide = inferSalonSideNotificationType(type);
  const appointmentAlert = isAppointmentAlertType(type);
  const canRespond = canRespondToSalonBookingRequest(type, role, message.appointmentStatus);
  const urgent = resolveSalonPopupUrgent(type, role, message.appointmentStatus);
  const title =
    categoryLabel?.trim()
    || (appointmentAlert ? appointmentAlertTitleForType(type, salonSide) : humanizeNotificationType(type));
  return {
    id: message.id,
    title,
    body: message.previewLine,
    notificationType: type,
    status: message.status,
    sentAt: message.sentAt,
    clientName: message.clientName,
    appointmentId: message.appointmentId,
    serviceName: message.serviceName,
    operatorName: message.operatorName,
    appointmentStart: message.appointmentStart,
    previousAppointmentStart: message.previousAppointmentStart,
    appointmentStatus: message.appointmentStatus,
    urgent,
    canRespond,
    playSound: true,
  };
}

export function normalizePushNotificationOpen(
  raw: unknown,
  role: SalonNotificationViewerRole = "owner",
): LuxuryNotificationPopupPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const map = raw as Record<string, unknown>;
  const title = typeof map.title === "string" ? map.title.trim() : "";
  const body = typeof map.body === "string" ? map.body.trim() : "";
  const notificationType = typeof map.type === "string" ? map.type.trim() : undefined;
  const id = typeof map.notificationId === "string" ? map.notificationId.trim() : undefined;
  const appointmentId = typeof map.appointmentId === "string" ? map.appointmentId.trim() : null;
  const serviceName = typeof map.serviceName === "string" ? map.serviceName.trim() : null;
  const operatorName = typeof map.operatorName === "string" ? map.operatorName.trim() : null;
  const appointmentStart = typeof map.appointmentStart === "string" ? map.appointmentStart.trim() : null;
  const previousAppointmentStart =
    typeof map.previousAppointmentStart === "string" ? map.previousAppointmentStart.trim() : null;
  const appointmentStatus = typeof map.appointmentStatus === "string" ? map.appointmentStatus.trim() : null;
  if (!title && !body && !notificationType) return null;
  const salonSide = inferSalonSideNotificationType(notificationType);
  const canRespond = canRespondToSalonBookingRequest(notificationType, role, appointmentStatus);
  const urgent = resolveSalonPopupUrgent(notificationType, role, appointmentStatus);
  return {
    id: id || undefined,
    title: title || appointmentAlertTitleForType(notificationType, salonSide),
    body: body || title || "Nuova notifica",
    notificationType,
    appointmentId,
    serviceName,
    operatorName,
    appointmentStart,
    previousAppointmentStart,
    appointmentStatus,
    urgent,
    canRespond,
    playSound: true,
  };
}
