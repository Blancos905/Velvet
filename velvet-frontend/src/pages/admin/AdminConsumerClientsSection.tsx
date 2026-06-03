import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, apiJson } from "../../api/client";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { DEFAULT_IT_PHONE_PREFIX, optionalPhoneForRegisterApi } from "../../lib/itPhoneDefaults";
import { velvetPostConsumerSessionPath } from "../../lib/velvetPostConsumerSessionPath";

const CLIENTS_PAGE_SIZE = 10;

type ConsumerSessionResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
};

type SuperAdminConsumerRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  securityRoles: string | null;
  planTier: string | null;
  deletedAt: string | null;
};

type PageConsumers = {
  content: SuperAdminConsumerRow[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
};

function splitRoles(s: string | null | undefined): string[] {
  if (!s?.trim()) return [];
  return s
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Profilo su cui è consentita sessione «come utente» (esclusi eliminati e super admin). */
function canOpenConsumerVelvetSession(row: SuperAdminConsumerRow): boolean {
  if (row.deletedAt) return false;
  return !splitRoles(row.securityRoles).includes("ADMIN");
}

/** Account con ruolo CLIENT usato per prenotare, senza titolare né super admin. */
function isVelvetBookingClientRow(row: SuperAdminConsumerRow): boolean {
  if (row.deletedAt) return false;
  const r = splitRoles(row.securityRoles);
  return r.includes("CLIENT") && !r.includes("OWNER") && !r.includes("ADMIN");
}

type ListScope = "booking" | "all";

type Props = {
  accessToken: string;
  idPrefix: string;
  headingId: string;
};

export function AdminConsumerClientsSection({ accessToken, idPrefix, headingId }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { signInWithIssuedToken } = useVelvetAuth();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [listScope, setListScope] = useState<ListScope>("booking");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: DEFAULT_IT_PHONE_PREFIX,
  });
  const [createErrorHint, setCreateErrorHint] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["admin", "consumers", accessToken, page, CLIENTS_PAGE_SIZE],
    enabled: Boolean(accessToken),
    queryFn: () =>
      apiJson<PageConsumers>(
        `/api/v1/admin/consumers?page=${page}&size=${CLIENTS_PAGE_SIZE}&sort=createdAt,desc`,
        { accessToken },
      ),
  });

  const totalPages = Math.max(1, listQ.data?.totalPages ?? 1);
  const pageSafe = Math.min(page, totalPages - 1);
  const slice = listQ.data?.content ?? [];
  const scopeFiltered = listScope === "booking" ? slice.filter(isVelvetBookingClientRow) : slice;
  const q = search.trim().toLowerCase();
  const filteredRows = q
    ? scopeFiltered.filter(
        (row) =>
          (row.email ?? "").toLowerCase().includes(q) || (row.displayName ?? "").toLowerCase().includes(q),
      )
    : scopeFiltered;

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiFetch(`/api/v1/admin/consumers/${id}`, { method: "DELETE", accessToken });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || r.statusText);
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "consumers"] });
      await qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });

  const consumerLoginM = useMutation({
    mutationFn: (id: string) =>
      apiJson<ConsumerSessionResponse>(`/api/v1/admin/overview/consumers/${id}/session`, {
        method: "POST",
        accessToken,
      }),
    onSuccess: async (body) => {
      await signInWithIssuedToken(body.accessToken);
      navigate(velvetPostConsumerSessionPath(body.accessToken));
    },
  });

  const createClientM = useMutation({
    mutationFn: async () => {
      const phoneOpt = optionalPhoneForRegisterApi(createForm.phone);
      return apiJson<void>("/api/v1/admin/overview/clients", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          email: createForm.email.trim(),
          password: createForm.password,
          firstName: createForm.firstName.trim(),
          lastName: createForm.lastName.trim(),
          ...(phoneOpt !== undefined ? { phone: phoneOpt } : {}),
        }),
      });
    },
    onSuccess: async () => {
      createClientM.reset();
      setCreateForm({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: DEFAULT_IT_PHONE_PREFIX,
      });
      setCreateErrorHint(null);
      setShowCreateModal(false);
      await qc.invalidateQueries({ queryKey: ["admin", "consumers"] });
      await qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  const submitCreateClient = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setCreateErrorHint(null);
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.email.trim()) {
      setCreateErrorHint("Compila nome, cognome ed email.");
      return;
    }
    if (createForm.password.length < 8) {
      setCreateErrorHint("La password deve avere almeno 8 caratteri.");
      return;
    }
    createClientM.mutate();
  };

  return (
    <>
      <section className="velvet-admin-panel velvet-admin-premium-card" aria-labelledby={headingId}>
        <h2 id={headingId} className="velvet-admin-section-title">
          Clienti Saloni Luxury
        </h2>
        <div className="velvet-admin-subchips velvet-admin-premium-card__toolbar" role="toolbar" aria-label="Azioni clienti">
          <button
            type="button"
            className="velvet-admin-btn"
            onClick={() => {
              setShowCreateModal((v) => {
                const next = !v;
                if (next) {
                  setCreateErrorHint(null);
                  createClientM.reset();
                }
                return next;
              });
            }}
          >
            {showCreateModal ? "Chiudi creazione cliente" : "+ Crea cliente (CLIENT)"}
          </button>
          <button
            type="button"
            className={`velvet-admin-subchip ${listScope === "booking" ? "is-active" : ""}`}
            aria-pressed={listScope === "booking"}
            onClick={() => setListScope("booking")}
          >
            Solo clienti prenotazione
          </button>
          <button
            type="button"
            className={`velvet-admin-subchip ${listScope === "all" ? "is-active" : ""}`}
            aria-pressed={listScope === "all"}
            onClick={() => setListScope("all")}
          >
            Tutti i profili
          </button>
        </div>
        <div className="velvet-admin-subreveal is-open">
          <div className="velvet-admin-premium-card__search-panel">
            <label className="velvet-admin-premium-card__search-label" htmlFor={`${idPrefix}-search`}>
              Cerca per email o nome
            </label>
            <div className="velvet-admin-premium-card__search-row">
              <input
                id={`${idPrefix}-search`}
                type="search"
                className="velvet-admin-input velvet-admin-premium-card__search-input"
                placeholder="Es. mario.rossi…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {search.trim() ? (
                <button type="button" className="velvet-admin-premium-card__search-clear" onClick={() => setSearch("")}>
                  Azzera
                </button>
              ) : null}
            </div>
          </div>
          <div className="velvet-admin-table-wrap velvet-admin-premium-card__table-wrap">
            <table className="velvet-admin-table velvet-admin-table--compact velvet-admin-premium-card__table">
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Nome</th>
                  <th scope="col">Ruoli</th>
                  <th scope="col">Piano</th>
                  <th scope="col">Stato</th>
                  <th scope="col">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {listQ.isLoading ? (
                  <tr>
                    <td colSpan={6}>Caricamento profili…</td>
                  </tr>
                ) : listQ.isError ? (
                  <tr>
                    <td colSpan={6}>
                      {listQ.error instanceof Error ? listQ.error.message : "Impossibile caricare l'elenco."}
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      {slice.length === 0
                        ? "Nessun profilo in questa pagina."
                        : "Nessun risultato con filtri e ricerca correnti."}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.email ?? "—"}</td>
                      <td>{row.displayName ?? "—"}</td>
                      <td className="velvet-admin-mono">{row.securityRoles ?? "—"}</td>
                      <td>{row.planTier ?? "—"}</td>
                      <td>{row.deletedAt ? "eliminato" : "attivo"}</td>
                      <td className="velvet-admin-premium-card__actions-cell">
                        <button
                          type="button"
                          className="velvet-admin-btn velvet-admin-premium-card__action-btn"
                          title={
                            canOpenConsumerVelvetSession(row)
                              ? "Apri l’account nell’area Saloni Luxury (stessa idea del Login sui saloni)"
                              : row.deletedAt
                                ? "Profilo eliminato"
                                : "Profilo super admin: sessione non disponibile"
                          }
                          disabled={
                            !canOpenConsumerVelvetSession(row) ||
                            consumerLoginM.isPending ||
                            deleteM.isPending
                          }
                          onClick={() => consumerLoginM.mutate(row.id)}
                        >
                          {consumerLoginM.isPending && consumerLoginM.variables === row.id ? "Login…" : "Login"}
                        </button>
                        <button
                          type="button"
                          className="velvet-admin-btn velvet-admin-btn--danger velvet-admin-premium-card__action-btn"
                          disabled={Boolean(row.deletedAt) || deleteM.isPending}
                          onClick={() => {
                            if (window.confirm("Soft-delete di questo profilo?")) deleteM.mutate(row.id);
                          }}
                        >
                          Elimina
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? (
            <div className="velvet-admin-subchips velvet-admin-premium-card__pagination" aria-label="Paginazione profili">
              <button
                type="button"
                className="velvet-admin-subchip"
                disabled={pageSafe === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Precedente
              </button>
              <span className="velvet-admin-muted">
                Pagina {pageSafe + 1} di {totalPages} · {listQ.data?.size ?? CLIENTS_PAGE_SIZE} per pagina ·{" "}
                {listQ.data?.totalElements ?? 0} profili
              </span>
              <button
                type="button"
                className="velvet-admin-subchip"
                disabled={pageSafe >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Successiva →
              </button>
            </div>
          ) : null}
          {deleteM.isError ? (
            <p className="velvet-alert velvet-alert--error" role="alert">
              {deleteM.error instanceof Error ? deleteM.error.message : "Operazione fallita."}
            </p>
          ) : null}
          {consumerLoginM.isError ? (
            <p className="velvet-alert velvet-alert--error" role="alert">
              {consumerLoginM.error instanceof Error ? consumerLoginM.error.message : "Login account non riuscito."}
            </p>
          ) : null}
        </div>
      </section>

      {showCreateModal ? (
        <div
          className="velvet-plans-modal-root"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget && !createClientM.isPending) {
              setShowCreateModal(false);
            }
          }}
        >
          <div className="velvet-plans-modal velvet-plans-modal--wide" role="dialog" aria-modal="true" aria-labelledby={`${idPrefix}-create-title`}>
            <div className="velvet-plans-modal__head">
              <h2 id={`${idPrefix}-create-title`} className="velvet-plans-modal__title">
                Nuovo cliente — Saloni Luxury
              </h2>
              <button
                type="button"
                className="velvet-plans-modal__close"
                onClick={() => setShowCreateModal(false)}
                disabled={createClientM.isPending}
                aria-label="Chiudi"
              >
                ×
              </button>
            </div>
            <p className="velvet-plans-modal__intro">
              Crea un account con ruolo applicativo{" "}
              <code style={{ fontSize: "0.85em", color: "rgba(253, 186, 116, 0.9)" }}>CLIENT</code> (prenotazioni,
              preferiti, recensioni). Non usare questo modulo per titolari di salone o super admin.
            </p>
            <p className="velvet-plans-modal__note" role="note">
              <strong>Backend:</strong> stesso flusso della registrazione pubblica cliente; credenziali gestite da Luxury.
            </p>
            {createErrorHint ? (
              <p className="velvet-alert velvet-alert--error velvet-plans-modal__alert" role="alert">
                {createErrorHint}
              </p>
            ) : createClientM.isError ? (
              <p className="velvet-alert velvet-alert--error velvet-plans-modal__alert" role="alert">
                {createClientM.error instanceof Error ? createClientM.error.message : "Creazione cliente fallita."}
              </p>
            ) : null}
            {createClientM.isSuccess ? (
              <p className="velvet-alert velvet-alert--success velvet-plans-modal__alert" role="status">
                Cliente creato con successo.
              </p>
            ) : null}
            <form className="velvet-plans-modal__form" noValidate onSubmit={submitCreateClient}>
              <label className="velvet-plans-field">
                <span>Nome</span>
                <input
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm((s) => ({ ...s, firstName: e.target.value }))}
                  disabled={createClientM.isPending}
                  required
                  maxLength={100}
                />
              </label>
              <label className="velvet-plans-field">
                <span>Cognome</span>
                <input
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm((s) => ({ ...s, lastName: e.target.value }))}
                  disabled={createClientM.isPending}
                  required
                  maxLength={100}
                />
              </label>
              <label className="velvet-plans-field velvet-plans-field--full">
                <span>Email</span>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                  disabled={createClientM.isPending}
                  required
                  maxLength={320}
                />
              </label>
              <label className="velvet-plans-field velvet-plans-field--full">
                <span>Telefono</span>
                <input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((s) => ({ ...s, phone: e.target.value }))}
                  disabled={createClientM.isPending}
                  maxLength={40}
                />
              </label>
              <label className="velvet-plans-field velvet-plans-field--full">
                <span>Password</span>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))}
                  disabled={createClientM.isPending}
                  required
                  minLength={8}
                  maxLength={200}
                />
              </label>
              <div className="velvet-plans-modal__actions">
                <button
                  type="button"
                  className="velvet-plan-cta velvet-plan-cta--secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createClientM.isPending}
                >
                  Annulla
                </button>
                <button type="submit" className="velvet-plan-cta" disabled={createClientM.isPending}>
                  {createClientM.isPending ? "Creazione…" : "Crea cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
