import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, type KeyboardEvent } from "react";
import { apiJson } from "../../../api/client";
import type { MeSalonNotificationInbox, MeSalonNotificationTypeStat } from "../../../api/types";
import { useLuxuryAuth } from "../../../auth/LuxuryAuthProvider";
import { CLIENT_ACCOUNT_ICONS, ClientAccountContentCard } from "../../../components/account/ClientAccountContentCard";
import { ClientAccountHeroHeader } from "../../../components/account/ClientAccountHeroHeader";
import { INFO_PRIVACY_HERO_ICONS } from "../../../components/account/InfoPrivacyAccountHeroHeader";
import { useMeSalonNotificationInboxQuery } from "../../../hooks/useMeSalonNotificationInbox";
import { useMeSalonNotificationMessagesQuery } from "../../../hooks/useMeSalonNotificationMessages";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../../lib/clientAccountPageShellClasses";
import { NotificationBucketMessagesPanel } from "../NotificationsPage";
import "../../../styles/luxury-consumer-bookings-page.css";
import "../../../styles/luxury-info-privacy-hero.css";
import "../../../styles/luxury-feedback-client.css";
import "../../../styles/luxury-client-account-page.css";
import "../../../styles/luxury-notifications-client.css";
import "../../../styles/luxury-notifications-salon.css";
import "../../../styles/salon-notifications.css";
import { SalonStandardSectionGuard } from "./SalonStandardSectionGuard";

function countBadge(value: number, title: string) {
  const cls =
    "luxury-salon-notif-badge luxury-salon-notif-badge--incoming" +
    (value === 0 ? " luxury-salon-notif-badge--zero" : "");
  return (
    <span className={cls} title={title}>
      {value}
    </span>
  );
}

const NOTIFICATION_BUCKETS: Array<{ key: string; label: string }> = [
  { key: "BOOKING_CONFIRMATION", label: "Notifiche — prenotazioni e conferme" },
  { key: "BOOKING_UPDATED", label: "Notifiche — prenotazione aggiornata" },
  { key: "BOOKING_CANCELLED", label: "Notifiche — annullamento prenotazione" },
  { key: "SYSTEM", label: "Messaggi Luxury" },
];

function bucketForType(type: string): string {
  if (type === "BOOKING_UPDATED") return "BOOKING_UPDATED";
  if (type === "BOOKING_CANCELLED_BY_CONSUMER" || type === "BOOKING_CANCELLED_BY_SALON" || type === "BOOKING_CANCELLED") {
    return "BOOKING_CANCELLED";
  }
  if (
    type === "BOOKING_CONFIRMATION" ||
    type === "BOOKING_CREATED_FOR_SALON" ||
    type === "BOOKING_RESCHEDULED_BY_CONSUMER"
  ) {
    return "BOOKING_CONFIRMATION";
  }
  return "SYSTEM";
}

type NotificationBucket = {
  type: string;
  label: string;
  sent: number;
  pending: number;
};

function normalizeNotificationRows(rows: MeSalonNotificationTypeStat[] | undefined): NotificationBucket[] {
  const acc = new Map<string, NotificationBucket>(
    NOTIFICATION_BUCKETS.map((b) => [b.key, { type: b.key, label: b.label, sent: 0, pending: 0 }]),
  );
  for (const row of rows ?? []) {
    if (row.type === "REVIEW_INVITE") continue;
    const bucket = acc.get(bucketForType(row.type));
    if (!bucket) continue;
    bucket.sent += Number.isFinite(row.sent) ? row.sent : 0;
    bucket.pending += Number.isFinite(row.pending) ? row.pending : 0;
  }
  return NOTIFICATION_BUCKETS.map((b) => acc.get(b.key)!).filter(Boolean);
}

/** Centro notifiche titolare: stessa struttura (hero + card + lista) delle notifiche cliente, in accento azzurro salone. */
export default function SalonStandardToolsPage() {
  const queryClient = useQueryClient();
  const { accessToken } = useLuxuryAuth();
  const inbox = useMeSalonNotificationInboxQuery();
  const normalizedRows = normalizeNotificationRows(inbox.data?.types);
  const [openBucket, setOpenBucket] = useState<string | null>(null);
  const [dismissedBuckets, setDismissedBuckets] = useState<Record<string, boolean>>({});
  const [ackBucketApiUnavailable, setAckBucketApiUnavailable] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const messages = useMeSalonNotificationMessagesQuery(openBucket);
  const ackBucketM = useMutation({
    mutationFn: (bucket: string) =>
      apiJson<MeSalonNotificationInbox>(
        `/api/v1/me/salon/notifications/inbox/ack-bucket?bucket=${encodeURIComponent(bucket)}`,
        {
          method: "POST",
          accessToken,
        },
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(["me", "salon", "notifications"], data);
      void queryClient.invalidateQueries({ queryKey: ["me", "salon", "notifications", "messages"] });
    },
    onError: (err, bucket) => {
      if (err instanceof Error && /\b404\b|not found/i.test(err.message)) {
        setAckBucketApiUnavailable(true);
        setDismissedBuckets((prev) => ({ ...prev, [bucket]: true }));
      }
    },
  });
  const deleteMessageM = useMutation({
    mutationFn: (messageId: string) =>
      apiJson<void>(`/api/v1/me/salon/notifications/messages/${encodeURIComponent(messageId)}`, {
        method: "DELETE",
        accessToken,
      }),
    onMutate: (messageId) => setDeletingMessageId(messageId),
    onSettled: () => {
      setDeletingMessageId(null);
      void queryClient.invalidateQueries({ queryKey: ["me", "salon", "notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["me", "salon", "notifications", "messages"] });
    },
  });
  const deleteAllMessagesM = useMutation({
    mutationFn: async (messageIds: string[]) => {
      await Promise.all(
        messageIds.map((messageId) =>
          apiJson<void>(`/api/v1/me/salon/notifications/messages/${encodeURIComponent(messageId)}`, {
            method: "DELETE",
            accessToken,
          }),
        ),
      );
    },
    onMutate: () => setDeletingAll(true),
    onSettled: () => {
      setDeletingAll(false);
      void queryClient.invalidateQueries({ queryKey: ["me", "salon", "notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["me", "salon", "notifications", "messages"] });
    },
  });

  const toggleBucket = useCallback(
    (key: string) => {
      if (openBucket === key) {
        setOpenBucket(null);
        if (!ackBucketApiUnavailable) {
          ackBucketM.mutate(key);
        }
        return;
      }
      if (openBucket && !ackBucketApiUnavailable) {
        ackBucketM.mutate(openBucket);
      }
      setOpenBucket(key);
      if (ackBucketApiUnavailable) {
        setDismissedBuckets((prev) => ({ ...prev, [key]: true }));
      }
    },
    [ackBucketApiUnavailable, ackBucketM, openBucket],
  );

  const onRowKeyDown = useCallback(
    (e: KeyboardEvent, key: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleBucket(key);
      }
    },
    [toggleBucket],
  );

  const rowsForView = normalizedRows.map((row) =>
    ackBucketApiUnavailable && dismissedBuckets[row.type] ? { ...row, sent: 0, pending: 0 } : row,
  );
  const totalNotifications = rowsForView.reduce((acc, row) => acc + row.sent + row.pending, 0);

  return (
    <SalonStandardSectionGuard>
      <main
        className={`luxury-page-main luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-salon-notif-page luxury-salon-notif-page--consumer luxury-salon-notif-page--salon-side ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`}
      >
        <div className="luxury-consumer-bookings-dash__shell">
          <ClientAccountHeroHeader
            headlinePre="Le tue "
            headlineAccent="notifiche"
            badgePrimary="Area salone"
            badgeSecondary="Centro messaggi"
            kickerLabel="Comunicazioni"
            kickerChip="Avvisi del salone"
            subtitle={
              <>
                Tieni sotto controllo <strong>conferme</strong>, promemoria e annulli inviati ai clienti: apri ogni
                categoria per il <em>dettaglio</em> e gestisci i singoli messaggi.
              </>
            }
            metaItems={[
              { icon: CLIENT_ACCOUNT_ICONS.bell, label: `${totalNotifications} notifiche totali` },
              { icon: INFO_PRIVACY_HERO_ICONS.clock, label: "Aggiornamento in tempo reale" },
            ]}
          />

          <ClientAccountContentCard ariaLabel="Centro notifiche salone" title="Categorie e messaggi">
            {inbox.isError ? (
              <p className="luxury-text-muted" style={{ margin: "0 0 0.75rem" }} role="alert">
                Non riusciamo a leggere i conteggi. Verifica la connessione e l&apos;API{" "}
                <code className="luxury-text-muted">/api/v1/me/salon/notifications</code>. Le categorie restano
                consultabili sotto.
              </p>
            ) : null}
            <ul
              className="luxury-salon-notif-list"
              aria-label="Conteggi per tipo di notifica"
              aria-busy={inbox.isPending}
            >
              {rowsForView.map((row) => {
                const expanded = openBucket === row.type;
                return (
                  <li key={row.type} className="luxury-salon-notif-item">
                    <div
                      className={
                        "luxury-salon-notif-row luxury-salon-notif-row--interactive" +
                        (expanded ? " luxury-salon-notif-row--expanded" : "")
                      }
                      role="button"
                      tabIndex={0}
                      aria-expanded={expanded}
                      aria-controls={`salon-notif-detail-${row.type}`}
                      id={`salon-notif-trigger-${row.type}`}
                      onClick={() => toggleBucket(row.type)}
                      onKeyDown={(e) => onRowKeyDown(e, row.type)}
                    >
                      <p className="luxury-salon-notif-row__label">{row.label}</p>
                      <div className="luxury-salon-notif-row__counts" aria-label={`Conteggi per ${row.label}`}>
                        {countBadge(row.sent + row.pending, "In arrivo")}
                      </div>
                    </div>
                    {expanded ? (
                      <div
                        className="luxury-salon-notif-detail"
                        id={`salon-notif-detail-${row.type}`}
                        role="region"
                        aria-labelledby={`salon-notif-trigger-${row.type}`}
                      >
                        <NotificationBucketMessagesPanel
                          rowLabel={row.label}
                          messages={messages}
                          deletingMessageId={deletingMessageId}
                          deleteOnePending={deleteMessageM.isPending}
                          deleteAllPending={deletingAll}
                          onDeleteOne={(messageId) => deleteMessageM.mutate(messageId)}
                          onDeleteAll={(messageIds) => deleteAllMessagesM.mutate(messageIds)}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </ClientAccountContentCard>
        </div>
      </main>
    </SalonStandardSectionGuard>
  );
}
