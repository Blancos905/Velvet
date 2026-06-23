import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { MeSalonNotificationInbox, MeSalonNotificationTypeStat } from "../../api/types";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { useMeNotificationInboxQuery } from "../../hooks/useMeNotificationInbox";
import { useMeNotificationMessagesQuery } from "../../hooks/useMeNotificationMessages";
import { useMeSalonNotificationInboxQuery } from "../../hooks/useMeSalonNotificationInbox";
import { useMeSalonNotificationMessagesQuery } from "../../hooks/useMeSalonNotificationMessages";
import { SalonNotificationMessageLine } from "../../components/SalonNotificationMessageLine";
import "../../styles/velvet-consumer-bookings-page.css";
import "../../styles/salon-notifications.css";

type NotificationBucket = {
  type: string;
  label: string;
  sent: number;
  pending: number;
};

const ME_NOTIFICATION_BUCKET_DEFS: Array<{ key: string; label: string }> = [
  { key: "BOOKING_CONFIRMATION", label: "Email — conferme, promemoria e recensioni" },
  { key: "BOOKING_UPDATED", label: "Email — prenotazione aggiornata" },
  { key: "BOOKING_CANCELLED", label: "Email — annullamento prenotazione" },
  { key: "SYSTEM", label: "Messaggi Luxury" },
];

const SUPER_ADMIN_SUPPORT_BUCKET = {
  key: "SUPPORT_REQUEST",
  label: "Richieste assistenza (area account)",
};
const ME_NOTIFICATIONS_UNAUTHORIZED_KEY = "velvet.meNotificationsUnauthorized";

function markNotificationsUnauthorized(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ME_NOTIFICATIONS_UNAUTHORIZED_KEY, "1");
}

function hasNotificationsUnauthorizedFlag(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ME_NOTIFICATIONS_UNAUTHORIZED_KEY) === "1";
}

function isUnauthorizedError(err: unknown): boolean {
  return err instanceof Error && /\b401\b|unauthorized/i.test(err.message);
}

function normalizeRows(
  rows: MeSalonNotificationTypeStat[] | undefined,
  bucketDefs: Array<{ key: string; label: string }>,
): NotificationBucket[] {
  const acc = new Map<string, NotificationBucket>(
    bucketDefs.map((b) => [b.key, { type: b.key, label: b.label, sent: 0, pending: 0 }]),
  );
  for (const row of rows ?? []) {
    const bucket = acc.get(row.type);
    if (!bucket) continue;
    bucket.sent += Number.isFinite(row.sent) ? row.sent : 0;
    bucket.pending += Number.isFinite(row.pending) ? row.pending : 0;
  }
  return bucketDefs.map((b) => acc.get(b.key)!).filter(Boolean);
}

function countBadge(value: number, variant: "sent" | "pending", title: string) {
  const cls =
    "velvet-salon-notif-badge velvet-salon-notif-badge--" +
    variant +
    (value === 0 ? " velvet-salon-notif-badge--zero" : "");
  return <span className={cls} title={title}>{value}</span>;
}

const STAFF_SALON_NOTIFICATION_BUCKETS: Array<{ key: string; label: string }> = [
  { key: "BOOKING_CONFIRMATION", label: "Email — prenotazione" },
  { key: "BOOKING_UPDATED", label: "Email — prenotazione aggiornata" },
  { key: "BOOKING_CANCELLED", label: "Email — annullamento prenotazione" },
  { key: "SYSTEM", label: "Messaggi Luxury" },
];

function countSalonStaffBadge(value: number, title: string) {
  const cls =
    "velvet-salon-notif-badge velvet-salon-notif-badge--incoming" +
    (value === 0 ? " velvet-salon-notif-badge--zero" : "");
  return (
    <span className={cls} title={title}>
      {value}
    </span>
  );
}

function normalizeSalonStaffRows(
  rows: MeSalonNotificationTypeStat[] | undefined,
): Array<{ type: string; label: string; sent: number; pending: number }> {
  const acc = new Map(
    STAFF_SALON_NOTIFICATION_BUCKETS.map((b) => [b.key, { type: b.key, label: b.label, sent: 0, pending: 0 }]),
  );
  for (const row of rows ?? []) {
    const bucket = acc.get(row.type);
    if (!bucket) continue;
    bucket.sent += Number.isFinite(row.sent) ? row.sent : 0;
    bucket.pending += Number.isFinite(row.pending) ? row.pending : 0;
  }
  return STAFF_SALON_NOTIFICATION_BUCKETS.map((b) => acc.get(b.key)!);
}

/** Centro notifiche per account operatore: stesse API del titolare ma filtrate sul proprio operatore. */
function StaffSalonNotificationsView() {
  const queryClient = useQueryClient();
  const { accessToken } = useVelvetAuth();
  const inbox = useMeSalonNotificationInboxQuery(true);
  const normalizedRows = normalizeSalonStaffRows(inbox.data?.types);
  const [openBucket, setOpenBucket] = useState<string | null>(null);
  const [dismissedBuckets, setDismissedBuckets] = useState<Record<string, boolean>>({});
  const [ackBucketApiUnavailable, setAckBucketApiUnavailable] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const messages = useMeSalonNotificationMessagesQuery(openBucket);
  const ackBucketM = useMutation({
    mutationFn: (bucket: string) =>
      apiJson<MeSalonNotificationInbox>(
        `/api/v1/me/salon/notifications/inbox/ack-bucket?bucket=${encodeURIComponent(bucket)}`,
        { method: "POST", accessToken },
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
  const deleteSalonMessageM = useMutation({
    mutationFn: (messageId: string) =>
      apiJson<void>(`/api/v1/me/salon/notifications/messages/${encodeURIComponent(messageId)}`, {
        method: "DELETE",
        accessToken,
      }),
    onMutate: (messageId) => setDeletingMessageId(messageId),
    onSettled: () => {
      setDeletingMessageId(null);
      void queryClient.invalidateQueries({ queryKey: ["me", "salon", "notifications"] });
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
    <main className="velvet-page-main velvet-consumer-bookings-dash velvet-consumer-bookings-dash--base44 velvet-salon-notif-page">
      <div className="velvet-consumer-bookings-dash__shell">
        <header className="velvet-consumer-bookings-dash__header--hero">
          <div className="velvet-consumer-bookings-dash__hero-glow" aria-hidden />
          <div className="velvet-consumer-bookings-dash__title-row">
            <h1 className="velvet-consumer-bookings-dash__headline">
              <span className="velvet-consumer-bookings-dash__headline-pre">Le mie </span>
              <span className="velvet-consumer-bookings-dash__headline-accent">notifiche</span>
            </h1>
            <p className="velvet-consumer-bookings-dash__total-pill" aria-label={`Totale notifiche ${totalNotifications}`}>
              <span className="velvet-consumer-bookings-dash__total-pill__n" aria-hidden>
                {totalNotifications}
              </span>
              <span className="velvet-consumer-bookings-dash__total-pill__label">notifiche</span>
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
            </p>
          </div>
        ) : (
          <div className="velvet-surface-card velvet-salon-notif-hub-card">
            <p className="velvet-salon-notif-hint">
              Apri una riga per lo storico (puoi eliminare i singoli messaggi); quando la richiudi il numerino si azzera fino a
              nuove notifiche.
            </p>
            <ul className="velvet-salon-notif-list" aria-label="Notifiche operatore salone">
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
                      onClick={() => toggleBucket(row.type)}
                      onKeyDown={(e) => onRowKeyDown(e, row.type)}
                    >
                      <p className="velvet-salon-notif-row__label">{row.label}</p>
                      <div className="velvet-salon-notif-row__counts" aria-label={`Conteggi per ${row.label}`}>
                        {countSalonStaffBadge(row.sent + row.pending, "In arrivo")}
                      </div>
                    </div>
                    {expanded ? (
                      <div className="velvet-salon-notif-detail">
                        {messages.isPending ? (
                          <p className="velvet-salon-notif-detail__status">Caricamento messaggi…</p>
                        ) : messages.data && messages.data.length === 0 ? (
                          <p className="velvet-salon-notif-detail__status">Nessun messaggio in questa categoria.</p>
                        ) : (
                          <ul className="velvet-salon-notif-detail__list" aria-label={`Messaggi: ${row.label}`}>
                            {messages.data?.map((m) => (
                              <SalonNotificationMessageLine
                                key={m.id}
                                message={m}
                                categoryLabel={row.label}
                                deleting={deleteSalonMessageM.isPending && deletingMessageId === m.id}
                                onDelete={(messageId) => deleteSalonMessageM.mutate(messageId)}
                              />
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { accessToken, isVelvetSuperAdmin, isSalonStaff, isSalonTitolare } = useVelvetAuth();
  const bucketDefs = useMemo(
    () => (isVelvetSuperAdmin ? [...ME_NOTIFICATION_BUCKET_DEFS, SUPER_ADMIN_SUPPORT_BUCKET] : ME_NOTIFICATION_BUCKET_DEFS),
    [isVelvetSuperAdmin],
  );
  const inbox = useMeNotificationInboxQuery(!isSalonStaff);
  const rows = useMemo(() => {
    if (isSalonStaff) {
      return bucketDefs.map((b) => ({ type: b.key, label: b.label, sent: 0, pending: 0 }));
    }
    return normalizeRows(inbox.data?.types, bucketDefs);
  }, [isSalonStaff, inbox.data?.types, bucketDefs]);
  const [openBucket, setOpenBucket] = useState<string | null>(null);
  const [dismissedBuckets, setDismissedBuckets] = useState<Record<string, boolean>>({});
  const [ackBucketApiUnavailable, setAckBucketApiUnavailable] = useState(false);
  const [notificationsUnauthorized, setNotificationsUnauthorized] = useState<boolean>(() => hasNotificationsUnauthorizedFlag());
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const messages = useMeNotificationMessagesQuery(isSalonStaff ? null : openBucket);

  const ackBucketM = useMutation({
    mutationFn: (bucket: string) =>
      apiJson<MeSalonNotificationInbox>(`/api/v1/me/notifications/inbox/ack-bucket?bucket=${encodeURIComponent(bucket)}`, {
        method: "POST",
        accessToken,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["me", "notifications"], data);
      void queryClient.invalidateQueries({ queryKey: ["me", "notifications", "messages"] });
    },
    onError: (err, bucket) => {
      if (err instanceof Error && /\b404\b|not found/i.test(err.message)) {
        setAckBucketApiUnavailable(true);
        setDismissedBuckets((prev) => ({ ...prev, [bucket]: true }));
      }
      if (isUnauthorizedError(err)) {
        markNotificationsUnauthorized();
        setNotificationsUnauthorized(true);
      }
    },
  });

  useEffect(() => {
    if (isSalonStaff || !isVelvetSuperAdmin || location.hash !== "#richieste-assistenza") return;
    setOpenBucket("SUPPORT_REQUEST");
    navigate("/account/notifiche", { replace: true });
  }, [isSalonStaff, isVelvetSuperAdmin, location.hash, navigate]);

  const deleteMessageM = useMutation({
    mutationFn: (messageId: string) =>
      apiJson<void>(`/api/v1/me/notifications/messages/${encodeURIComponent(messageId)}`, {
        method: "DELETE",
        accessToken,
      }),
    onMutate: (messageId) => setDeletingMessageId(messageId),
    onError: (err) => {
      if (isUnauthorizedError(err)) {
        markNotificationsUnauthorized();
        setNotificationsUnauthorized(true);
      }
    },
    onSettled: () => {
      setDeletingMessageId(null);
      void queryClient.invalidateQueries({ queryKey: ["me", "notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["me", "notifications", "messages"] });
    },
  });

  const toggleBucket = useCallback((key: string) => {
    if (notificationsUnauthorized) {
      setOpenBucket((prev) => (prev === key ? null : key));
      return;
    }
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
  }, [ackBucketApiUnavailable, ackBucketM, notificationsUnauthorized, openBucket]);

  const onRowKeyDown = useCallback((e: KeyboardEvent, key: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleBucket(key);
    }
  }, [toggleBucket]);

  const rowsForView = rows.map((row) =>
    ackBucketApiUnavailable && dismissedBuckets[row.type] ? { ...row, sent: 0, pending: 0 } : row,
  );
  const totalNotifications = rowsForView.reduce((acc, row) => acc + row.sent + row.pending, 0);

  if (isSalonStaff || isSalonTitolare) {
    return <StaffSalonNotificationsView />;
  }

  return (
    <main className="velvet-page-main velvet-consumer-bookings-dash velvet-consumer-bookings-dash--base44 velvet-salon-notif-page">
      <div className="velvet-consumer-bookings-dash__shell">
        <header className="velvet-consumer-bookings-dash__header--hero">
          <div className="velvet-consumer-bookings-dash__hero-glow" aria-hidden />
          <div className="velvet-consumer-bookings-dash__title-row">
            <h1 className="velvet-consumer-bookings-dash__headline">
              <span className="velvet-consumer-bookings-dash__headline-pre">Le mie </span>
              <span className="velvet-consumer-bookings-dash__headline-accent">notifiche</span>
            </h1>
            <p className="velvet-consumer-bookings-dash__total-pill" aria-label={`Totale notifiche ${totalNotifications}`}>
              <span className="velvet-consumer-bookings-dash__total-pill__n" aria-hidden>
                {totalNotifications}
              </span>
              <span className="velvet-consumer-bookings-dash__total-pill__label">notifiche</span>
            </p>
          </div>
        </header>

      <div className="velvet-surface-card velvet-salon-notif-hub-card">
          {inbox.isError ? (
            <p className="velvet-text-muted" style={{ margin: "0 0 0.75rem" }} role="alert">
              Non riusciamo a leggere i conteggi. Verifica la connessione e l&apos;API{" "}
              <code className="velvet-text-muted">/api/v1/me/notifications</code>. Le categorie restano consultabili sotto.
            </p>
          ) : null}
          <p className="velvet-salon-notif-hint">
            Apri una categoria per leggere i messaggi; quando la richiudi (o passi a un&apos;altra categoria), viene segnata
            come consultata e il numerino si aggiorna.
          </p>
          {notificationsUnauthorized ? (
            <p className="velvet-salon-notif-hint" style={{ marginTop: "0.55rem" }}>
              Sessione scaduta per le notifiche: fai logout/login per riattivare il centro notifiche.
            </p>
          ) : null}
          <ul
            className="velvet-salon-notif-list"
            aria-label="Conteggi notifiche cliente"
            aria-busy={inbox.isPending}
          >
            {rowsForView.map((row) => {
              const expanded = openBucket === row.type;
              return (
                <li key={row.type} className="velvet-salon-notif-item">
                  <div
                    className={"velvet-salon-notif-row velvet-salon-notif-row--interactive" + (expanded ? " velvet-salon-notif-row--expanded" : "")}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleBucket(row.type)}
                    onKeyDown={(e) => onRowKeyDown(e, row.type)}
                  >
                    <p className="velvet-salon-notif-row__label">{row.label}</p>
                    <div className="velvet-salon-notif-row__counts">
                      {countBadge(row.sent, "sent", "Inviate")}
                      {countBadge(row.pending, "pending", "In coda")}
                    </div>
                  </div>
                  {expanded ? (
                    <div className="velvet-salon-notif-detail">
                      {messages.isPending ? (
                        <p className="velvet-salon-notif-detail__status">Caricamento messaggi…</p>
                      ) : messages.data && messages.data.length === 0 ? (
                        <p className="velvet-salon-notif-detail__status">Nessun messaggio in questa categoria.</p>
                      ) : (
                        <ul className="velvet-salon-notif-detail__list">
                          {messages.data?.map((m) => (
                            <SalonNotificationMessageLine
                              key={m.id}
                              message={m}
                              categoryLabel={row.label}
                              deleteLabel="Cancella"
                              deleting={deleteMessageM.isPending && deletingMessageId === m.id}
                              onDelete={(messageId) => deleteMessageM.mutate(messageId)}
                            />
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
      </div>
      </div>
    </main>
  );
}
