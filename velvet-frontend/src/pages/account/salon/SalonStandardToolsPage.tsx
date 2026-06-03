import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../../../api/client";
import type { MeSalonNotificationInbox, MeSalonNotificationTypeStat } from "../../../api/types";
import { useVelvetAuth } from "../../../auth/VelvetAuthProvider";
import { useMeSalonNotificationInboxQuery } from "../../../hooks/useMeSalonNotificationInbox";
import { useMeSalonNotificationMessagesQuery } from "../../../hooks/useMeSalonNotificationMessages";
import "../../../styles/salon-notifications.css";
import { SalonStandardSectionGuard } from "./SalonStandardSectionGuard";

function countBadge(value: number, title: string) {
  const cls =
    "velvet-salon-notif-badge velvet-salon-notif-badge--" +
    "incoming" +
    (value === 0 ? " velvet-salon-notif-badge--zero" : "");
  return (
    <span className={cls} title={title}>
      {value}
    </span>
  );
}

type NotificationBucket = {
  type: string;
  label: string;
  sent: number;
  pending: number;
};

const NOTIFICATION_BUCKETS: Array<{ key: string; label: string }> = [
  { key: "BOOKING_CONFIRMATION", label: "Email — prenotazione" },
  { key: "BOOKING_UPDATED", label: "Email — prenotazione aggiornata" },
  { key: "BOOKING_CANCELLED", label: "Email — annullamento prenotazione" },
  { key: "SYSTEM", label: "Messaggi Luxury" },
];

function bucketForType(type: string): string {
  if (type === "BOOKING_UPDATED") return "BOOKING_UPDATED";
  if (type === "BOOKING_CANCELLED_BY_CONSUMER" || type === "BOOKING_CANCELLED_BY_SALON" || type === "BOOKING_CANCELLED") {
    return "BOOKING_CANCELLED";
  }
  if (
    type === "BOOKING_CONFIRMATION" ||
    type === "BOOKING_CREATED_FOR_SALON"
  ) {
    return "BOOKING_CONFIRMATION";
  }
  return "SYSTEM";
}

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

/** Centro notifiche titolare: conteggi email per tipo (promemoria solo lato cliente). */
export default function SalonStandardToolsPage() {
  const queryClient = useQueryClient();
  const { accessToken } = useVelvetAuth();
  const inbox = useMeSalonNotificationInboxQuery();
  const normalizedRows = normalizeNotificationRows(inbox.data?.types);
  const [openBucket, setOpenBucket] = useState<string | null>(null);
  const [dismissedBuckets, setDismissedBuckets] = useState<Record<string, boolean>>({});
  const [ackBucketApiUnavailable, setAckBucketApiUnavailable] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
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
    onMutate: (messageId) => {
      setDeletingMessageId(messageId);
    },
    onSettled: () => {
      setDeletingMessageId(null);
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

  return (
    <SalonStandardSectionGuard>
      <div className="velvet-salon-notif-page">
        <Link to="/account/salone" className="velvet-link-back">
          ← Panoramica salone
        </Link>
        <header className="velvet-salon-notif-page__hero">
          <div className="velvet-salon-notif-page__hero-glow" aria-hidden />
          <div className="velvet-salon-notif-page__hero-inner">
            <h1 className="velvet-salon-notif-page__headline">
              <span className="velvet-salon-notif-page__headline-pre">Le tue </span>
              <span className="velvet-salon-notif-page__headline-accent">notifiche</span>
            </h1>
            <p className="velvet-page-subtitle">
              Conteggi email per tipo, messaggi in coda e cronologia: apri una riga per lo storico (puoi eliminare i singoli
              messaggi); richiudila per azzerare il numerino fino a nuove notifiche.
            </p>
          </div>
        </header>

        {inbox.isPending ? (
          <div className="velvet-surface-card velvet-salon-notif-hub-card">
            <p className="velvet-text-muted" style={{ margin: 0 }}>
              Caricamento…
            </p>
          </div>
        ) : inbox.isError ? (
          <div className="velvet-surface-card velvet-salon-notif-hub-card">
            <p className="velvet-text-muted" style={{ margin: 0 }}>
              Non riusciamo a leggere i conteggi. Verifica la connessione e l&apos;API{" "}
              <code className="velvet-text-muted">/api/v1/me/salon/notifications</code>.
              {inbox.error instanceof Error && inbox.error.message.trim() ? (
                <>
                  {" "}
                  <span className="velvet-text-muted">({inbox.error.message.trim()})</span>
                </>
              ) : null}
            </p>
          </div>
        ) : (
          <div className="velvet-surface-card velvet-salon-notif-hub-card">
            <div className="velvet-salon-notif-card-head">
              <h2 className="velvet-card-title">Email e avvisi automatici</h2>
            </div>
            <ul className="velvet-salon-notif-list" aria-label="Conteggi per tipo di notifica">
              <li className="velvet-salon-notif-row velvet-salon-notif-row--head" aria-hidden>
                <span className="velvet-salon-notif-row__label">Tipo di messaggio</span>
                <div className="velvet-salon-notif-row__counts velvet-salon-notif-row__counts--head">
                  <span className="velvet-salon-notif-row__incoming-label">
                    <span className="velvet-salon-notif-row__incoming-dot" />
                    In arrivo
                  </span>
                </div>
              </li>
              {rowsForView.map((row) => {
                const expanded = openBucket === row.type;
                return (
                  <li key={row.type} className="velvet-salon-notif-item">
                    <div
                      className={
                        "velvet-salon-notif-row velvet-salon-notif-row--interactive" +
                        (expanded ? " velvet-salon-notif-row--expanded" : "")
                      }
                      role="button"
                      tabIndex={0}
                      aria-expanded={expanded}
                      aria-controls={`salon-notif-detail-${row.type}`}
                      id={`salon-notif-trigger-${row.type}`}
                      onClick={() => toggleBucket(row.type)}
                      onKeyDown={(e) => onRowKeyDown(e, row.type)}
                    >
                      <p className="velvet-salon-notif-row__label">{row.label}</p>
                      <div className="velvet-salon-notif-row__counts" aria-label={`Conteggi per ${row.label}`}>
                        {countBadge(row.sent + row.pending, "In arrivo")}
                      </div>
                    </div>
                    {expanded && (
                      <div
                        className="velvet-salon-notif-detail"
                        id={`salon-notif-detail-${row.type}`}
                        role="region"
                        aria-labelledby={`salon-notif-trigger-${row.type}`}
                      >
                        {messages.isPending ? (
                          <p className="velvet-salon-notif-detail__status">Caricamento messaggi…</p>
                        ) : messages.isError ? (
                          <p className="velvet-salon-notif-detail__status">
                            Non riusciamo a caricare l&apos;elenco
                            {messages.error instanceof Error && messages.error.message.trim()
                              ? ` (${messages.error.message.trim()})`
                              : ""}
                            .{" "}
                            <button
                              type="button"
                              className="velvet-link-back"
                              style={{ display: "inline", padding: 0, border: "none", background: "none", cursor: "pointer" }}
                              onClick={() => void messages.refetch()}
                            >
                              Riprova
                            </button>
                          </p>
                        ) : messages.data && messages.data.length === 0 ? (
                          <p className="velvet-salon-notif-detail__status">Nessun messaggio in questa categoria.</p>
                        ) : (
                          <ul className="velvet-salon-notif-detail__list" aria-label={`Messaggi: ${row.label}`}>
                            {messages.data?.map((m) => (
                              <li key={m.id} className="velvet-salon-notif-detail__line">
                                <span className="velvet-salon-notif-detail__text">{m.previewLine}</span>
                                <span
                                  style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem" }}
                                >
                                  <span className="velvet-salon-notif-detail__meta" title={m.status}>
                                    {m.status === "SENT" && m.sentAt
                                      ? `Inviata ${new Date(m.sentAt).toLocaleString("it-IT")}`
                                      : m.status === "PENDING"
                                        ? "In coda"
                                        : m.status}
                                  </span>
                                  <button
                                    type="button"
                                    className="velvet-btn velvet-btn--secondary"
                                    style={{ padding: "0.2rem 0.45rem", minWidth: "2rem" }}
                                    title="Elimina notifica"
                                    aria-label="Elimina notifica"
                                    disabled={deleteMessageM.isPending && deletingMessageId === m.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteMessageM.mutate(m.id);
                                    }}
                                  >
                                    {deleteMessageM.isPending && deletingMessageId === m.id ? "..." : "Elimina"}
                                  </button>
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </SalonStandardSectionGuard>
  );
}
