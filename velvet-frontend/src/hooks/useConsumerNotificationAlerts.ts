import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { apiJson } from "../api/client";
import type { MeSalonNotificationInbox, MeSalonNotificationMessage } from "../api/types";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import { inboxAttentionTotal, sortMessagesNewestFirst } from "../lib/velvetNotificationAlertUtils";
import {
  humanizeNotificationType,
  messageToNotificationPopup,
  openVelvetNotificationPopup,
} from "../lib/velvetNotificationPopup";

const CONSUMER_ALERT_BUCKETS = ["BOOKING_CONFIRMATION", "BOOKING_UPDATED", "BOOKING_CANCELLED", "SYSTEM"] as const;

/**
 * Popup in-app + suono per cliente su nuove notifiche del centro messaggi account.
 */
export function useConsumerNotificationAlerts(enabled = true): void {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { accessToken, isSalonTitolare, isSalonStaff, isVelvetSuperAdmin } = useVelvetAuth();
  const eligible =
    enabled
    && !isSalonTitolare
    && !isSalonStaff
    && !isVelvetSuperAdmin
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

  useEffect(() => {
    if (!eligible || !messagesQ.data) return;
    if (location.pathname === "/account/notifiche") return;

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
      openVelvetNotificationPopup(
        messageToNotificationPopup(message, humanizeNotificationType(message.notificationType)),
      );
      break;
    }
  }, [eligible, location.pathname, messagesQ.data]);
}
