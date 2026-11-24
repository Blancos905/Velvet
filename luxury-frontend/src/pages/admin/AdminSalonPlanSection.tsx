import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, Fragment, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { SuperAdminRecentSalonRowDto } from "../../api/types";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { SalonPremiumOwnerInfoPrivacyModal } from "../../components/salon/SalonPremiumOwnerInfoPrivacyModal";
import { partnerContactEmail } from "../../config/env";
import { LEGAL_DOCUMENT_VERSION, LEGAL_DPA_DOCUMENT_VERSION } from "../../content/legalEntity";
import { useLuxuryLocale } from "../../i18n/useLuxuryLocale";
import { formatSalonCityForDisplay } from "../../lib/formatSalonCityForDisplay";
import { DEFAULT_IT_PHONE_PREFIX, optionalPhoneForRegisterApi } from "../../lib/itPhoneDefaults";
import { luxuryPostConsumerSessionPath } from "../../lib/luxuryPostConsumerSessionPath";
import { adminSalonRowMatchesSearch } from "./adminSalonSearch";
import { useAdminConfirmAction } from "./useAdminConfirmAction";

const SALON_PLAN_PAGE_SIZE = 10;

type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
};

type SalonOwnerSessionResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
};

export type AdminSalonPlanApiTier = "PREMIUM";

function validateRequiredSalonLocation(s: {
  salonAddressLine1: string;
  salonPostalCode: string;
  salonCity: string;
  salonProvince: string;
}): string | null {
  const t = (x: string) => x.trim();
  if (!t(s.salonAddressLine1) || !t(s.salonPostalCode) || !t(s.salonCity) || !t(s.salonProvince)) {
    return "Indica l’indirizzo della sede (via, CAP, città e provincia) così i clienti possono trovarti in ricerca e in vetrina.";
  }
  return null;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT");
  } catch {
    return "—";
  }
}

export type AdminSalonPlanSectionProps = {
  accessToken: string;
  /** Filtro `GET .../salons?planTier=` e `planTier` nel body di creazione. */
  apiPlanTier: AdminSalonPlanApiTier;
  /** Prefisso per id/aria (es. `${baseId}-premium`). */
  idPrefix: string;
  /** Valore di `id` sull’`h2` titolo sezione. */
  headingId: string;
  title: string;
  loadingSalonsLabel: string;
  createOpenLabel: string;
  createCloseLabel: string;
  paginationAriaLabel: string;
  modalCreateTitle: string;
  modalCreateIntro: ReactNode;
  createSuccessMessage: string;
  createErrorDefault: string;
  onEditSalon: (row: SuperAdminRecentSalonRowDto) => void;
};

export function AdminSalonPlanSection({
  accessToken,
  apiPlanTier,
  idPrefix,
  headingId,
  title,
  loadingSalonsLabel,
  createOpenLabel,
  createCloseLabel,
  paginationAriaLabel,
  modalCreateTitle,
  modalCreateIntro,
  createSuccessMessage,
  createErrorDefault,
  onEditSalon,
}: AdminSalonPlanSectionProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useLuxuryLocale();
  const { signInWithIssuedToken } = useLuxuryAuth();
  const { confirm, showSuccess, confirmDialog, actionBanner } = useAdminConfirmAction();

  const [page, setPage] = useState(0);
  const [salonSearch, setSalonSearch] = useState("");
  const [expandedSalonId, setExpandedSalonId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [privacyNoticeOpen, setPrivacyNoticeOpen] = useState(false);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [notificationSubject, setNotificationSubject] = useState("Messaggio da Luxury");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [selectedSalonIds, setSelectedSalonIds] = useState<string[]>([]);
  const [createSalonForm, setCreateSalonForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: DEFAULT_IT_PHONE_PREFIX,
    salonName: "",
    salonAddressLine1: "",
    salonPostalCode: "",
    salonCity: "",
    salonProvince: "",
    salonCountry: "IT",
    confirmPassword: "",
    acceptTerms: false,
    acceptDpa: false,
    provider: false,
  });
  const [createErrorHint, setCreateErrorHint] = useState<string | null>(null);

  const salonsQ = useQuery({
    queryKey: ["admin", "overview", "salons", apiPlanTier, accessToken, page],
    enabled: Boolean(accessToken),
    queryFn: () =>
      apiJson<PageResponse<SuperAdminRecentSalonRowDto>>(
        `/api/v1/admin/overview/salons?planTier=${encodeURIComponent(apiPlanTier)}&page=${page}&size=${SALON_PLAN_PAGE_SIZE}&sort=createdAt,desc`,
        { accessToken },
      ),
  });

  const totalPages = Math.max(1, salonsQ.data?.totalPages ?? 1);
  const pageSafe = Math.min(page, totalPages - 1);
  const slice = salonsQ.data?.content ?? [];
  const filteredSlice = slice.filter((row) => adminSalonRowMatchesSearch(row, salonSearch));
  const filteredIds = filteredSlice.map((row) => row.studioGroupId);
  const filteredIdsKey = filteredIds.join(",");
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedSalonIds.includes(id));

  const createSalonM = useMutation({
    mutationFn: async () => {
      const { phone, acceptTerms: _acceptTerms, acceptDpa: _acceptDpa, ...salonFormRest } = createSalonForm;
      const phoneOpt = optionalPhoneForRegisterApi(phone);
      return apiJson<void>("/api/v1/admin/overview/salons", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          ...salonFormRest,
          ...(phoneOpt !== undefined ? { phone: phoneOpt } : {}),
          planTier: apiPlanTier,
          salonAddressLine1: createSalonForm.salonAddressLine1.trim(),
          salonPostalCode: createSalonForm.salonPostalCode.trim(),
          salonCity: createSalonForm.salonCity.trim(),
          salonProvince: createSalonForm.salonProvince.trim(),
          provider: createSalonForm.provider,
          acceptedTermsAndPrivacy: true,
          legalDocumentVersion: LEGAL_DOCUMENT_VERSION,
          acceptedDataProcessingAgreement: true,
          dpaDocumentVersion: LEGAL_DPA_DOCUMENT_VERSION,
        }),
      });
    },
    onSuccess: async () => {
      setCreateSalonForm({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: DEFAULT_IT_PHONE_PREFIX,
        salonName: "",
        salonAddressLine1: "",
        salonPostalCode: "",
        salonCity: "",
        salonProvince: "",
        salonCountry: "IT",
        confirmPassword: "",
        acceptTerms: false,
        acceptDpa: false,
        provider: false,
      });
      setCreateErrorHint(null);
      setShowCreateForm(false);
      await qc.invalidateQueries({ queryKey: ["admin", "overview", "salons"] });
      await qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });

  const deleteSalonM = useMutation({
    mutationFn: async (studioGroupId: string) =>
      apiJson<void>(`/api/v1/admin/overview/salons/${studioGroupId}`, {
        method: "DELETE",
        accessToken,
      }),
    onSuccess: async (_data, studioGroupId) => {
      setExpandedSalonId((open) => (open === studioGroupId ? null : open));
      await qc.invalidateQueries({ queryKey: ["admin", "overview", "salons"] });
      await qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });

  const deleteStaffOperatorM = useMutation({
    mutationFn: async (vars: { studioGroupId: string; operatorId: string }) =>
      apiJson<void>(`/api/v1/admin/overview/salons/${vars.studioGroupId}/staff/${vars.operatorId}`, {
        method: "DELETE",
        accessToken,
      }),
    onSuccess: async () => {
      deleteStaffOperatorM.reset();
      await qc.invalidateQueries({ queryKey: ["admin", "overview", "salons"] });
      await qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });

  const salonOwnerLoginM = useMutation({
    mutationFn: (studioGroupId: string) =>
      apiJson<SalonOwnerSessionResponse>(`/api/v1/admin/overview/salons/${studioGroupId}/owner-session`, {
        method: "POST",
        accessToken,
      }),
    onSuccess: async (body) => {
      await signInWithIssuedToken(body.accessToken, { preserveAdminSession: true });
      navigate(luxuryPostConsumerSessionPath(body.accessToken));
    },
  });

  const sponsoredM = useMutation({
    mutationFn: async (input: { studioGroupId: string; enabled: boolean }) => {
      await apiJson<void>(`/api/v1/admin/overview/salons/${input.studioGroupId}/sponsored-placement`, {
        method: "PATCH",
        accessToken,
        body: JSON.stringify({ enabled: input.enabled }),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "overview", "salons"] });
      await qc.invalidateQueries({ queryKey: ["admin", "overview"] });
      await qc.invalidateQueries({ queryKey: ["publicOrganizations", "sponsored"] });
    },
  });

  const sendNotificationM = useMutation({
    mutationFn: async () =>
      apiJson<{ deliveredCount: number }>("/api/v1/admin/overview/system-notifications", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          studioGroupIds: selectedSalonIds,
          subject: notificationSubject.trim() || "Messaggio da Luxury",
          message: notificationMessage.trim(),
        }),
      }),
    onSuccess: () => {
      setNotificationMessage("");
      setNotificationSubject("Messaggio da Luxury");
      setShowNotificationForm(false);
    },
  });

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  useEffect(() => {
    const allowed = new Set(filteredIdsKey.split(",").filter((id) => id.length > 0));
    setSelectedSalonIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [page, salonSearch, filteredIdsKey]);

  useEffect(() => {
    if (!expandedSalonId) return;
    const allowed = new Set(filteredIdsKey.split(",").filter((id) => id.length > 0));
    if (!allowed.has(expandedSalonId)) {
      setExpandedSalonId(null);
    }
  }, [expandedSalonId, filteredIdsKey]);

  const submitCreateSalon = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setCreateErrorHint(null);
    if (!createSalonForm.firstName.trim() || !createSalonForm.lastName.trim() || !createSalonForm.email.trim()) {
      setCreateErrorHint("Compila nome, cognome ed email.");
      return;
    }
    if (createSalonForm.password.length < 8) {
      setCreateErrorHint("La password deve avere almeno 8 caratteri.");
      return;
    }
    if (createSalonForm.password !== createSalonForm.confirmPassword) {
      setCreateErrorHint("Le password non coincidono.");
      return;
    }
    if (!createSalonForm.acceptTerms) {
      setCreateErrorHint("Per proseguire accetta i termini del servizio.");
      return;
    }
    if (!createSalonForm.acceptDpa) {
      setCreateErrorHint("Per proseguire accetta l'accordo sul trattamento dati (Art. 28 GDPR).");
      return;
    }
    if (!createSalonForm.salonName.trim()) {
      setCreateErrorHint("Indica il nome del salone (come lo vedono i clienti in ricerca e in vetrina).");
      return;
    }
    const salonErr = validateRequiredSalonLocation(createSalonForm);
    if (salonErr) {
      setCreateErrorHint(salonErr);
      return;
    }
    createSalonM.mutate();
  };

  const askDeleteSalon = (row: SuperAdminRecentSalonRowDto) => {
    confirm({
      variant: "danger",
      title: "Elimina salone",
      subject: row.name,
      subjectLabel: "Salone",
      message:
        "Stai per rimuovere definitivamente questo salone dalla piattaforma Saloni Luxury. Conferma solo se sei certo di voler procedere.",
      warningNotes: [
        "Sedi, staff, prenotazioni e dati operativi collegati verranno eliminati.",
        "L'operazione non può essere annullata da questa schermata.",
      ],
      confirmLabel: "Sì, elimina salone",
      onConfirm: async () => {
        await deleteSalonM.mutateAsync(row.studioGroupId);
        showSuccess(`Salone «${row.name}» eliminato con successo.`);
      },
    });
  };

  const askDeleteStaffOperator = (
    row: SuperAdminRecentSalonRowDto,
    op: NonNullable<SuperAdminRecentSalonRowDto["staff"]>[number],
  ) => {
    confirm({
      title: "Elimina operatore",
      message: `Sei sicuro di voler eliminare l'operatore «${op.displayName}» dal salone «${row.name}»? Se collegato a un account di accesso, verrà rimosso anche quello.`,
      confirmLabel: "Sì, elimina operatore",
      onConfirm: async () => {
        await deleteStaffOperatorM.mutateAsync({
          studioGroupId: row.studioGroupId,
          operatorId: op.operatorId,
        });
        showSuccess(`Operatore «${op.displayName}» eliminato con successo.`);
      },
    });
  };

  return (
    <>
      {confirmDialog}
      {actionBanner}
      <section className="luxury-admin-panel luxury-admin-premium-card" aria-labelledby={headingId}>
        <h2 id={headingId} className="luxury-admin-section-title">
          {title}
        </h2>
        <div className="luxury-admin-subchips luxury-admin-premium-card__toolbar">
          <button
            type="button"
            className="luxury-admin-btn"
            onClick={() =>
              setShowCreateForm((v) => {
                const next = !v;
                if (next) {
                  setCreateErrorHint(null);
                }
                return next;
              })
            }
          >
            {showCreateForm ? createCloseLabel : createOpenLabel}
          </button>
          <button
            type="button"
            className="luxury-admin-btn"
            onClick={() =>
              setShowNotificationForm((v) => {
                const next = !v;
                if (next) {
                  sendNotificationM.reset();
                }
                return next;
              })
            }
          >
            {showNotificationForm ? "Chiudi notifica" : "Invia notifica"}
          </button>
          <button
            type="button"
            className="luxury-admin-subchip"
            onClick={() => setSelectedSalonIds([])}
            disabled={selectedSalonIds.length === 0}
          >
            Deseleziona ({selectedSalonIds.length})
          </button>
        </div>
        {showNotificationForm ? (
          <div className="luxury-admin-actions luxury-admin-premium-card__notify-box">
            <p className="luxury-admin-premium-card__notify-hint">
              Seleziona i saloni con le checkbox nella tabella, poi invia: il messaggio compare nel centro notifiche del
              titolare (sezione «Messaggi Luxury»).
            </p>
            <input
              type="text"
              className="luxury-admin-input"
              aria-label="Oggetto messaggio"
              placeholder="Oggetto (titolo breve)"
              value={notificationSubject}
              onChange={(e) => setNotificationSubject(e.target.value)}
            />
            <textarea
              className="luxury-admin-input"
              placeholder="Testo del messaggio per i titolari selezionati…"
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
            />
            <button
              type="button"
              className="luxury-admin-btn luxury-admin-premium-card__notify-send"
              disabled={
                sendNotificationM.isPending || !notificationMessage.trim() || selectedSalonIds.length === 0
              }
              onClick={() => sendNotificationM.mutate()}
            >
              {sendNotificationM.isPending ? "Invio…" : `Invia a ${selectedSalonIds.length} salone/i`}
            </button>
          </div>
        ) : null}
        {sendNotificationM.isError ? (
          <p className="luxury-alert luxury-alert--error" role="alert">
            {sendNotificationM.error instanceof Error ? sendNotificationM.error.message : "Invio messaggio fallito."}
          </p>
        ) : null}
        {sendNotificationM.isSuccess ? (
          <p className="luxury-alert" role="status">
            Messaggio inviato nel centro notifiche di {sendNotificationM.data?.deliveredCount ?? 0} salone/i
            selezionato/i.
          </p>
        ) : null}
        {salonOwnerLoginM.isError ? (
          <p className="luxury-alert luxury-alert--error" role="alert">
            {salonOwnerLoginM.error instanceof Error ? salonOwnerLoginM.error.message : "Login titolare non riuscito."}
          </p>
        ) : null}
        <div className="luxury-admin-subreveal is-open">
          <div className="luxury-admin-premium-card__search-panel">
            <label className="luxury-admin-premium-card__search-label" htmlFor={`${idPrefix}-search`}>
              Cerca per nome salone, email titolare o città
            </label>
            <div className="luxury-admin-premium-card__search-row">
              <input
                id={`${idPrefix}-search`}
                type="search"
                className="luxury-admin-input luxury-admin-premium-card__search-input"
                placeholder="Es. Luxury, mario.rossi@…, Bologna…"
                value={salonSearch}
                onChange={(e) => setSalonSearch(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {salonSearch.trim() ? (
                <button type="button" className="luxury-admin-premium-card__search-clear" onClick={() => setSalonSearch("")}>
                  Azzera
                </button>
              ) : null}
            </div>
          </div>
          <div className="luxury-admin-table-wrap luxury-admin-premium-card__table-wrap">
            <table className="luxury-admin-table luxury-admin-table--compact luxury-admin-premium-card__table luxury-admin-premium-card__table--accordion">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Seleziona tutti i saloni visibili"
                      checked={allFilteredSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSalonIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
                        } else {
                          setSelectedSalonIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
                        }
                      }}
                    />
                  </th>
                  <th scope="col">Salone</th>
                </tr>
              </thead>
              <tbody>
                {salonsQ.isLoading ? (
                  <tr>
                    <td colSpan={2}>{loadingSalonsLabel}</td>
                  </tr>
                ) : filteredSlice.length === 0 ? (
                  <tr>
                    <td colSpan={2}>Nessun risultato con i filtri correnti.</td>
                  </tr>
                ) : (
                  filteredSlice.map((row) => {
                    const isOpen = expandedSalonId === row.studioGroupId;
                    return (
                      <Fragment key={row.studioGroupId}>
                        <tr
                          className={[
                            "luxury-admin-premium-card__salon-row",
                            selectedSalonIds.includes(row.studioGroupId) ? "is-selected" : "",
                            isOpen ? "luxury-admin-premium-card__salon-row--open" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Seleziona salone ${row.name}`}
                              checked={selectedSalonIds.includes(row.studioGroupId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSalonIds((prev) => Array.from(new Set([...prev, row.studioGroupId])));
                                } else {
                                  setSelectedSalonIds((prev) => prev.filter((id) => id !== row.studioGroupId));
                                }
                              }}
                            />
                          </td>
                          <td>
                            <div className="luxury-admin-premium-card__salon-row-main">
                              <button
                                type="button"
                                className="luxury-admin-premium-card__salon-name-btn"
                                aria-expanded={isOpen}
                                aria-controls={`${idPrefix}-detail-${row.studioGroupId}`}
                                id={`${idPrefix}-toggle-${row.studioGroupId}`}
                                onClick={() =>
                                  setExpandedSalonId((id) => (id === row.studioGroupId ? null : row.studioGroupId))
                                }
                              >
                                <span className="luxury-admin-premium-card__salon-name-text">{row.name}</span>
                                <span
                                  className={`luxury-admin-premium-card__salon-chevron${isOpen ? " is-open" : ""}`}
                                  aria-hidden
                                >
                                  {isOpen ? "▲" : "▼"}
                                </span>
                              </button>
                              <button
                                type="button"
                                className="luxury-admin-btn luxury-admin-btn--danger luxury-admin-premium-card__action-btn luxury-admin-premium-card__salon-row-login"
                                disabled={deleteSalonM.isPending || salonOwnerLoginM.isPending}
                                onClick={() => askDeleteSalon(row)}
                              >
                                {deleteSalonM.isPending && deleteSalonM.variables === row.studioGroupId
                                  ? "Eliminazione…"
                                  : "Elimina"}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isOpen ? (
                          <tr
                            className={[
                              "luxury-admin-premium-card__salon-detail-row",
                              selectedSalonIds.includes(row.studioGroupId) ? "is-selected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <td colSpan={2}>
                              <div
                                className="luxury-admin-premium-card__detail-panel"
                                id={`${idPrefix}-detail-${row.studioGroupId}`}
                                role="region"
                                aria-labelledby={`${idPrefix}-toggle-${row.studioGroupId}`}
                              >
                                <div className="luxury-admin-premium-card__detail-grid">
                                  <div>
                                    <span className="luxury-admin-premium-card__detail-label">Titolare</span>
                                    <span className="luxury-admin-premium-card__detail-value">{row.ownerEmail ?? "—"}</span>
                                  </div>
                                  <div>
                                    <span className="luxury-admin-premium-card__detail-label">Città</span>
                                    <span className="luxury-admin-premium-card__detail-value">
                                      {row.primaryLocationCity
                                        ? formatSalonCityForDisplay(row.primaryLocationCity) ?? row.primaryLocationCity
                                        : "—"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="luxury-admin-premium-card__detail-label">Sede</span>
                                    <span className="luxury-admin-premium-card__detail-value">
                                      {row.primaryLocationName ?? "—"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="luxury-admin-premium-card__detail-label">Creato</span>
                                    <span className="luxury-admin-premium-card__detail-value">{formatDate(row.createdAt)}</span>
                                  </div>
                                  {row.planTier ? (
                                    <div>
                                      <span className="luxury-admin-premium-card__detail-label">Piano</span>
                                      <span className="luxury-admin-premium-card__detail-value">{row.planTier}</span>
                                    </div>
                                  ) : null}
                                  <div>
                                    <span className="luxury-admin-premium-card__detail-label">Provider</span>
                                    <span className="luxury-admin-premium-card__detail-value">
                                      {row.provider ? "Sì — senza pagamento" : "No — a pagamento"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="luxury-admin-premium-card__detail-label">
                                      {t("home.sponsoredSalons.adminLabel")}
                                    </span>
                                    <span className="luxury-admin-premium-card__detail-value">
                                      {row.sponsoredPlacement ? t("home.sponsoredSalons.badge") : "—"}
                                    </span>
                                  </div>
                                </div>
                                <div className="luxury-admin-premium-card__actions-cell">
                                  <button
                                    type="button"
                                    className="luxury-admin-btn luxury-admin-premium-card__action-btn"
                                    onClick={() => onEditSalon(row)}
                                  >
                                    Modifica
                                  </button>
                                  <button
                                    type="button"
                                    className="luxury-admin-btn luxury-admin-premium-card__action-btn"
                                    disabled={sponsoredM.isPending || deleteSalonM.isPending}
                                    onClick={() =>
                                      sponsoredM.mutate({
                                        studioGroupId: row.studioGroupId,
                                        enabled: !row.sponsoredPlacement,
                                      })
                                    }
                                  >
                                    {sponsoredM.isPending && sponsoredM.variables?.studioGroupId === row.studioGroupId
                                      ? t("home.sponsoredSalons.adminWorking")
                                      : row.sponsoredPlacement
                                        ? t("home.sponsoredSalons.adminOff")
                                        : t("home.sponsoredSalons.adminOn")}
                                  </button>
                                  {sponsoredM.isError && sponsoredM.variables?.studioGroupId === row.studioGroupId ? (
                                    <p className="luxury-alert luxury-alert--error" role="alert">
                                      {t("home.sponsoredSalons.adminError")}
                                    </p>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="luxury-admin-btn luxury-admin-btn--danger luxury-admin-premium-card__action-btn"
                                    disabled={deleteSalonM.isPending || salonOwnerLoginM.isPending}
                                    onClick={() => askDeleteSalon(row)}
                                  >
                                    Cancella
                                  </button>
                                  <button
                                    type="button"
                                    className="luxury-admin-btn luxury-admin-premium-card__action-btn"
                                    title={
                                      row.ownerEmail
                                        ? "Apri l’account titolare nell’area salone (sessione Luxury)"
                                        : "Email titolare assente: impossibile aprire la sessione"
                                    }
                                    disabled={!row.ownerEmail || salonOwnerLoginM.isPending || deleteSalonM.isPending}
                                    onClick={() => salonOwnerLoginM.mutate(row.studioGroupId)}
                                  >
                                    {salonOwnerLoginM.isPending && salonOwnerLoginM.variables === row.studioGroupId
                                      ? "Login…"
                                      : "Login"}
                                  </button>
                                </div>
                                <div className="luxury-admin-premium-card__staff-block">
                                  <h3 className="luxury-admin-premium-card__staff-title">Staff (operatori)</h3>
                                  {deleteStaffOperatorM.isError ? (
                                    <p className="luxury-alert luxury-alert--error" role="alert">
                                      {deleteStaffOperatorM.error instanceof Error
                                        ? deleteStaffOperatorM.error.message
                                        : "Eliminazione staff non riuscita."}
                                    </p>
                                  ) : null}
                                  {row.staff === undefined ? (
                                    <p className="luxury-admin-premium-card__staff-muted">
                                      Lo staff non è incluso nella risposta del backend. Ricompila e riavvia Spring con la
                                      versione di Luxury che aggiunge il campo <code>staff</code> a{" "}
                                      <code>GET /api/v1/admin/overview/salons</code>.
                                    </p>
                                  ) : !row.staff.length ? (
                                    <p className="luxury-admin-premium-card__staff-muted">Nessun operatore in elenco.</p>
                                  ) : (
                                    <ul className="luxury-admin-premium-card__staff-list">
                                      {row.staff.map((op) => (
                                        <li key={op.operatorId} className="luxury-admin-premium-card__staff-item">
                                          <div className="luxury-admin-premium-card__staff-item-main">
                                            <strong>{op.displayName}</strong>
                                            {op.role ? ` · ${op.role}` : ""} · {op.locationName}
                                            {op.accountLinked ? (
                                              <>
                                                {" "}
                                                <span className="luxury-admin-muted">— account: {op.staffEmail ?? "—"}</span>
                                              </>
                                            ) : (
                                              <span className="luxury-admin-muted"> — senza account di accesso</span>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            className="luxury-admin-btn luxury-admin-btn--danger luxury-admin-premium-card__staff-remove"
                                            disabled={
                                              deleteStaffOperatorM.isPending ||
                                              deleteSalonM.isPending ||
                                              salonOwnerLoginM.isPending
                                            }
                                            onClick={() => askDeleteStaffOperator(row, op)}
                                          >
                                            {deleteStaffOperatorM.isPending &&
                                            deleteStaffOperatorM.variables?.operatorId === op.operatorId
                                              ? "Eliminazione…"
                                              : "Elimina"}
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? (
            <div className="luxury-admin-subchips luxury-admin-premium-card__pagination" aria-label={paginationAriaLabel}>
              <button
                type="button"
                className="luxury-admin-subchip"
                disabled={pageSafe === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Precedente
              </button>
              <span className="luxury-admin-muted">
                Pagina {pageSafe + 1} di {totalPages}
              </span>
              <button
                type="button"
                className="luxury-admin-subchip"
                disabled={pageSafe >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Successiva →
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {showCreateForm ? (
        <div
          className="luxury-plans-modal-root"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget && !createSalonM.isPending) {
              setShowCreateForm(false);
            }
          }}
        >
          <div
            className="luxury-plans-modal luxury-plans-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${idPrefix}-create-title`}
          >
            <div className="luxury-plans-modal__head">
              <h2 id={`${idPrefix}-create-title`} className="luxury-plans-modal__title">
                {modalCreateTitle}
              </h2>
              <button
                type="button"
                className="luxury-plans-modal__close"
                onClick={() => setShowCreateForm(false)}
                disabled={createSalonM.isPending}
                aria-label="Chiudi"
              >
                ×
              </button>
            </div>
            {modalCreateIntro}
            <p className="luxury-plans-modal__note" role="note">
              <strong>Backend:</strong> account e password sono gestiti da Luxury (Spring Security).
            </p>
            {createErrorHint ? (
              <p className="luxury-alert luxury-alert--error luxury-plans-modal__alert" role="alert">
                {createErrorHint}
              </p>
            ) : createSalonM.isError ? (
              <p className="luxury-alert luxury-alert--error luxury-plans-modal__alert" role="alert">
                {createSalonM.error instanceof Error ? createSalonM.error.message : createErrorDefault}
              </p>
            ) : null}
            {createSalonM.isSuccess ? (
              <p className="luxury-alert luxury-alert--success luxury-plans-modal__alert" role="status">
                {createSuccessMessage}
              </p>
            ) : null}
            <form className="luxury-plans-modal__form" noValidate onSubmit={submitCreateSalon}>
              <label className="luxury-plans-field">
                <span>Nome</span>
                <input
                  value={createSalonForm.firstName}
                  onChange={(e) => setCreateSalonForm((s) => ({ ...s, firstName: e.target.value }))}
                  disabled={createSalonM.isPending}
                  required
                  maxLength={100}
                />
              </label>
              <label className="luxury-plans-field">
                <span>Cognome</span>
                <input
                  value={createSalonForm.lastName}
                  onChange={(e) => setCreateSalonForm((s) => ({ ...s, lastName: e.target.value }))}
                  disabled={createSalonM.isPending}
                  required
                  maxLength={100}
                />
              </label>
              <label className="luxury-plans-field luxury-plans-field--full">
                <span>Email</span>
                <input
                  type="email"
                  value={createSalonForm.email}
                  onChange={(e) => setCreateSalonForm((s) => ({ ...s, email: e.target.value }))}
                  disabled={createSalonM.isPending}
                  required
                  maxLength={320}
                />
              </label>
              <label className="luxury-plans-field luxury-plans-field--full">
                <span>Telefono</span>
                <input
                  value={createSalonForm.phone}
                  onChange={(e) => setCreateSalonForm((s) => ({ ...s, phone: e.target.value }))}
                  disabled={createSalonM.isPending}
                  maxLength={40}
                />
              </label>
              <fieldset className="luxury-plans-fieldset luxury-plans-field--full luxury-plans-provider">
                <legend className="luxury-plans-salon-types__legend">Salone provider</legend>
                <p className="luxury-plans-provider__hint">
                  I saloni provider non effettuano alcun pagamento abbonamento a Luxury (anche se creati come Premium) e
                  sono esclusi dai conteggi «a pagamento» nelle statistiche.
                </p>
                <div className="luxury-plans-provider__options">
                  <label className="luxury-plans-provider__option">
                    <input
                      type="radio"
                      name={`${idPrefix}-provider`}
                      checked={!createSalonForm.provider}
                      onChange={() => setCreateSalonForm((s) => ({ ...s, provider: false }))}
                      disabled={createSalonM.isPending}
                    />
                    <span>No — salone standard</span>
                  </label>
                  <label className="luxury-plans-provider__option">
                    <input
                      type="radio"
                      name={`${idPrefix}-provider`}
                      checked={createSalonForm.provider}
                      onChange={() => setCreateSalonForm((s) => ({ ...s, provider: true }))}
                      disabled={createSalonM.isPending}
                    />
                    <span>Sì — salone provider</span>
                  </label>
                </div>
              </fieldset>
              <label className="luxury-plans-field luxury-plans-field--full">
                <span>Nome del salone</span>
                <input
                  value={createSalonForm.salonName}
                  onChange={(e) => setCreateSalonForm((s) => ({ ...s, salonName: e.target.value }))}
                  disabled={createSalonM.isPending}
                  required
                  maxLength={200}
                />
              </label>
              <label className="luxury-plans-field luxury-plans-field--full">
                <span>Indirizzo sede (via e civico)</span>
                <input
                  value={createSalonForm.salonAddressLine1}
                  onChange={(e) => setCreateSalonForm((s) => ({ ...s, salonAddressLine1: e.target.value }))}
                  disabled={createSalonM.isPending}
                  required
                  maxLength={200}
                />
              </label>
              <label className="luxury-plans-field">
                <span>CAP</span>
                <input
                  value={createSalonForm.salonPostalCode}
                  onChange={(e) => setCreateSalonForm((s) => ({ ...s, salonPostalCode: e.target.value }))}
                  disabled={createSalonM.isPending}
                  required
                  maxLength={12}
                />
              </label>
              <label className="luxury-plans-field">
                <span>Città</span>
                <input
                  value={createSalonForm.salonCity}
                  onChange={(e) => setCreateSalonForm((s) => ({ ...s, salonCity: e.target.value }))}
                  disabled={createSalonM.isPending}
                  required
                  maxLength={100}
                />
              </label>
              <label className="luxury-plans-field">
                <span>Provincia (sigla)</span>
                <input
                  value={createSalonForm.salonProvince}
                  onChange={(e) => setCreateSalonForm((s) => ({ ...s, salonProvince: e.target.value }))}
                  disabled={createSalonM.isPending}
                  required
                  maxLength={5}
                  placeholder="es. MI"
                />
              </label>
              <label className="luxury-plans-field">
                <span>Paese (ISO)</span>
                <input
                  value={createSalonForm.salonCountry}
                  onChange={(e) => setCreateSalonForm((s) => ({ ...s, salonCountry: e.target.value.toUpperCase() }))}
                  disabled={createSalonM.isPending}
                  maxLength={2}
                  placeholder="IT"
                />
              </label>
              <div className="luxury-plans-password-pair">
                <label className="luxury-plans-field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={createSalonForm.password}
                    onChange={(e) => setCreateSalonForm((s) => ({ ...s, password: e.target.value }))}
                    disabled={createSalonM.isPending}
                    required
                    minLength={8}
                    maxLength={200}
                  />
                </label>
                <label className="luxury-plans-field">
                  <span>Ripeti password</span>
                  <input
                    type="password"
                    value={createSalonForm.confirmPassword}
                    onChange={(e) => setCreateSalonForm((s) => ({ ...s, confirmPassword: e.target.value }))}
                    disabled={createSalonM.isPending}
                    required
                    minLength={8}
                    maxLength={200}
                  />
                </label>
              </div>
              <div className="luxury-plans-privacy-terms luxury-plans-field--full">
                <label className="luxury-plans-field luxury-plans-field--check">
                  <input
                    type="checkbox"
                    checked={createSalonForm.acceptTerms}
                    onChange={(e) => setCreateSalonForm((s) => ({ ...s, acceptTerms: e.target.checked }))}
                    disabled={createSalonM.isPending}
                  />
                  <span>
                    Dichiaro di aver letto e accetto i{" "}
                    <Link to="/termini" className="luxury-link-inline" target="_blank" rel="noopener noreferrer">
                      termini di servizio
                    </Link>{" "}
                    e l&apos;
                    <Link to="/privacy" className="luxury-link-inline" target="_blank" rel="noopener noreferrer">
                      informativa privacy
                    </Link>
                    .
                  </span>
                </label>
                <label className="luxury-plans-field luxury-plans-field--check">
                  <input
                    type="checkbox"
                    checked={createSalonForm.acceptDpa}
                    onChange={(e) => setCreateSalonForm((s) => ({ ...s, acceptDpa: e.target.checked }))}
                    disabled={createSalonM.isPending}
                  />
                  <span>
                    Il titolare del salone accetta l&apos;
                    <Link
                      to="/legale/accordo-trattamento"
                      className="luxury-link-inline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      accordo sul trattamento dati (Art. 28 GDPR)
                    </Link>
                    .
                  </span>
                </label>
                <button
                  type="button"
                  className="luxury-plans-privacy-open"
                  onClick={() => setPrivacyNoticeOpen(true)}
                  disabled={createSalonM.isPending}
                >
                  Leggi info e privacy
                </button>
              </div>
              <div className="luxury-plans-modal__actions">
                <button
                  type="button"
                  className="luxury-plan-cta luxury-plan-cta--secondary"
                  onClick={() => setShowCreateForm(false)}
                  disabled={createSalonM.isPending}
                >
                  Annulla
                </button>
                <button type="submit" className="luxury-plan-cta" disabled={createSalonM.isPending}>
                  {createSalonM.isPending ? "Creazione account…" : "Crea account e continua"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      <SalonPremiumOwnerInfoPrivacyModal
        open={privacyNoticeOpen}
        onClose={() => setPrivacyNoticeOpen(false)}
        salonName={createSalonForm.salonName.trim() || null}
        supportEmail={partnerContactEmail || null}
        showAccountActions={false}
      />
    </>
  );
}
