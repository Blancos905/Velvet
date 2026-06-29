import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { apiFetch, apiJson } from "../../api/client";
import type {
  OrganizationDetail,
  SalonCatalogClientRow,
  SalonClientMembershipDto,
  SalonLuxuryChatInboxSummaryDto,
  SalonLuxuryChatMessageDto,
} from "../../api/types";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { parseSalonPlanTier } from "../../data/salonPlans";
import { useEffectiveSalonPlanTier } from "../../hooks/useEffectiveSalonPlanTier";
import { ME_SALON_CHAT_UNREAD_QUERY_KEY } from "../../hooks/useMeSalonChatUnread";
import { useMeSalonSummaryQuery } from "../../hooks/useMeSalonSummary";
import { useMeStaffSalonQuery } from "../../hooks/useMeStaffSalon";
import { isVelvetNativeAppShell } from "../../hooks/useVelvetNativeAppShell";
import {
  clearSalonChatInboxSummaries404,
  isSalonChatInboxSummaries404,
  markSalonChatInboxSummaries404,
} from "../../lib/salonChatInbox404";
import "../../styles/luxury-account-page-shell.css";
import "../../styles/luxury-account-salon-services.css";
import "../../styles/luxury-consumer-bookings-page.css";
import "../../styles/salon-clients-page.css";
import "../../styles/salon-luxury-chat-page.css";
import "../../styles/salon-luxury-chat-native-app.css";

function messageReadByRecipient(msg: SalonLuxuryChatMessageDto): boolean {
  if (typeof msg.readByRecipient === "boolean") return msg.readByRecipient;
  const legacy = msg as unknown as { read_by_recipient?: boolean };
  return legacy.read_by_recipient === true;
}

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Ora/data compatta per la lista chat in app (stile WhatsApp). */
function fmtChatListTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Ieri";
    return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return fmtWhen(iso);
  }
}

/** Anteprima ultimo messaggio con prefisso mittente (vista salone vs cliente). */
function formatChatThreadPreview(
  salonSide: boolean,
  lastPreview: string,
  lastSender: SalonLuxuryChatInboxSummaryDto["lastSender"],
): string {
  const raw = lastPreview.trim();
  if (!raw) return "";
  if (salonSide) {
    if (lastSender === "CLIENT") return `Cliente: ${raw}`;
    if (lastSender === "OWNER") return `Salone: ${raw}`;
    return raw;
  }
  if (lastSender === "CLIENT") return `Tu: ${raw}`;
  if (lastSender === "OWNER") return `Salone: ${raw}`;
  return raw;
}

/** Chiave stabile per UUID salon client (UUID a volte con casing misto). */
function normChatClientId(id: string | undefined | null): string {
  return (id ?? "").trim().toLowerCase();
}

/** Chiave stabile per accoppiare inbox ↔ thread (salonClient + operatore opzionale). */
function chatThreadKey(salonClientId: string, staffOperatorId?: string | null): string {
  const client = normChatClientId(salonClientId);
  const op = (staffOperatorId ?? "").trim().toLowerCase();
  return op ? `${client}:${op}` : client;
}

/** Iniziali per avatar stile Messenger (max 2 caratteri). */
function chatAvatarInitials(label: string): string {
  const t = label.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

/** `Instant` JSON di solito è ISO string; tolleriamo varianti. */
function asIsoString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") {
    const t = v.trim();
    return t;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    try {
      return new Date(v).toISOString();
    } catch {
      return "";
    }
  }
  return "";
}

function normalizeInboxSummary(raw: unknown): SalonLuxuryChatInboxSummaryDto | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const idRaw = o.salonClientId ?? o.salon_client_id;
  const salonClientId =
    typeof idRaw === "string" ? idRaw.trim() : typeof idRaw === "number" ? String(idRaw) : "";
  if (!salonClientId) return null;
  const unreadRaw = o.unreadCount ?? o.unread_count;
  let unreadCount = 0;
  if (typeof unreadRaw === "number" && Number.isFinite(unreadRaw)) {
    unreadCount = Math.max(0, Math.floor(unreadRaw));
  } else if (typeof unreadRaw === "string" && unreadRaw.trim()) {
    const n = parseInt(unreadRaw.trim(), 10);
    if (Number.isFinite(n)) unreadCount = Math.max(0, n);
  }
  const lp = o.lastPreview ?? o.last_preview;
  const lastPreview = typeof lp === "string" ? lp : lp != null ? String(lp) : "";
  const lastMessageAtRaw = asIsoString(o.lastMessageAt ?? o.last_message_at);
  const lastMessageAt = lastMessageAtRaw.length ? lastMessageAtRaw : null;
  const ls = o.lastSender ?? o.last_sender;
  const lastSender = ls === "CLIENT" || ls === "OWNER" ? ls : null;
  const opRaw = o.staffOperatorId ?? o.staff_operator_id;
  const staffOperatorId =
    opRaw == null || opRaw === ""
      ? null
      : typeof opRaw === "string"
        ? opRaw.trim() || null
        : typeof opRaw === "number"
          ? String(opRaw)
          : null;
  const labelRaw = o.counterpartyLabel ?? o.counterparty_label;
  const counterpartyLabel = typeof labelRaw === "string" ? labelRaw.trim() || null : null;
  return {
    salonClientId,
    staffOperatorId,
    counterpartyLabel,
    unreadCount,
    lastPreview,
    lastMessageAt,
    lastSender,
  };
}

/** Spring / proxy: endpoint chat assente (backend non aggiornato o API base sbagliata). */
function isSalonChatApiNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const t = `${err.message} ${err.name}`.toLowerCase();
  return /\b404\b/.test(t) || t.includes("not found") || t.includes("no endpoint") || t.includes("unknown path");
}

type SalonLuxuryChatComposerProps = {
  accessToken: string;
  salonClientId: string;
  staffOperatorId?: string | null;
  chatEndpointMissing: boolean;
  /** Stesso contesto sede del catalogo clienti (titolare / staff Premium). */
  salonSideHeaders?: Record<string, string>;
};

function chatMessagesUrl(salonClientId: string, staffOperatorId?: string | null): string {
  const p = new URLSearchParams({ salonClientId });
  const op = (staffOperatorId ?? "").trim();
  if (op) p.set("staffOperatorId", op);
  return `/api/v1/me/salon-clients/chat/messages?${p.toString()}`;
}

/** Stato `draft` locale: così ogni tasto non ricalcola la lista messaggi (scrittura più fluida). */
const SalonLuxuryChatComposer = memo(function SalonLuxuryChatComposer({
  accessToken,
  salonClientId,
  staffOperatorId,
  chatEndpointMissing,
  salonSideHeaders,
}: SalonLuxuryChatComposerProps) {
  const [draft, setDraft] = useState("");
  const queryClient = useQueryClient();
  const messagesQueryKey = ["me", "salon-chat", "messages", salonClientId, staffOperatorId ?? "", accessToken] as const;

  const sendM = useMutation({
    mutationFn: (body: string) =>
      apiJson<SalonLuxuryChatMessageDto>("/api/v1/me/salon-clients/chat/messages", {
        method: "POST",
        accessToken,
        headers: salonSideHeaders,
        body: JSON.stringify({
          salonClientId,
          ...(staffOperatorId?.trim() ? { staffOperatorId: staffOperatorId.trim() } : {}),
          body,
        }),
      }),
    onSuccess: (msg) => {
      setDraft("");
      queryClient.setQueryData<SalonLuxuryChatMessageDto[]>(messagesQueryKey, (prev) => {
        const list = prev ?? [];
        if (list.some((m) => m.id === msg.id)) return list;
        return [...list, msg];
      });
      void queryClient.invalidateQueries({ queryKey: [...ME_SALON_CHAT_UNREAD_QUERY_KEY] });
      if (!isSalonChatInboxSummaries404()) {
        void queryClient.invalidateQueries({ queryKey: ["me", "salon-chat", "inbox-summaries"] });
      }
    },
  });

  const trySend = useCallback(() => {
    const text = draft.trim();
    if (chatEndpointMissing || !text || sendM.isPending) return;
    sendM.mutate(text);
  }, [chatEndpointMissing, draft, sendM]);

  const onComposerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
      event.preventDefault();
      trySend();
    },
    [trySend],
  );

  return (
    <>
      <form
        className="luxury-salon-chat__composer"
        onSubmit={(e) => {
          e.preventDefault();
          trySend();
        }}
      >
        <textarea
          className="luxury-salon-chat__textarea"
          rows={1}
          placeholder={chatEndpointMissing ? "Aggiorna il backend per inviare messaggi…" : "Messaggio"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onComposerKeyDown}
          enterKeyHint="send"
          maxLength={4000}
          disabled={chatEndpointMissing}
          aria-label="Testo messaggio"
          autoComplete="off"
        />
        <button
          type="submit"
          className="luxury-salon-chat__send"
          disabled={chatEndpointMissing || !draft.trim() || sendM.isPending}
          aria-label="Invia messaggio"
          title="Invia"
        >
          <svg className="luxury-salon-chat__send-icon" viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
            <path
              fill="currentColor"
              d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
            />
          </svg>
        </button>
      </form>
      {sendM.error ? (
        <p className="luxury-alert luxury-alert--error" role="alert" style={{ margin: "0 0.75rem 0.65rem" }}>
          {sendM.error instanceof Error ? sendM.error.message : "Invio non riuscito."}
        </p>
      ) : null}
    </>
  );
});

export default function SalonLuxuryChatPage() {
  const isNativeApp = isVelvetNativeAppShell();
  const { accessToken, isSalonTitolare, isSalonStaff, isVelvetSuperAdmin } = useVelvetAuth();
  const tier = useEffectiveSalonPlanTier();
  const meSalon = useMeSalonSummaryQuery();
  const staffSalon = useMeStaffSalonQuery();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const paramThread = searchParams.get("salonClientId")?.trim() ?? "";
  const paramStaffOperatorId = searchParams.get("staffOperatorId")?.trim() ?? "";

  const [selectedSalonClientId, setSelectedSalonClientId] = useState<string | null>(null);
  const [selectedStaffOperatorId, setSelectedStaffOperatorId] = useState<string | null>(null);
  /** In app: lista conversazioni oppure thread aperto (navigazione tipo WhatsApp). */
  const [nativeShowsThread, setNativeShowsThread] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  const ownerPremium = isSalonTitolare && tier === "PREMIUM";
  const slug = meSalon.data?.primaryLocationSlug?.trim() ?? "";
  const primaryLocationId = meSalon.data?.primaryLocationId?.trim() ?? "";
  const orgFallbackQ = useQuery({
    queryKey: ["public", "organization", slug, "chat"],
    queryFn: () => apiJson<OrganizationDetail>(`/api/v1/public/organizations/${encodeURIComponent(slug)}`),
    enabled: Boolean(isSalonTitolare && slug && !primaryLocationId),
  });
  const staffPremiumChat =
    isSalonStaff &&
    Boolean(staffSalon.data?.primaryLocationId?.trim()) &&
    parseSalonPlanTier(staffSalon.data?.planTier) === "PREMIUM";
  const catalogLocationId = isSalonStaff
    ? (staffSalon.data?.primaryLocationId?.trim() ?? "")
    : primaryLocationId || orgFallbackQ.data?.id || "";
  const listClientsAsSalonSide = ownerPremium || staffPremiumChat;
  const activeChatStaffOperatorId = isSalonStaff ? (staffSalon.data?.staffOperatorId?.trim() || null) : null;
  const salonSideChatHeaders =
    listClientsAsSalonSide && catalogLocationId
      ? ({ "X-Location-Id": catalogLocationId } as Record<string, string>)
      : undefined;

  const membershipsQ = useQuery({
    queryKey: ["me", "salon-clients", accessToken],
    queryFn: () => apiJson<SalonClientMembershipDto[]>("/api/v1/me/salon-clients", { accessToken }),
    enabled: Boolean(accessToken && !isSalonTitolare && !isSalonStaff),
  });

  const catalogClientsQ = useQuery({
    queryKey: ["catalog", "clients", catalogLocationId, accessToken, "chat"],
    queryFn: () =>
      apiJson<SalonCatalogClientRow[]>("/api/v1/clients", {
        accessToken,
        headers: { "X-Location-Id": catalogLocationId },
      }),
    enabled: Boolean(accessToken && listClientsAsSalonSide && catalogLocationId),
  });

  const inboxSummariesQ = useQuery({
    queryKey: ["me", "salon-chat", "inbox-summaries", accessToken ?? "", catalogLocationId, listClientsAsSalonSide],
    queryFn: async () => {
      if (isSalonChatInboxSummaries404()) {
        return [] as SalonLuxuryChatInboxSummaryDto[];
      }
      const r = await apiFetch("/api/v1/me/salon-clients/chat/inbox-summaries", {
        accessToken,
        headers: salonSideChatHeaders,
      });
      if (r.status === 404) {
        markSalonChatInboxSummaries404();
        return [] as SalonLuxuryChatInboxSummaryDto[];
      }
      const text = await r.text();
      if (!r.ok) {
        let msg = `Errore ${r.status}`;
        try {
          const j = JSON.parse(text) as { message?: string; detail?: string; title?: string };
          msg = (j.message?.trim() || j.detail?.trim() || j.title?.trim() || msg) as string;
        } catch {
          if (text?.trim()) msg = text.trim();
        }
        throw new Error(msg);
      }
      clearSalonChatInboxSummaries404();
      if (!text) return [] as SalonLuxuryChatInboxSummaryDto[];
      const parsed = JSON.parse(text) as unknown;
      if (!Array.isArray(parsed)) return [] as SalonLuxuryChatInboxSummaryDto[];
      return parsed.map(normalizeInboxSummary).filter((x): x is SalonLuxuryChatInboxSummaryDto => x != null);
    },
    enabled: Boolean(
      accessToken && ((listClientsAsSalonSide && Boolean(catalogLocationId)) || (!isSalonTitolare && !isSalonStaff)),
    ),
    retry: false,
    /** Aggiornamento da invalidazione + polling leggero per non letti/anteprima nella lista. */
    refetchInterval: isSalonChatInboxSummaries404() ? false : 12_000,
  });

  useEffect(() => {
    if (paramThread) {
      setSelectedSalonClientId(paramThread);
      setSelectedStaffOperatorId(paramStaffOperatorId || null);
      if (isNativeApp) setNativeShowsThread(true);
      return;
    }
    if (!isSalonTitolare && !isSalonStaff && membershipsQ.data?.length && !selectedSalonClientId) {
      setSelectedSalonClientId(membershipsQ.data[0].id);
      setSelectedStaffOperatorId(null);
    }
    if (listClientsAsSalonSide && catalogClientsQ.data?.length && !selectedSalonClientId) {
      setSelectedSalonClientId(catalogClientsQ.data[0].id);
      setSelectedStaffOperatorId(activeChatStaffOperatorId);
    }
  }, [
    paramThread,
    paramStaffOperatorId,
    isNativeApp,
    isSalonTitolare,
    isSalonStaff,
    listClientsAsSalonSide,
    membershipsQ.data,
    catalogClientsQ.data,
    selectedSalonClientId,
    activeChatStaffOperatorId,
  ]);

  const resolvedThreadStaffOperatorId = listClientsAsSalonSide
    ? activeChatStaffOperatorId
    : selectedStaffOperatorId;

  const messagesQ = useQuery({
    queryKey: [
      "me",
      "salon-chat",
      "messages",
      selectedSalonClientId,
      resolvedThreadStaffOperatorId ?? "",
      accessToken,
      catalogLocationId,
      listClientsAsSalonSide,
    ],
    queryFn: () =>
      apiJson<SalonLuxuryChatMessageDto[]>(chatMessagesUrl(selectedSalonClientId!, resolvedThreadStaffOperatorId), {
        accessToken,
        headers: salonSideChatHeaders,
      }),
    enabled: Boolean(accessToken && selectedSalonClientId),
    retry: (failureCount, err) => failureCount < 2 && !isSalonChatApiNotFoundError(err),
    refetchInterval: (q) => (isSalonChatApiNotFoundError(q.state.error) ? false : 5_000),
  });

  useEffect(() => {
    if (!selectedSalonClientId || !messagesQ.isSuccess) return;
    void queryClient.invalidateQueries({ queryKey: [...ME_SALON_CHAT_UNREAD_QUERY_KEY] });
    if (!isSalonChatInboxSummaries404()) {
      void queryClient.invalidateQueries({ queryKey: ["me", "salon-chat", "inbox-summaries"] });
    }
  }, [selectedSalonClientId, messagesQ.isSuccess, queryClient]);

  useEffect(() => {
    if (!isNativeApp || !nativeShowsThread || !messagesQ.data?.length) return;
    const el = streamRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [isNativeApp, nativeShowsThread, messagesQ.data, messagesQ.dataUpdatedAt]);

  const summaryByThreadKey = useMemo(() => {
    const list = inboxSummariesQ.data;
    if (!Array.isArray(list)) return new Map<string, SalonLuxuryChatInboxSummaryDto>();
    const m = new Map<string, SalonLuxuryChatInboxSummaryDto>();
    for (const s of list) {
      m.set(chatThreadKey(s.salonClientId, s.staffOperatorId), s);
    }
    return m;
  }, [inboxSummariesQ.data]);

  const orderedCatalogClients = useMemo(() => {
    const rows = catalogClientsQ.data;
    if (!rows?.length) return [];
    const order = new Map<string, number>();
    (inboxSummariesQ.data ?? []).forEach((s, i) =>
      order.set(chatThreadKey(s.salonClientId, s.staffOperatorId), i),
    );
    const threadKeyForClient = (id: string) =>
      chatThreadKey(id, activeChatStaffOperatorId);
    return [...rows].sort((a, b) => {
      const ia = order.has(threadKeyForClient(a.id)) ? order.get(threadKeyForClient(a.id))! : 99999;
      const ib = order.has(threadKeyForClient(b.id)) ? order.get(threadKeyForClient(b.id))! : 99999;
      if (ia !== ib) return ia - ib;
      return (a.displayName ?? "").localeCompare(b.displayName ?? "", "it", { sensitivity: "base" });
    });
  }, [catalogClientsQ.data, inboxSummariesQ.data, activeChatStaffOperatorId]);

  const orderedConsumerThreads = useMemo(() => {
    const summaries = inboxSummariesQ.data ?? [];
    if (summaries.length) {
      return [...summaries].sort((a, b) => {
        const ta = asIsoString(a.lastMessageAt);
        const tb = asIsoString(b.lastMessageAt);
        if (ta && tb && ta !== tb) return tb.localeCompare(ta);
        if (ta && !tb) return -1;
        if (!ta && tb) return 1;
        const la = (a.counterpartyLabel ?? "").localeCompare(b.counterpartyLabel ?? "", "it", { sensitivity: "base" });
        if (la !== 0) return la;
        return normChatClientId(a.salonClientId).localeCompare(normChatClientId(b.salonClientId));
      });
    }
    return (membershipsQ.data ?? []).map((m) => ({
      salonClientId: m.id,
      staffOperatorId: null as string | null,
      counterpartyLabel: m.name,
      unreadCount: 0,
      lastPreview: "",
      lastMessageAt: null as string | null,
      lastSender: null as SalonLuxuryChatInboxSummaryDto["lastSender"],
    }));
  }, [inboxSummariesQ.data, membershipsQ.data]);

  const mySender: "CLIENT" | "OWNER" = listClientsAsSalonSide ? "OWNER" : "CLIENT";
  const chatEndpointMissing = isSalonChatApiNotFoundError(messagesQ.error);
  const threadCount = listClientsAsSalonSide
    ? (catalogClientsQ.data?.length ?? 0)
    : orderedConsumerThreads.length;

  const selectedLabel = useMemo(() => {
    if (!selectedSalonClientId) return "";
    const threadKey = chatThreadKey(selectedSalonClientId, resolvedThreadStaffOperatorId);
    const fromSummary = summaryByThreadKey.get(threadKey)?.counterpartyLabel?.trim();
    if (fromSummary) return fromSummary;
    if (listClientsAsSalonSide) {
      const row = catalogClientsQ.data?.find((c) => c.id === selectedSalonClientId);
      return row?.displayName ?? "Cliente";
    }
    const m = membershipsQ.data?.find((x) => x.id === selectedSalonClientId);
    return m?.name ?? "Salone";
  }, [
    catalogClientsQ.data,
    membershipsQ.data,
    listClientsAsSalonSide,
    selectedSalonClientId,
    resolvedThreadStaffOperatorId,
    summaryByThreadKey,
  ]);

  const selectedThreadKey = selectedSalonClientId
    ? chatThreadKey(selectedSalonClientId, resolvedThreadStaffOperatorId)
    : "";

  if (isVelvetSuperAdmin) {
    return <Navigate to="/account" replace />;
  }

  if (isSalonStaff) {
    if (staffSalon.isPending || staffSalon.isLoading) {
      return (
        <main className="luxury-page-main luxury-clients-dash luxury-clients-dash--base44 luxury-salon-chat-account luxury-salon-chat-account--salon-side">
          <div className="luxury-clients-dash__shell">
            <p className="luxury-text-muted" style={{ margin: "1.5rem 0" }}>
              Caricamento…
            </p>
          </div>
        </main>
      );
    }
    if (staffSalon.isError) {
      return (
        <main className="luxury-page-main luxury-clients-dash luxury-clients-dash--base44 luxury-salon-chat-account luxury-salon-chat-account--salon-side">
          <div className="luxury-clients-dash__shell">
            <p className="luxury-alert luxury-alert--error" role="alert">
              {staffSalon.error instanceof Error ? staffSalon.error.message : "Impossibile caricare il contesto salone."}
            </p>
            <p className="luxury-text-muted" style={{ marginTop: "0.75rem" }}>
              Senza questi dati non possiamo mostrare i clienti della sede. Verifica la connessione o riprova.
            </p>
            <button
              type="button"
              className="luxury-btn luxury-btn--primary"
              style={{ marginTop: "1rem" }}
              onClick={() => void staffSalon.refetch()}
            >
              Riprova
            </button>
            <p style={{ marginTop: "1.25rem" }}>
              <Link to="/account/staff">Torna all&apos;agenda</Link>
            </p>
          </div>
        </main>
      );
    }
    if (!staffPremiumChat) {
      const hasLocation = Boolean(staffSalon.data?.primaryLocationId?.trim());
      const tier = parseSalonPlanTier(staffSalon.data?.planTier);
      const basePlan = hasLocation && tier !== "PREMIUM";
      return (
        <main className="luxury-page-main luxury-clients-dash luxury-clients-dash--base44 luxury-salon-chat-account luxury-salon-chat-account--salon-side">
          <div className="luxury-clients-dash__shell">
            <header className="luxury-clients-dash__header--hero">
              <div className="luxury-clients-dash__hero-glow" aria-hidden />
              <h1 className="luxury-clients-dash__headline">
                <span className="luxury-clients-dash__headline-pre">Chat con i </span>
                <span className="luxury-clients-dash__headline-accent">clienti</span>
              </h1>
            </header>
            <p className="luxury-text-muted" style={{ marginTop: "1rem", maxWidth: "36rem", lineHeight: 1.55 }}>
              {basePlan ? (
                <>
                  Lo studio è su un piano che non include la chat B2C con l&apos;anagrafica clienti. Quando il titolare
                  passa a <strong>Premium</strong>, qui potrai messaggiare come dalla postazione del salone.
                </>
              ) : !hasLocation ? (
                <>
                  Non risulti collegato a una sede come operatore (stesso controllo dell&apos;agenda). Contatta il titolare
                  del salone se dovresti avere accesso.
                </>
              ) : (
                <>In questo momento la chat non è disponibile per il tuo account.</>
              )}
            </p>
            <p style={{ marginTop: "1.25rem" }}>
              <Link to="/account/staff">Vai all&apos;agenda</Link>
              {" · "}
              <Link to="/account/assistenza">Assistenza</Link>
            </p>
          </div>
        </main>
      );
    }
  }

  if (isSalonTitolare && meSalon.isPending) {
    return (
      <main className="luxury-page-main luxury-clients-dash luxury-clients-dash--base44 luxury-salon-chat-account luxury-salon-chat-account--salon-side">
        <div className="luxury-clients-dash__shell">
          <p className="luxury-text-muted" style={{ margin: "1.5rem 0" }}>
            Caricamento…
          </p>
        </div>
      </main>
    );
  }

  if (isSalonTitolare && !ownerPremium) {
    return <Navigate to="/account/salone" replace />;
  }

  const heroConsumer = (
    <header className="luxury-consumer-bookings-dash__header--hero">
      <div className="luxury-consumer-bookings-dash__hero-glow" aria-hidden />
      <div className="luxury-consumer-bookings-dash__title-row">
        <h1 className="luxury-consumer-bookings-dash__headline">
          <span className="luxury-consumer-bookings-dash__headline-pre">Le mie </span>
          <span className="luxury-consumer-bookings-dash__headline-accent">chat</span>
        </h1>
        <p className="luxury-consumer-bookings-dash__total-pill" aria-label={`Totale conversazioni ${threadCount}`}>
          <span className="luxury-consumer-bookings-dash__total-pill__n" aria-hidden>
            {threadCount}
          </span>
          <span className="luxury-consumer-bookings-dash__total-pill__label">conversazioni</span>
        </p>
      </div>
    </header>
  );

  const heroSalon = (
    <header className="luxury-clients-dash__header--hero">
      <div className="luxury-clients-dash__hero-glow" aria-hidden />
      <div className="luxury-clients-dash__title-row">
        <h1 className="luxury-clients-dash__headline">
          <span className="luxury-clients-dash__headline-pre">{isSalonStaff ? "I " : "I tuoi "}</span>
          <span className="luxury-clients-dash__headline-accent">clienti</span>
          {isSalonStaff ? <span className="luxury-clients-dash__headline-pre"> della sede</span> : null}
        </h1>
        <p className="luxury-clients-dash__total-pill" aria-label={`Totale conversazioni ${threadCount}`}>
          <span className="luxury-clients-dash__total-pill__n" aria-hidden>
            {threadCount}
          </span>
          <span className="luxury-clients-dash__total-pill__label">conversazioni</span>
        </p>
      </div>
    </header>
  );

  const sidebarEmpty = listClientsAsSalonSide ? (
    <p className="luxury-salon-chat__empty">
      {catalogClientsQ.isLoading ? "Caricamento clienti…" : "Nessuna chat."}
    </p>
  ) : (
    <p className="luxury-salon-chat__empty">
      {membershipsQ.isLoading
        ? "Caricamento…"
        : "Non risulti cliente di un salone su Saloni Luxury. Prenota o diventa cliente da una vetrina per iniziare una chat."}
    </p>
  );

  const mainSalonClasses =
    "luxury-page-main luxury-clients-dash luxury-clients-dash--base44 luxury-salon-chat-account luxury-salon-chat-account--salon-side";
  const mainConsumerClasses =
    "luxury-page-main luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-salon-chat-account";
  const nativeMainClass = isNativeApp ? " luxury-salon-chat--native-app" : "";
  const nativeLayoutClass =
    "luxury-salon-chat__layout" +
    (isNativeApp ? " luxury-salon-chat__layout--native" : "") +
    (isNativeApp && nativeShowsThread && selectedSalonClientId
      ? " luxury-salon-chat__layout--native-thread"
      : "");

  const openNativeThread = (salonClientId: string, staffOperatorId: string | null) => {
    setSelectedSalonClientId(salonClientId);
    setSelectedStaffOperatorId(staffOperatorId);
    if (isNativeApp) setNativeShowsThread(true);
  };

  return (
    <main className={(listClientsAsSalonSide ? mainSalonClasses : mainConsumerClasses) + nativeMainClass}>
      <div className={listClientsAsSalonSide ? "luxury-clients-dash__shell" : "luxury-consumer-bookings-dash__shell"}>
        {!isNativeApp ? (listClientsAsSalonSide ? heroSalon : heroConsumer) : null}
        <div className="luxury-salon-chat__shell">
          <div className={nativeLayoutClass}>
            <aside className="luxury-salon-chat__sidebar" aria-label="Conversazioni">
              <div className="luxury-salon-chat__sidebar-title">{listClientsAsSalonSide ? "Clienti" : "I tuoi saloni"}</div>
              {listClientsAsSalonSide
                ? orderedCatalogClients.map((c) => {
                    const threadKey = chatThreadKey(c.id, activeChatStaffOperatorId);
                    const sum = summaryByThreadKey.get(threadKey);
                    const unread = sum?.unreadCount ?? 0;
                    const previewRaw = sum?.lastPreview?.trim() ?? "";
                    const preview = formatChatThreadPreview(true, previewRaw, sum?.lastSender ?? null);
                    const lastAtIso = asIsoString(sum?.lastMessageAt ?? null);
                    const isActive =
                      selectedSalonClientId === c.id &&
                      (activeChatStaffOperatorId ?? "") === (resolvedThreadStaffOperatorId ?? "");
                    return (
                      <button
                        key={threadKey}
                        type="button"
                        className={
                          "luxury-salon-chat__thread-btn" + (isActive ? " luxury-salon-chat__thread-btn--active" : "")
                        }
                        onClick={() => openNativeThread(c.id, activeChatStaffOperatorId)}
                      >
                        {isNativeApp ? (
                          <div className="luxury-salon-chat__thread-avatar" aria-hidden="true">
                            {chatAvatarInitials(c.displayName ?? "")}
                          </div>
                        ) : null}
                        <div className={isNativeApp ? "luxury-salon-chat__thread-content" : undefined}>
                          <div className="luxury-salon-chat__thread-head">
                            <div className="luxury-salon-chat__thread-name">{c.displayName}</div>
                            <div className="luxury-salon-chat__thread-head-end">
                              {unread > 0 ? (
                                <span className="luxury-salon-chat__thread-unread" title={`${unread} messaggi da leggere`}>
                                  {unread > 99 ? "99+" : unread}
                                </span>
                              ) : null}
                              {lastAtIso ? (
                                <span className="luxury-salon-chat__thread-time" title={lastAtIso}>
                                  {isNativeApp ? fmtChatListTime(lastAtIso) : fmtWhen(lastAtIso)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {preview ? (
                            <div className="luxury-salon-chat__thread-preview" title={preview}>
                              {preview}
                            </div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })
                : orderedConsumerThreads.map((thread) => {
                    const threadKey = chatThreadKey(thread.salonClientId, thread.staffOperatorId);
                    const sum = summaryByThreadKey.get(threadKey) ?? thread;
                    const unread = sum.unreadCount ?? 0;
                    const previewRaw = sum.lastPreview?.trim() ?? "";
                    const preview = formatChatThreadPreview(false, previewRaw, sum.lastSender ?? null);
                    const lastAtIso = asIsoString(sum.lastMessageAt ?? null);
                    const label = sum.counterpartyLabel?.trim() || "Salone";
                    const isActive =
                      selectedSalonClientId === thread.salonClientId &&
                      (selectedStaffOperatorId ?? "") === (thread.staffOperatorId ?? "");
                    return (
                      <button
                        key={threadKey}
                        type="button"
                        className={
                          "luxury-salon-chat__thread-btn" + (isActive ? " luxury-salon-chat__thread-btn--active" : "")
                        }
                        onClick={() => openNativeThread(thread.salonClientId, thread.staffOperatorId ?? null)}
                      >
                        {isNativeApp ? (
                          <div className="luxury-salon-chat__thread-avatar" aria-hidden="true">
                            {chatAvatarInitials(label)}
                          </div>
                        ) : null}
                        <div className={isNativeApp ? "luxury-salon-chat__thread-content" : undefined}>
                          <div className="luxury-salon-chat__thread-head">
                            <div className="luxury-salon-chat__thread-name">{label}</div>
                            <div className="luxury-salon-chat__thread-head-end">
                              {unread > 0 ? (
                                <span className="luxury-salon-chat__thread-unread" title={`${unread} messaggi da leggere`}>
                                  {unread > 99 ? "99+" : unread}
                                </span>
                              ) : null}
                              {lastAtIso ? (
                                <span className="luxury-salon-chat__thread-time" title={lastAtIso}>
                                  {isNativeApp ? fmtChatListTime(lastAtIso) : fmtWhen(lastAtIso)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {preview ? (
                            <div className="luxury-salon-chat__thread-preview" title={preview}>
                              {preview}
                            </div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
              {listClientsAsSalonSide && catalogClientsQ.isSuccess && !catalogClientsQ.data?.length ? sidebarEmpty : null}
              {!listClientsAsSalonSide && membershipsQ.isSuccess && !orderedConsumerThreads.length ? sidebarEmpty : null}
            </aside>

            <section className="luxury-salon-chat__panel" aria-label="Messaggi">
              {!selectedSalonClientId ? (
                <div className="luxury-salon-chat__empty">Seleziona una conversazione.</div>
              ) : (
                <>
                  <div className="luxury-salon-chat__panel-head">
                    {isNativeApp ? (
                      <button
                        type="button"
                        className="luxury-salon-chat__panel-back"
                        aria-label="Torna alle conversazioni"
                        onClick={() => setNativeShowsThread(false)}
                      >
                        ←
                      </button>
                    ) : null}
                    <div className="luxury-salon-chat__panel-avatar" aria-hidden="true">
                      {chatAvatarInitials(selectedLabel)}
                    </div>
                    <div className="luxury-salon-chat__panel-head-text">
                      <div className="luxury-salon-chat__panel-title">{selectedLabel}</div>
                    </div>
                  </div>
                  <div className="luxury-salon-chat__stream" ref={streamRef} aria-live="polite">
                    {messagesQ.isLoading ? (
                      <div className="luxury-salon-chat__empty">Caricamento messaggi…</div>
                    ) : chatEndpointMissing ? (
                      <div className="luxury-alert luxury-alert--error" role="alert">
                        Il server non espone ancora la chat (errore 404 su{" "}
                        <code style={{ wordBreak: "break-all" }}>/api/v1/me/salon-clients/chat/messages</code>). Ricompila e
                        riavvia il progetto Spring <strong>velvet</strong> con l&apos;ultimo codice, oppure controlla{" "}
                        <code>VITE_API_BASE_URL</code>: se punta a staging/produzione, va deployato anche il backend lì.
                      </div>
                    ) : messagesQ.error ? (
                      <div className="luxury-alert luxury-alert--error" role="alert">
                        {messagesQ.error instanceof Error ? messagesQ.error.message : "Errore caricamento messaggi."}
                      </div>
                    ) : !messagesQ.data?.length ? (
                      <div className="luxury-salon-chat__empty">Nessun messaggio ancora. Invia il primo saluto qui sotto.</div>
                    ) : (
                      messagesQ.data.map((msg) => {
                        const mine = msg.sender === mySender;
                        const seen = messageReadByRecipient(msg);
                        return (
                          <div
                            key={msg.id}
                            className={"luxury-salon-chat__bubble-row" + (mine ? " luxury-salon-chat__bubble-row--mine" : "")}
                          >
                            <div className="luxury-salon-chat__bubble-stack">
                              <div
                                className={
                                  "luxury-salon-chat__bubble luxury-salon-chat__bubble--" +
                                  (msg.sender === "CLIENT" ? "client" : "owner")
                                }
                                title={fmtWhen(msg.createdAt)}
                              >
                                {msg.body}
                              </div>
                              {mine ? (
                                <div
                                  className={
                                    "luxury-salon-chat__receipt" +
                                    (seen ? " luxury-salon-chat__receipt--seen" : "")
                                  }
                                  title={
                                    seen
                                      ? "L’altro ha aperto la conversazione dopo questo messaggio."
                                      : "L’altro non ha ancora letto (o non ha aperto la chat dopo questo messaggio)."
                                  }
                                >
                                  {isNativeApp ? (seen ? "✓✓" : "✓") : seen ? "Letto" : "Non letto"}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {accessToken ? (
                    <SalonLuxuryChatComposer
                      key={`${selectedThreadKey}-${listClientsAsSalonSide ? catalogLocationId : "consumer"}`}
                      accessToken={accessToken}
                      salonClientId={selectedSalonClientId}
                      staffOperatorId={resolvedThreadStaffOperatorId}
                      chatEndpointMissing={chatEndpointMissing}
                      salonSideHeaders={salonSideChatHeaders}
                    />
                  ) : null}
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
