import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { apiJson } from "../api/client";
import type { MeSalonNotificationInbox, MeSalonNotificationMessage } from "../api/types";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { inboxAttentionTotal, sortMessagesNewestFirst } from "../lib/luxuryNotificationAlertUtils";
import { emitInAppSound } from "../lib/luxuryInAppSoundBus";
import {
  consumerAlertTitleForType,
  humanizeNotificationType,
  isConsumerAppointmentAlertType,
  messageToNotificationPopup,
  openLuxuryNotificationPopup,
} from "../lib/luxuryNotificationPopup";
import { shouldSuppressConsumerBookingConfirmationPopup } from "../lib/suppressConsumerBookingConfirmationPopup";

const CONSUMER_ALERT_BUCKETS = ["BOOKING_CONFIRMATION", "BOOKING_UPDATED", "BOOKING_CANCELLED", "SYSTEM"] as const;

/** Polling più frequente a tab visibile; rallenta in background. */
const CONSUMER_ALERT_INBOX_POLL_VISIBLE_MS = 3_000;
const CONSUMER_ALERT_INBOX_POLL_HIDDEN_MS = 20_000;
const CONSUMER_ALERT_MESSAGES_POLL_VISIBLE_MS = 2_500;
const CONSUMER_ALERT_MESSAGES_POLL_HIDDEN_MS = 15_000;

function consumerAlertPollInterval(visibleMs: number, hiddenMs: number): number {
  if (typeof document !== "undefined" && document.hidden) return hiddenMs;
  return visibleMs;
}

function alertTitleForMessage(message: MeSalonNotificationMessage): string {
  if (isConsumerAppointmentAlertType(message.notificationType)) {
    return consumerAlertTitleForType(message.notificationType);
  }
  return humanizeNotificationType(message.notificationType);
}

/**
 * Popup in-app + suono per cliente su nuove notifiche del centro messaggi account.
 * Attivo ovunque (home/ricerca/vetrina/account) tramite {@link ConsumerNotificationAlertPoller}.
 */
export function useConsumerNotificationAlerts(enabled = true): void {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { accessToken, isSalonTitolare, isSalonStaff, isLuxurySuperAdmin } = useLuxuryAuth();
  const eligible =
    enabled
    && !isSalonTitolare
    && !isSalonStaff
    && !isLuxurySuperAdmin
    && Boolean(accessToken);

  const notifInboxQ = useQuery({
    queryKey: ["me", "notifications"],
    queryFn: () => apiJson<MeSalonNotificationInbox>("/api/v1/me/notifications", { accessToken }),
    enabled: eligible,
    refetchInterval: () =>
      consumerAlertPollInterval(CONSUMER_ALERT_INBOX_POLL_VISIBLE_MS, CONSUMER_ALERT_INBOX_POLL_HIDDEN_MS),
    staleTime: 2_000,
    refetchOnWindowFocus: true,
  });

  const attentionTotal = useMemo(() => inboxAttentionTotal(notifInboxQ.data), [notifInboxQ.data]);
  const prevAttentionRef = useRef(0);

  const messagesQ = useQuery({
    queryKey: ["me", "notifications", "messages", "consumer-alerts"],
    queryFn: async () => {
      const batches = await Promise.all(
        CONSUMER_ALERT_BUCKETS.map((bucket) =>
          apiJson<MeSalonNotificationMessage[]>(
            `/api/v1/me/notifications/messages?bucket=${encodeURIComponent(bucket)}`,
            { accessToken },
          ),
        ),
      );
      return sortMessagesNewestFirst(batches.flat());
    },
    enabled: eligible,
    refetchInterval: () =>
      consumerAlertPollInterval(CONSUMER_ALERT_MESSAGES_POLL_VISIBLE_MS, CONSUMER_ALERT_MESSAGES_POLL_HIDDEN_MS),
    staleTime: 1_500,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!eligible) return;
    if (attentionTotal <= prevAttentionRef.current) return;
    prevAttentionRef.current = attentionTotal;
    void queryClient.invalidateQueries({
      queryKey: ["me", "notifications", "messages", "consumer-alerts"],
    });
  }, [attentionTotal, eligible, queryClient]);

  /** Al ritorno sulla tab: refetch immediato. */
  useEffect(() => {
    if (!eligible || typeof document === "undefined") return;
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      void queryClient.invalidateQueries({ queryKey: ["me", "notifications"] });
      void queryClient.invalidateQueries({
        queryKey: ["me", "notifications", "messages", "consumer-alerts"],
      });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [eligible, queryClient]);

  const baselinedRef = useRef(false);
  const seenIdsRef = useRef(new Set<string>());
  const alertSoundSeenIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!eligible) {
      baselinedRef.current = false;
      seenIdsRef.current = new Set();
      alertSoundSeenIdsRef.current = new Set();
      prevAttentionRef.current = 0;
      return;
    }
    if (!messagesQ.data) return;

    const onNotifichePage = location.pathname === "/account/notifiche";

    if (!baselinedRef.current) {
      // Race: prima risposta vuota mentre fetch in corso → non chiudere il baseline.
      if (messagesQ.data.length === 0 && messagesQ.isFetching) return;
      for (const message of messagesQ.data) {
        if (message.id) {
          seenIdsRef.current.add(message.id);
          alertSoundSeenIdsRef.current.add(message.id);
        }
      }
      baselinedRef.current = true;
      return;
    }

    for (const message of messagesQ.data) {
      if (!message.id) continue;

      const isNewAlert = !alertSoundSeenIdsRef.current.has(message.id);
      if (isNewAlert) {
        alertSoundSeenIdsRef.current.add(message.id);
        if (onNotifichePage) {
          emitInAppSound({
            kind: "chime",
            source: "notification",
            dedupeKey: message.id ? `consumer-notif:${message.id}` : undefined,
          });
        }
      }

      if (onNotifichePage) continue;
      if (seenIdsRef.current.has(message.id)) continue;
      // Auto-conferma operatore: già mostrato BookingConfirmedModal — niente secondo popup «ha confermato».
      if (
        message.notificationType === "BOOKING_CONFIRMATION"
        && shouldSuppressConsumerBookingConfirmationPopup(message.appointmentId)
      ) {
        seenIdsRef.current.add(message.id);
        continue;
      }
      seenIdsRef.current.add(message.id);
      openLuxuryNotificationPopup(
        messageToNotificationPopup(message, alertTitleForMessage(message)),
      );
      break;
    }
  }, [eligible, location.pathname, messagesQ.data, messagesQ.isFetching]);
}
