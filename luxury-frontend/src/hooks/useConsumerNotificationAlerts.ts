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

const CONSUMER_ALERT_BUCKETS = ["BOOKING_CONFIRMATION", "BOOKING_UPDATED", "BOOKING_CANCELLED", "SYSTEM"] as const;

function alertTitleForMessage(message: MeSalonNotificationMessage): string {
  if (isConsumerAppointmentAlertType(message.notificationType)) {
    return consumerAlertTitleForType(message.notificationType);
  }
  return humanizeNotificationType(message.notificationType);
}

/**
 * Popup in-app + suono per cliente su nuove notifiche del centro messaggi account.
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
    refetchInterval: 20_000,
    staleTime: 45_000,
    refetchOnWindowFocus: false,
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
    refetchInterval: 15_000,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!eligible) return;
    if (attentionTotal <= prevAttentionRef.current) return;
    prevAttentionRef.current = attentionTotal;
    void queryClient.invalidateQueries({
      queryKey: ["me", "notifications", "messages", "consumer-alerts"],
    });
  }, [attentionTotal, eligible, queryClient]);

  const baselinedRef = useRef(false);
  const seenIdsRef = useRef(new Set<string>());
  const alertSoundSeenIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!eligible || !messagesQ.data) return;

    const onNotifichePage = location.pathname === "/account/notifiche";

    if (!baselinedRef.current) {
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
      seenIdsRef.current.add(message.id);
      openLuxuryNotificationPopup(
        messageToNotificationPopup(message, alertTitleForMessage(message)),
      );
      break;
    }
  }, [eligible, location.pathname, messagesQ.data]);
}
