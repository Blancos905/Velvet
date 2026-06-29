import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { MeSalonNotificationMessage } from "../../api/types";
import { useAdminAuth } from "../../auth/AdminAuthProvider";
import { deleteAdminSupportInbox, fetchAdminSupportInbox } from "./adminSupportInboxApi";
import { useAdminConfirmAction } from "./useAdminConfirmAction";
import {
  extractEmailFromRichiedenteValue,
  formatRelativePastIt,
  humanizeNotificationStatus,
  humanizeNotificationType,
  parseSupportInboxBody,
} from "./supportInboxParse";

function supportInboxHint(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes("404") ||
    lower.includes("not found") ||
    lower.includes("no static resource") ||
    lower.includes("static resource")
  ) {
    return " La lista Messaggi usa `GET /api/v1/admin/overview?includeSupportInbox=true` (stesso endpoint della dashboard). 404 qui indica che `/api` non arriva a Spring o il backend non è aggiornato. Archivia: `DELETE /api/v1/admin/overview/supportmessages/{id}`.";
  }
  return "";
}

function messageMatchesQuery(m: MeSalonNotificationMessage, q: string): boolean {
  if (!q.trim()) return true;
  const needle = q.trim().toLowerCase();
  const parsed = parseSupportInboxBody(m.previewLine);
  const hay = [
    m.clientName,
    m.notificationType,
    m.status,
    parsed.userMessage,
    ...parsed.metaLines.map((l) => `${l.label} ${l.value}`),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export default function AdminAssistenzaPage() {
  const { accessToken, isAdminSession } = useAdminAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const fromSalonsOnly = location.pathname.includes("/admin/messaggi");

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [techOpen, setTechOpen] = useState<Set<string>>(() => new Set());
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null);
  const [copyFlash, setCopyFlash] = useState<string | null>(null);
  const { showSuccess, actionBanner } = useAdminConfirmAction();

  const listQ = useQuery({
    queryKey: ["admin", "support-inbox", fromSalonsOnly ? "salons" : "all", accessToken],
    enabled: Boolean(accessToken) && isAdminSession,
    retry: false,
    staleTime: 20_000,
    queryFn: () => {
      if (!accessToken) throw new Error("Sessione non disponibile.");
      return fetchAdminSupportInbox(accessToken, fromSalonsOnly);
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => {
      if (!accessToken) throw new Error("Sessione non disponibile.");
      return deleteAdminSupportInbox(accessToken, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "support-inbox"] });
      setPendingArchiveId(null);
      showSuccess("Richiesta archiviata con successo.");
    },
  });

  const filtered = useMemo(() => {
    const rows = listQ.data ?? [];
    return rows.filter((m) => messageMatchesQuery(m, search));
  }, [listQ.data, search]);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleTech = useCallback((id: string) => {
    setTechOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const flashCopy = useCallback((key: string) => {
    setCopyFlash(key);
    window.setTimeout(() => setCopyFlash((k) => (k === key ? null : k)), 2000);
  }, []);

  const copyText = useCallback(
    async (key: string, text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        flashCopy(key);
      } catch {
        window.alert("Impossibile copiare negli appunti. Controlla i permessi del browser.");
      }
    },
    [flashCopy],
  );

  const title = fromSalonsOnly ? "Messaggi dai saloni" : "Assistenza";
  const intro = fromSalonsOnly
    ? "Richieste inviate dal modulo Assistenza da parte di titolari di salone e operatori staff (non i clienti finali)."
    : "Messaggi inviati da titolari, clienti e staff dal modulo Assistenza nell'area account. Email e WhatsApp restano contatti diretti sul sito; qui vedi solo le richieste inviate dal pannello interno.";
  const emptyHint = fromSalonsOnly
    ? "Nessun messaggio dai saloni. Quando un titolare o uno staff invia il modulo Assistenza, comparirà qui."
    : "Nessuna richiesta in elenco. Quando qualcuno invia il modulo Assistenza, comparirà qui.";
  const listLabel = fromSalonsOnly ? "Messaggi dai saloni" : "Richieste assistenza";

  const errText = listQ.isError
    ? `${listQ.error instanceof Error ? listQ.error.message : "Impossibile caricare le richieste."}${supportInboxHint(listQ.error)}`
    : "";

  const total = listQ.data?.length ?? 0;
  const hasFilterMismatch = Boolean(search.trim() && filtered.length < total && total > 0);

  return (
    <div className="luxury-admin-panel luxury-admin-panel--support-inbox">
      {actionBanner}
      <p className="luxury-admin-support-page__back">
        <Link to="/admin/dashboard" className="luxury-admin-back-link">
          ← Panoramica
        </Link>
      </p>

      <nav className="luxury-admin-subchips" aria-label="Vista inbox" style={{ marginBottom: "1rem" }}>
        <Link
          to="/admin/messaggi"
          className={`luxury-admin-subchip ${fromSalonsOnly ? "is-active" : ""}`}
          aria-current={fromSalonsOnly ? "page" : undefined}
        >
          Messaggi dai saloni
        </Link>
        <Link
          to="/admin/assistenza"
          className={`luxury-admin-subchip ${!fromSalonsOnly ? "is-active" : ""}`}
          aria-current={!fromSalonsOnly ? "page" : undefined}
        >
          Tutte le richieste
        </Link>
      </nav>

      <h1 className="luxury-admin-page-title">{title}</h1>
      <p className="luxury-admin-muted" style={{ marginTop: 0, maxWidth: "42rem" }}>
        {intro}
      </p>

      <div className="luxury-admin-support-toolbar">
        <div className="luxury-admin-support-toolbar__actions" aria-label="Azioni elenco">
          <button
            type="button"
            className={`luxury-admin-subchip ${listQ.isFetching ? "is-loading" : ""}`}
            disabled={!isAdminSession || listQ.isFetching}
            onClick={() => void listQ.refetch()}
          >
            {listQ.isFetching ? "Aggiornamento…" : "Aggiorna elenco"}
          </button>
          {listQ.data != null ? (
            <span className="luxury-admin-muted luxury-admin-support-toolbar__count">
              {search.trim() ? (
                <>
                  <strong className="luxury-admin-support-toolbar__count-strong">{filtered.length}</strong>
                  <span> di {total}</span>
                </>
              ) : (
                <>
                  <strong className="luxury-admin-support-toolbar__count-strong">{total}</strong>
                  <span> {total === 1 ? "richiesta" : "richieste"}</span>
                </>
              )}
            </span>
          ) : null}
        </div>
        <label className="luxury-admin-support-search">
          <span className="luxury-admin-support-search__label">Cerca</span>
          <input
            type="search"
            className="luxury-admin-support-search__input"
            placeholder="Oggetto, testo, email, tipo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-label="Filtra le richieste per oggetto, testo o email"
          />
        </label>
      </div>

      {hasFilterMismatch ? (
        <p className="luxury-admin-support-filter-hint" role="status">
          Nessun risultato con questo filtro.{" "}
          <button type="button" className="luxury-admin-support-filter-hint__clear" onClick={() => setSearch("")}>
            Cancella filtri
          </button>
        </p>
      ) : null}

      {listQ.isLoading ? <p className="luxury-admin-muted">Caricamento…</p> : null}
      {listQ.isError ? (
        <p className="luxury-alert luxury-alert--error" role="alert">
          {errText}
        </p>
      ) : null}

      {!isAdminSession && accessToken ? (
        <p className="luxury-alert luxury-alert--error" role="alert">
          Sessione non valida per il pannello super admin (manca il ruolo ADMIN). Esci e accedi di nuovo.
        </p>
      ) : null}

      {listQ.data && listQ.data.length === 0 ? (
        <p className="luxury-admin-muted luxury-admin-profile-card luxury-admin-profile-card--notice" role="status">
          {emptyHint}
        </p>
      ) : null}

      {listQ.data && listQ.data.length > 0 && filtered.length === 0 ? (
        <p className="luxury-admin-muted luxury-admin-profile-card luxury-admin-profile-card--notice" role="status">
          Nessuna richiesta corrisponde alla ricerca.{" "}
          <button type="button" className="luxury-admin-support-filter-hint__clear" onClick={() => setSearch("")}>
            Cancella filtri
          </button>
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <ul className="luxury-admin-support-inbox-list" aria-label={listLabel}>
          {filtered.map((m) => {
            const parsed = parseSupportInboxBody(m.previewLine);
            const isOpen = expanded.has(m.id);
            const richiedente = parsed.metaLines.find((l) => l.label.toLowerCase() === "richiedente");
            const mailtoEmail = richiedente ? extractEmailFromRichiedenteValue(richiedente.value) : null;
            const relative = formatRelativePastIt(m.sentAt);
            const techExpanded = techOpen.has(m.id);
            const primaryLine =
              parsed.userMessage.split(/\n/).find((l) => l.trim())?.trim() || parsed.userMessage.trim() || "—";

            return (
              <li key={m.id} className={`luxury-admin-support-inbox-item ${isOpen ? "is-expanded" : ""}`}>
                <div className="luxury-admin-support-inbox-item__top">
                  <button
                    type="button"
                    className="luxury-admin-support-inbox-item__expand"
                    aria-expanded={isOpen}
                    aria-label={
                      isOpen
                        ? `Chiudi dettagli: ${m.clientName}`
                        : `Apri dettagli richiesta: ${m.clientName}. ${primaryLine}. ${
                            m.sentAt ? new Date(m.sentAt).toLocaleString("it-IT") : ""
                          }`.trim()
                    }
                    onClick={() => toggleExpanded(m.id)}
                  >
                    <span className="luxury-admin-support-inbox-item__chevron" aria-hidden={true} />
                    <span className="luxury-admin-support-inbox-item__expand-text" aria-hidden={true}>
                      <span className="luxury-admin-support-inbox-item__title-row">
                        <span className="luxury-admin-support-inbox-item__title">{m.clientName}</span>
                        {!isOpen ? (
                          <span className="luxury-admin-support-inbox-item__preview-line">{primaryLine}</span>
                        ) : null}
                      </span>
                      <span className="luxury-admin-support-inbox-item__dates">
                        {relative ? <span className="luxury-admin-support-inbox-item__rel">{relative}</span> : null}
                        <span
                          className="luxury-admin-support-inbox-item__abs"
                          title={m.sentAt ? new Date(m.sentAt).toISOString() : undefined}
                        >
                          {m.sentAt ? new Date(m.sentAt).toLocaleString("it-IT") : "—"}
                        </span>
                      </span>
                    </span>
                  </button>
                </div>

                <div className="luxury-admin-support-inbox-item__chips" aria-label="Tipo notifica">
                  <span className="luxury-admin-support-chip luxury-admin-support-chip--type">
                    {humanizeNotificationType(m.notificationType)}
                  </span>
                  <span className="luxury-admin-support-chip">{humanizeNotificationStatus(m.status)}</span>
                  {m.appointmentId ? (
                    <span className="luxury-admin-support-chip luxury-admin-support-chip--muted" title="Appuntamento collegato">
                      Appuntamento
                    </span>
                  ) : null}
                </div>

                <div className="luxury-admin-support-inbox-item__body-wrap" hidden={!isOpen}>
                  <div className="luxury-admin-support-inbox-message">
                    <div className="luxury-admin-support-inbox-message__head">
                      <span className="luxury-admin-support-inbox-message__label">Messaggio</span>
                      <div className="luxury-admin-support-inbox-message__tools">
                        <button
                          type="button"
                          className="luxury-admin-btn luxury-admin-btn--ghost"
                          onClick={() => void copyText(`${m.id}:msg`, parsed.userMessage || m.previewLine)}
                        >
                          {copyFlash === `${m.id}:msg` ? "Copiato" : "Copia testo"}
                        </button>
                        {mailtoEmail ? (
                          <a className="luxury-admin-btn luxury-admin-btn--ghost" href={`mailto:${mailtoEmail}`}>
                            Apri email
                          </a>
                        ) : null}
                      </div>
                    </div>
                    <p className="luxury-admin-support-inbox-message__text">
                      {parsed.userMessage || (
                        <span className="luxury-admin-muted">Nessun testo nel corpo della richiesta.</span>
                      )}
                    </p>
                  </div>

                  {parsed.hasStructuredMeta ? (
                    <div className="luxury-admin-support-inbox-meta">
                      <h3 className="luxury-admin-support-inbox-meta__title">Dettagli richiedente</h3>
                      <dl className="luxury-admin-support-inbox-dl">
                        {parsed.metaLines
                          .filter((row) => !["profilo id", "keycloak sub"].includes(row.label.toLowerCase()))
                          .map((row) => (
                            <div key={row.label} className="luxury-admin-support-inbox-dl__row">
                              <dt>{row.label}</dt>
                              <dd>{row.value}</dd>
                            </div>
                          ))}
                      </dl>

                      <button
                        type="button"
                        className="luxury-admin-support-tech-toggle"
                        aria-expanded={techExpanded}
                        onClick={() => toggleTech(m.id)}
                      >
                        <span
                          className={`luxury-admin-support-inbox-item__chevron ${techExpanded ? "is-open" : ""}`}
                          aria-hidden={true}
                        />
                        Identificativi tecnici
                      </button>
                      {techExpanded ? (
                        <dl className="luxury-admin-support-inbox-dl luxury-admin-support-inbox-dl--mono">
                          {parsed.metaLines
                            .filter((row) => ["profilo id", "keycloak sub", "timestamp utc"].includes(row.label.toLowerCase()))
                            .map((row) => (
                              <div key={row.label} className="luxury-admin-support-inbox-dl__row">
                                <dt>{row.label}</dt>
                                <dd>
                                  <span className="luxury-admin-support-inbox-dl__value">{row.value}</span>
                                  <button
                                    type="button"
                                    className="luxury-admin-btn luxury-admin-btn--ghost luxury-admin-support-inbox-dl__copy"
                                    onClick={() => void copyText(`${m.id}:${row.label}`, row.value)}
                                  >
                                    {copyFlash === `${m.id}:${row.label}` ? "OK" : "Copia"}
                                  </button>
                                </dd>
                              </div>
                            ))}
                        </dl>
                      ) : null}
                    </div>
                  ) : (
                    <pre className="luxury-admin-support-inbox-item__body luxury-admin-support-inbox-item__body--fallback">
                      {m.previewLine}
                    </pre>
                  )}

                  <div className="luxury-admin-support-inbox-item__actions">
                    {pendingArchiveId === m.id ? (
                      <div className="luxury-admin-support-archive-confirm">
                        <span>Sei sicuro di voler archiviare questa richiesta?</span>
                        <button
                          type="button"
                          className="luxury-admin-btn luxury-admin-btn--danger"
                          disabled={deleteM.isPending}
                          onClick={() => deleteM.mutate(m.id)}
                        >
                          {deleteM.isPending ? "Archiviazione…" : "Sì, archivia"}
                        </button>
                        <button
                          type="button"
                          className="luxury-admin-btn luxury-admin-btn--ghost"
                          disabled={deleteM.isPending}
                          onClick={() => setPendingArchiveId(null)}
                        >
                          Annulla
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="luxury-admin-btn luxury-admin-btn--danger"
                        disabled={deleteM.isPending}
                        onClick={() => setPendingArchiveId(m.id)}
                      >
                        Archivia
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
