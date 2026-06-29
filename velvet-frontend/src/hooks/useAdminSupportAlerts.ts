import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import type { MeSalonNotificationMessage } from "../api/types";
import { useAdminAuth } from "../auth/AdminAuthProvider";
import { sortMessagesNewestFirst } from "../lib/velvetNotificationAlertUtils";
import { openVelvetNotificationPopup } from "../lib/velvetNotificationPopup";
import { fetchAdminSupportInbox } from "../pages/admin/adminSupportInboxApi";
import { humanizeNotificationType as adminHumanizeType } from "../pages/admin/supportInboxParse";

function supportMessageToPopup(message: MeSalonNotificationMessage) {
  return {
    id: message.id,
    title: adminHumanizeType(message.notificationType),
    body: message.previewLine,
    notificationType: message.notificationType,
    status: message.status,
    sentAt: message.sentAt,
    clientName: message.clientName,
    playSound: true as const,
  };
}

/**
 * Popup in-app + suono per super admin su nuove richieste assistenza / messaggi salone.
 */
export function useAdminSupportAlerts(): void {
  const location = useLocation();
  const { accessToken, isAdminSession } = useAdminAuth();
  const eligible = Boolean(accessToken && isAdminSession);

  const inboxQ = useQuery({
    queryKey: ["admin", "support-inbox", "alerts", accessToken],
    enabled: eligible,
    staleTime: 15_000,
    refetchInterval: 20_000,
    refetchOnWindowFocus: false,
    queryFn: () => {
      if (!accessToken) throw new Error("Sessione non disponibile.");
      return fetchAdminSupportInbox(accessToken, false);
    },
  });

  const baselinedRef = useRef(false);
  const seenIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!eligible || !inboxQ.data) return;

    const skipPopup =
      location.pathname.startsWith("/admin/messaggi")
      || location.pathname.startsWith("/admin/assistenza");

    const messages = sortMessagesNewestFirst(inboxQ.data);

    if (!baselinedRef.current) {
      for (const message of messages) {
        if (message.id) seenIdsRef.current.add(message.id);
      }
      baselinedRef.current = true;
      return;
    }

    for (const message of messages) {
      if (!message.id) continue;
      if (seenIdsRef.current.has(message.id)) continue;
      seenIdsRef.current.add(message.id);
      if (skipPopup) continue;
      openVelvetNotificationPopup(supportMessageToPopup(message));
      break;
    }
  }, [eligible, inboxQ.data, location.pathname]);
}
