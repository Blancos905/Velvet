import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { apiJson } from "../api/client";
import type { MeSalonNotificationInbox, MeSalonNotificationMessage } from "../api/types";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import { inboxAttentionTotal, sortMessagesNewestFirst } from "../lib/velvetNotificationAlertUtils";
import {
  humanizeNotificationType,
  isSalonInteractiveAlertType,
  messageToNotificationPopup,
  openVelvetNotificationPopup,
  salonAlertTitleForType,
} from "../lib/velvetNotificationPopup";

const SALON_ALERT_BUCKETS = ["BOOKING_CONFIRMATION", "BOOKING_UPDATED", "BOOKING_CANCELLED", "SYSTEM"] as const;

function alertTitleForMessage(message: MeSalonNotificationMessage): string {
  if (isSalonInteractiveAlertType(message.notificationType)) {
    return salonAlertTitleForType(message.notificationType);
  }
  return humanizeNotificationType(message.notificationType);
}

/**
 * Popup in-app + suono per titolare/operatore su nuove notifiche del centro messaggi salone.
 */
export function useSalonBookingRequestAlerts(enabled = true): void {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { accessToken, isSalonTitolare, isSalonStaff } = useVelvetAuth();
  const salonSide = isSalonTitolare || isSalonStaff;
  const eligible = enabled && salonSide && Boolean(accessToken);

  const notifInboxQ = useQuery({
    queryKey: ["me", "salon", "notifications"],
    queryFn: () => apiJson<MeSalonNotificationInbox>("/api/v1/me/salon/notifications", { accessToken }),
    enabled: eligible,
    refetchInterval: 20_000,
    staleTime: 45_000,
    refetchOnWindowFocus: false,
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
    refetchInterval: 15_000,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!eligible) return;
    if (attentionTotal <= prevAttentionRef.current) return;
    prevAttentionRef.current = attentionTotal;
    void queryClient.invalidateQueries({
      queryKey: ["me", "salon", "notifications", "messages", "salon-alerts"],
    });
  }, [attentionTotal, eligible, queryClient]);

  const baselinedRef = useRef(false);
  const seenIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!eligible || !messagesQ.data) return;

    const skipPopup =
      (!isSalonStaff && location.pathname === "/account/salone/strumenti")
      || (isSalonStaff && location.pathname === "/account/notifiche");

    if (!baselinedRef.current) {
      for (const message of messagesQ.data) {
        if (message.id) seenIdsRef.current.add(message.id);
      }
      baselinedRef.current = true;
      return;
    }

    for (const message of messagesQ.data) {
      if (!message.id) continue;
      if (seenIdsRef.current.has(message.id)) continue;
      seenIdsRef.current.add(message.id);
      if (skipPopup) continue;
      openVelvetNotificationPopup(messageToNotificationPopup(message, alertTitleForMessage(message)));
      break;
    }
  }, [eligible, isSalonStaff, location.pathname, messagesQ.data]);
}
