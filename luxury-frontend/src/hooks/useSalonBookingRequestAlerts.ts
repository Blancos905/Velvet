import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { apiJson } from "../api/client";
import type { MeSalonNotificationInbox, MeSalonNotificationMessage } from "../api/types";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { readLuxuryAccountStorageKey } from "../lib/luxuryJwtHintsFromAccessToken";
import {
  baselineSalonAlertSessionMessages,
  hydrateSalonAlertState,
  inboxAttentionTotal,
  isSalonAlertSessionBaselineMessage,
  markSalonAlertNotificationSeen,
  registerSalonAlertSnoozeExpiredListener,
  shouldShowSalonAlertPopup,
  sortMessagesNewestFirst,
} from "../lib/luxuryNotificationAlertUtils";
import { emitInAppSound } from "../lib/luxuryInAppSoundBus";
import {
  humanizeNotificationType,
  isSalonBookingRequestType,
  isSalonInteractiveAlertType,
  isSalonStaffPopupType,
  messageToNotificationPopup,
  openLuxuryNotificationPopup,
  resolveSalonNotificationViewerRole,
  salonAlertTitleForType,
  type SalonNotificationViewerRole,
} from "../lib/luxuryNotificationPopup";

const SALON_ALERT_BUCKETS = [
  "BOOKING_CONFIRMATION",
  "BOOKING_UPDATED",
  "BOOKING_CANCELLED",
  "SYSTEM",
] as const;

/** Polling più frequente a tab visibile; rallenta in background per risparmiare batteria. */
const SALON_ALERT_INBOX_POLL_VISIBLE_MS = 3_000;
const SALON_ALERT_INBOX_POLL_HIDDEN_MS = 20_000;
const SALON_ALERT_MESSAGES_POLL_VISIBLE_MS = 2_500;
const SALON_ALERT_MESSAGES_POLL_HIDDEN_MS = 15_000;

function salonAlertPollInterval(visibleMs: number, hiddenMs: number): number {
  if (typeof document !== "undefined" && document.hidden) return hiddenMs;
  return visibleMs;
}

function alertTitleForMessage(message: MeSalonNotificationMessage): string {
  if (isSalonInteractiveAlertType(message.notificationType)) {
    return salonAlertTitleForType(message.notificationType);
  }
  return humanizeNotificationType(message.notificationType);
}

function isPopupEligibleMessage(message: MeSalonNotificationMessage, role: SalonNotificationViewerRole): boolean {
  if (role !== "staff") return false;
  return isSalonStaffPopupType(message.notificationType);
}

/** Richieste prenotazione ancora in attesa: suono/alert anche al primo load sessione. */
function isPendingSalonBookingRequest(message: MeSalonNotificationMessage): boolean {
  if (!isSalonBookingRequestType(message.notificationType)) return false;
  const status = message.appointmentStatus?.trim().toUpperCase();
  return !status || status === "BOOKED";
}

/** Al primo load segnare come viste solo le notifiche che non richiedono attenzione immediata. */
function shouldBaselineOnFirstLoad(type: string | undefined, role: SalonNotificationViewerRole): boolean {
  if (role !== "staff") {
    return !isSalonBookingRequestType(type);
  }
  return !isSalonStaffPopupType(type);
}

/** Su first paint non silenziare richieste BOOKED già in inbox (titolare + operatore). */
function shouldSkipBaselineSound(message: MeSalonNotificationMessage, role: SalonNotificationViewerRole): boolean {
  if (role === "staff") {
    return isSalonStaffPopupType(message.notificationType) && isPendingSalonBookingRequest(message);
  }
  return isSalonBookingRequestType(message.notificationType) && isPendingSalonBookingRequest(message);
}

/** Popup operatore: non duplicare se già sul centro notifiche staff. */
function shouldSkipAutoPopup(
  _message: MeSalonNotificationMessage,
  pathname: string,
  role: SalonNotificationViewerRole,
): boolean {
  return role === "staff" && pathname === "/account/notifiche";
}

/** Richiesta Accetta/Rifiuta non più valida: appuntamento già gestito altrove. */
function isStaleSalonBookingRequestAlert(message: MeSalonNotificationMessage): boolean {
  if (!isSalonBookingRequestType(message.notificationType)) return false;
  const status = message.appointmentStatus?.trim().toUpperCase();
  return Boolean(status && status !== "BOOKED");
}

function shouldOpenSalonAlertPopup(
  message: MeSalonNotificationMessage,
  pathname: string,
  role: SalonNotificationViewerRole,
): boolean {
  if (!isPopupEligibleMessage(message, role)) return false;
  if (!message.id || !shouldShowSalonAlertPopup(message.id)) return false;
  if (!shouldAutoPopupMessage(message)) return false;
  if (shouldSkipAutoPopup(message, pathname, role)) return false;
  return true;
}

function shouldAutoPopupMessage(message: MeSalonNotificationMessage): boolean {
  if (isStaleSalonBookingRequestAlert(message)) return false;
  if (!isSalonAlertSessionBaselineMessage(message.id)) return true;
  // Già in inbox al boot: mostra solo richieste prenotazione ancora BOOKED non dismissate.
  return isSalonBookingRequestType(message.notificationType);
}

function notifySalonAppointmentAlert(message: MeSalonNotificationMessage, title: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const body = message.previewLine?.trim() || title;
  try {
    const browserNotification = new Notification(title, {
      body,
      tag: message.id ? `luxury-salon-alert-${message.id}` : "luxury-salon-alert",
    });
    browserNotification.onclick = (event) => {
      event?.preventDefault?.();
      browserNotification.close();
      window.focus();
    };
  } catch {
    /* ignore unsupported Notification API */
  }
}

/**
 * Popup in-app + suono:
 * - operatore STAFF → modale urgente Accetta/Rifiuta + chime su ogni notifica; disdetta urgente solo informativa;
 * - titolare → centro notifiche + chime (nessun modale automatico).
 */
export function useSalonBookingRequestAlerts(enabled = true): void {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { accessToken, isSalonTitolare, isSalonStaff } = useLuxuryAuth();
  const viewerRole = resolveSalonNotificationViewerRole(isSalonStaff, isSalonTitolare);
  const salonSide = isSalonTitolare || isSalonStaff;
  const eligible = enabled && salonSide && Boolean(accessToken);
  const accountStorageKey = useMemo(() => readLuxuryAccountStorageKey(accessToken), [accessToken]);

  useEffect(() => {
    if (!eligible) return;
    hydrateSalonAlertState(accountStorageKey);
  }, [accountStorageKey, eligible]);

  const notifInboxQ = useQuery({
    queryKey: ["me", "salon", "notifications"],
    queryFn: () => apiJson<MeSalonNotificationInbox>("/api/v1/me/salon/notifications", { accessToken }),
    enabled: eligible,
    refetchInterval: () =>
      salonAlertPollInterval(SALON_ALERT_INBOX_POLL_VISIBLE_MS, SALON_ALERT_INBOX_POLL_HIDDEN_MS),
    staleTime: 2_000,
    refetchOnWindowFocus: true,
  });

  const attentionTotal = useMemo(() => inboxAttentionTotal(notifInboxQ.data), [notifInboxQ.data]);
  const prevAttentionRef = useRef(0);

  const messagesQ = useQuery({
    queryKey: ["me", "salon", "notifications", "messages", "salon-alerts"],
    queryFn: async () => {
      const batches = await Promise.all(
        SALON_ALERT_BUCKETS.map((bucket) =>
          apiJson<MeSalonNotificationMessage[]>(
            `/api/v1/me/salon/notifications/messages?bucket=${encodeURIComponent(bucket)}`,
            { accessToken },
          ),
        ),
      );
      return sortMessagesNewestFirst(batches.flat());
    },
    enabled: eligible,
    refetchInterval: () =>
      salonAlertPollInterval(SALON_ALERT_MESSAGES_POLL_VISIBLE_MS, SALON_ALERT_MESSAGES_POLL_HIDDEN_MS),
    staleTime: 1_500,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!eligible) return;
    if (attentionTotal <= prevAttentionRef.current) return;
    prevAttentionRef.current = attentionTotal;
    void queryClient.invalidateQueries({
      queryKey: ["me", "salon", "notifications", "messages", "salon-alerts"],
    });
  }, [attentionTotal, eligible, queryClient]);

  useEffect(() => {
    if (!eligible) return;
    registerSalonAlertSnoozeExpiredListener(() => {
      void queryClient.invalidateQueries({
        queryKey: ["me", "salon", "notifications", "messages", "salon-alerts"],
      });
    });
    return () => registerSalonAlertSnoozeExpiredListener(null);
  }, [eligible, queryClient]);

  /** Al ritorno sulla tab: refetch immediato (non attendere il prossimo intervallo). */
  useEffect(() => {
    if (!eligible || typeof document === "undefined") return;
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      void queryClient.invalidateQueries({ queryKey: ["me", "salon", "notifications"] });
      void queryClient.invalidateQueries({
        queryKey: ["me", "salon", "notifications", "messages", "salon-alerts"],
      });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [eligible, queryClient]);

  const baselinedRef = useRef(false);
  const alertSoundSeenIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!eligible || !messagesQ.data) return;

    if (!baselinedRef.current) {
      baselineSalonAlertSessionMessages(messagesQ.data);
      for (const message of messagesQ.data) {
        if (message.id && !shouldSkipBaselineSound(message, viewerRole)) {
          alertSoundSeenIdsRef.current.add(message.id);
        }
        if (message.id && shouldBaselineOnFirstLoad(message.notificationType, viewerRole)) {
          markSalonAlertNotificationSeen(message.id);
        }
        if (message.id && isStaleSalonBookingRequestAlert(message)) {
          markSalonAlertNotificationSeen(message.id);
        }
      }
      baselinedRef.current = true;
    }

    for (const message of messagesQ.data) {
      if (!message.id) continue;
      if (isStaleSalonBookingRequestAlert(message)) {
        markSalonAlertNotificationSeen(message.id);
        alertSoundSeenIdsRef.current.add(message.id);
        continue;
      }

      const isNewAlert = !alertSoundSeenIdsRef.current.has(message.id);
      const willOpenPopup = shouldOpenSalonAlertPopup(message, location.pathname, viewerRole);

      if (isNewAlert) {
        alertSoundSeenIdsRef.current.add(message.id);
        emitInAppSound({
          kind: "chime",
          source: "notification",
          dedupeKey: `salon-notif:${message.id}`,
        });
      }

      if (!willOpenPopup) {
        if (!isPopupEligibleMessage(message, viewerRole) && !isPendingSalonBookingRequest(message)) {
          markSalonAlertNotificationSeen(message.id);
        }
        continue;
      }

      const popupTitle = alertTitleForMessage(message);
      const popupPayload = messageToNotificationPopup(message, popupTitle, viewerRole);
      notifySalonAppointmentAlert(message, popupTitle);
      openLuxuryNotificationPopup(popupPayload);
      break;
    }
  }, [eligible, location.pathname, messagesQ.data, viewerRole]);
}