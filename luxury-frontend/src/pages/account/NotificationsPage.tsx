import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { MeSalonNotificationInbox, MeSalonNotificationMessage, MeSalonNotificationTypeStat } from "../../api/types";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { useMeNotificationInboxQuery } from "../../hooks/useMeNotificationInbox";
import { useMeNotificationMessagesQuery } from "../../hooks/useMeNotificationMessages";
import { useMeSalonNotificationInboxQuery } from "../../hooks/useMeSalonNotificationInbox";
import { useMeSalonNotificationMessagesQuery } from "../../hooks/useMeSalonNotificationMessages";
import { SalonNotificationMessageLine } from "../../components/SalonNotificationMessageLine";
import { CLIENT_ACCOUNT_ICONS, ClientAccountContentCard } from "../../components/account/ClientAccountContentCard";
import { ClientAccountHeroHeader } from "../../components/account/ClientAccountHeroHeader";
import { INFO_PRIVACY_HERO_ICONS } from "../../components/account/InfoPrivacyAccountHeroHeader";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../lib/clientAccountPageShellClasses";
import { isMeNotificationsUnauthorized, markMeNotificationsUnauthorized } from "../../lib/meNotificationsQueryGate";
import "../../styles/luxury-consumer-bookings-page.css";
import "../../styles/luxury-info-privacy-hero.css";
import "../../styles/luxury-feedback-client.css";
import "../../styles/luxury-client-account-page.css";
import "../../styles/luxury-notifications-client.css";
import "../../styles/luxury-notifications-salon.css";
import "../../styles/luxury-notifications-staff.css";
import "../../styles/salon-notifications.css";

type NotificationBucket = {
  type: string;
  label: string;
  sent: number;
  pending: number;
};

const ME_NOTIFICATION_BUCKET_DEFS: Array<{ key: string; label: string }> = [
  { key: "BOOKING_CONFIRMATION", label: "Notifiche — conferme, promemoria e recensioni" },
  { key: "BOOKING_UPDATED", label: "Notifiche — prenotazione aggiornata" },
  { key: "BOOKING_CANCELLED", label: "Notifiche — annullamento prenotazione" },
  { key: "SYSTEM", label: "Messaggi Luxury" },
];

const SUPER_ADMIN_SUPPORT_BUCKET = {
  key: "SUPPORT_REQUEST",
  label: "Richieste assistenza (area account)",
};

function markNotificationsUnauthorized(): void {
  markMeNotificationsUnauthorized();
}

function hasNotificationsUnauthorizedFlag(): boolean {
  return isMeNotificationsUnauthorized();
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
    "luxury-salon-notif-badge luxury-salon-notif-badge--" +
    variant +
    (value === 0 ? " luxury-salon-notif-badge--zero" : "");
  return <span className={cls} title={title}>{value}</span>;
}

const STAFF_SALON_NOTIFICATION_BUCKETS: Array<{ key: string; label: string }> = [
  { key: "BOOKING_CONFIRMATION", label: "Notifiche — prenotazioni e conferme" },
  { key: "BOOKING_UPDATED", label: "Notifiche — prenotazione aggiornata" },
  { key: "BOOKING_CANCELLED", label: "Notifiche — annullamento prenotazione" },
  { key: "SYSTEM", label: "Messaggi Luxury" },
];

function countSalonStaffBadge(value: number, title: string) {
  const cls =
    "luxury-salon-notif-badge luxury-salon-notif-badge--incoming" +
    (value === 0 ? " luxury-salon-notif-badge--zero" : "");
  return (
    <span className={cls} title={title}>
      {value}
    </span>
  );
}

type NotificationBucketMessagesPanelProps = {
  rowLabel: string;
  messages: UseQueryResult<MeSalonNotificationMessage[]>;
  deletingMessageId: string | null;
  deleteOnePending: boolean;
  deleteAllPending: boolean;
  onDeleteOne: (messageId: string) => void;
  onDeleteAll: (messageIds: string[]) => void;
  deleteLabel?: string;
  deleteAllLabel?: string;
  deleteAllPendingLabel?: string;
};

export function NotificationBucketMessagesPanel({
  rowLabel,
  messages,
  deletingMessageId,
  deleteOnePending,
  deleteAllPending,
  onDeleteOne,
  onDeleteAll,
  deleteLabel = "Elimina",
  deleteAllLabel = "Elimina tutte",
  deleteAllPendingLabel = "Eliminazione…",
}: NotificationBucketMessagesPanelProps) {
  if (messages.isLoading) {
    return <p className="luxury-salon-notif-detail__status">Caricamento messaggi…</p>;
  }
  if (messages.isError) {
    return (
      <p className="luxury-salon-notif-detail__status">
        Non riusciamo a caricare l&apos;elenco
        {messages.error instanceof Error && messages.error.message.trim()
          ? ` (${messages.error.message.trim()})`
          : ""}
        .{" "}
        <button
          type="button"
          className="luxury-link-back"
          style={{ display: "inline", padding: 0, border: "none", background: "none", cursor: "pointer" }}
          onClick={() => void messages.refetch()}
        >
          Riprova
        </button>
      </p>
    );
  }
  if (!messages.data || messages.data.length === 0) {
    return <p className="luxury-salon-notif-detail__status">Nessun messaggio in questa categoria.</p>;
  }

  return (
    <>
      <div className="luxury-salon-notif-detail__toolbar">
        <button
          type="button"
          className="luxury-salon-notif-detail__delete-all"
          disabled={deleteAllPending || deleteOnePending}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDeleteAll(messages.data!.map((message) => message.id));
          }}
        >
          {deleteAllPending ? deleteAllPendingLabel : deleteAllLabel}
        </button>
      </div>
      <ul className="luxury-salon-notif-detail__list" aria-label={`Messaggi: ${rowLabel}`}>
        {messages.data.map((message) => (
          <SalonNotificationMessageLine
            key={message.id}
            message={message}
            categoryLabel={rowLabel}
            deleteLabel={deleteLabel}
            deleting={deleteOnePending && deletingMessageId === message.id}
            onDelete={onDeleteOne}
          />
        ))}
      </ul>
    </>
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
  const { accessToken, isSalonStaff, isSalonTitolare } = useLuxuryAuth();
  const inbox = useMeSalonNotificationInboxQuery(true);
  const normalizedRows = normalizeSalonStaffRows(inbox.data?.types);
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
      void queryClient.invalidateQueries({ queryKey: ["me", "salon", "notifications", "messages"] });
    },
  });
  const deleteAllSalonMessagesM = useMutation({
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

  const isStaffOperator = isSalonStaff && !isSalonTitolare;
  const staffNotifTheme = isStaffOperator
    ? "luxury-salon-notif-page--staff-side"
    : "luxury-salon-notif-page--consumer luxury-salon-notif-page--salon-side";

  return (
    <main
      className={`luxury-page-main luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-salon-notif-page ${staffNotifTheme} ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`}
    >
      <div className="luxury-consumer-bookings-dash__shell">
        <ClientAccountHeroHeader
          headlinePre="Le mie "
          headlineAccent="notifiche"
          badgePrimary={isSalonStaff ? "Area operatore" : "Area salone"}
          badgeSecondary="Centro messaggi"
          kickerLabel="Comunicazioni"
          kickerChip={isSalonStaff ? "Avvisi della sede" : "Avvisi del salone"}
          subtitle={
            <>
              Tieni sotto controllo <strong>conferme</strong>, promemoria e annulli inviati ai clienti: apri ogni categoria
              per il <em>dettaglio</em>.
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
            aria-label="Notifiche operatore salone"
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
                    onClick={() => toggleBucket(row.type)}
                    onKeyDown={(e) => onRowKeyDown(e, row.type)}
                  >
                    <p className="luxury-salon-notif-row__label">{row.label}</p>
                    <div className="luxury-salon-notif-row__counts" aria-label={`Conteggi per ${row.label}`}>
                      {countSalonStaffBadge(row.sent + row.pending, "In arrivo")}
                    </div>
                  </div>
                  {expanded ? (
                    <div className="luxury-salon-notif-detail">
                      <NotificationBucketMessagesPanel
                        rowLabel={row.label}
                        messages={messages}
                        deletingMessageId={deletingMessageId}
                        deleteOnePending={deleteSalonMessageM.isPending}
                        deleteAllPending={deletingAll}
                        onDeleteOne={(messageId) => deleteSalonMessageM.mutate(messageId)}
                        onDeleteAll={(messageIds) => deleteAllSalonMessagesM.mutate(messageIds)}
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
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { accessToken, isLuxurySuperAdmin, isSalonStaff, isSalonTitolare } = useLuxuryAuth();
  const bucketDefs = useMemo(
    () => (isLuxurySuperAdmin ? [...ME_NOTIFICATION_BUCKET_DEFS, SUPER_ADMIN_SUPPORT_BUCKET] : ME_NOTIFICATION_BUCKET_DEFS),
    [isLuxurySuperAdmin],
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
  const [deletingAll, setDeletingAll] = useState(false);
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
    if (isSalonStaff || !isLuxurySuperAdmin || location.hash !== "#richieste-assistenza") return;
    setOpenBucket("SUPPORT_REQUEST");
    navigate("/account/notifiche", { replace: true });
  }, [isSalonStaff, isLuxurySuperAdmin, location.hash, navigate]);

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
  const deleteAllMessagesM = useMutation({
    mutationFn: async (messageIds: string[]) => {
      await Promise.all(
        messageIds.map((messageId) =>
          apiJson<void>(`/api/v1/me/notifications/messages/${encodeURIComponent(messageId)}`, {
            method: "DELETE",
            accessToken,
          }),
        ),
      );
    },
    onMutate: () => setDeletingAll(true),
    onError: (err) => {
      if (isUnauthorizedError(err)) {
        markNotificationsUnauthorized();
        setNotificationsUnauthorized(true);
      }
    },
    onSettled: () => {
      setDeletingAll(false);
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
    <main
      className={`luxury-page-main luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-salon-notif-page luxury-salon-notif-page--consumer ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`}
    >
      <div className="luxury-consumer-bookings-dash__shell">
        <ClientAccountHeroHeader
          headlinePre="Le mie "
          headlineAccent="notifiche"
          badgeSecondary="Centro messaggi"
          kickerLabel="Comunicazioni"
          kickerChip="Notifiche e avvisi Luxury"
          subtitle={
            <>
              Consulta conferme, promemoria e messaggi della piattaforma: apri ogni categoria per leggere il{" "}
              <em>dettaglio</em>.
            </>
          }
          metaItems={[
            { icon: CLIENT_ACCOUNT_ICONS.bell, label: `${totalNotifications} notifiche totali` },
            { icon: INFO_PRIVACY_HERO_ICONS.clock, label: "Aggiornamento in tempo reale" },
          ]}
        />

        <ClientAccountContentCard
          ariaLabel="Centro notifiche cliente"
          title="Categorie e messaggi"
        >
          {inbox.isError ? (
            <p className="luxury-text-muted" style={{ margin: "0 0 0.75rem" }} role="alert">
              Non riusciamo a leggere i conteggi. Verifica la connessione e l&apos;API{" "}
              <code className="luxury-text-muted">/api/v1/me/notifications</code>. Le categorie restano consultabili sotto.
            </p>
          ) : null}
          {notificationsUnauthorized ? (
            <p className="luxury-salon-notif-hint" style={{ marginTop: "0.55rem" }}>
              Sessione scaduta per le notifiche: fai logout/login per riattivare il centro notifiche.
            </p>
          ) : null}
          <ul
            className="luxury-salon-notif-list"
            aria-label="Conteggi notifiche cliente"
            aria-busy={inbox.isPending}
          >
            {rowsForView.map((row) => {
              const expanded = openBucket === row.type;
              return (
                <li key={row.type} className="luxury-salon-notif-item">
                  <div
                    className={"luxury-salon-notif-row luxury-salon-notif-row--interactive" + (expanded ? " luxury-salon-notif-row--expanded" : "")}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleBucket(row.type)}
                    onKeyDown={(e) => onRowKeyDown(e, row.type)}
                  >
                    <p className="luxury-salon-notif-row__label">{row.label}</p>
                    <div className="luxury-salon-notif-row__counts">
                      {countBadge(row.sent, "sent", "Inviate")}
                      {countBadge(row.pending, "pending", "In coda")}
                    </div>
                  </div>
                  {expanded ? (
                    <div className="luxury-salon-notif-detail">
                      <NotificationBucketMessagesPanel
                        rowLabel={row.label}
                        messages={messages}
                        deletingMessageId={deletingMessageId}
                        deleteOnePending={deleteMessageM.isPending}
                        deleteAllPending={deletingAll}
                        deleteLabel="Cancella"
                        deleteAllLabel="Cancella tutte"
                        deleteAllPendingLabel="Cancellazione…"
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
  );
}
