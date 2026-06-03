import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { SuperAdminOverviewResponseDto, SuperAdminRecentSalonRowDto } from "../../api/types";
import { useAdminAuth } from "../../auth/AdminAuthProvider";
import { SaloniVelvetLogoMark } from "../../components/SaloniVelvetLogoMark";
import { StarRatingDisplay } from "../../components/StarRatingDisplay";
import { extractSuperAdminProfileFromOverview } from "../../utils/superAdminOverviewProfile";
import { AdminConsumerClientsSection } from "./AdminConsumerClientsSection";
import { AdminSalonPlanSection } from "./AdminSalonPlanSection";
import { AdminSuperAdminProfileSection } from "./AdminSuperAdminProfileSection";
import SuperAdminStatisticsSection from "./SuperAdminStatisticsSection";

type SuperAdminOverviewResponse = SuperAdminOverviewResponseDto;
type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
};

type SuperAdminSalonReviewSummaryRow = {
  studioGroupId: string;
  salonName: string;
  averageRating: number;
  reviewCount: number;
  showcaseLocationSlug: string | null;
};

type SuperAdminPlatformReviewRow = {
  id: string;
  authorKind: string;
  authorEmailOrSalon: string;
  rating: number;
  comment: string | null;
  createdAt: string | null;
};

const REVIEWS_PAGE_SIZE = 10;

type ReviewAdminTab = "saloni" | "velvet";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT");
  } catch {
    return "—";
  }
}

export default function AdminDashboardPage() {
  const { accessToken } = useAdminAuth();
  const qc = useQueryClient();
  const baseId = useId();
  const [selectedArea, setSelectedArea] = useState<
    "premium" | "free" | "clienti" | "recensioni" | "profilo" | "statistiche"
  >("premium");
  const [reviewsPage, setReviewsPage] = useState(0);
  const [platformReviewsPage, setPlatformReviewsPage] = useState(0);
  const [reviewAdminTab, setReviewAdminTab] = useState<ReviewAdminTab>("saloni");
  const [editingSalon, setEditingSalon] = useState<SuperAdminRecentSalonRowDto | null>(null);
  const [editSalonForm, setEditSalonForm] = useState({
    ownerEmail: "",
    salonName: "",
    salonCity: "",
  });

  const overviewQ = useQuery({
    queryKey: ["admin", "overview", accessToken],
    enabled: Boolean(accessToken),
    queryFn: () =>
      apiJson<SuperAdminOverviewResponse>("/api/v1/admin/overview", {
        accessToken,
      }),
  });

  const profile = extractSuperAdminProfileFromOverview(overviewQ.data, accessToken);
  const welcomeDisplayName =
    profile.displayName?.trim() ||
    (profile.email?.includes("@") ? profile.email.split("@")[0] : profile.email)?.trim() ||
    "Super admin";
  const reviewsQ = useQuery({
    queryKey: ["admin", "overview", "reviews", accessToken, reviewsPage],
    enabled: Boolean(accessToken) && selectedArea === "recensioni" && reviewAdminTab === "saloni",
    queryFn: () =>
      apiJson<PageResponse<SuperAdminSalonReviewSummaryRow>>(
        `/api/v1/admin/overview/reviews?page=${reviewsPage}&size=${REVIEWS_PAGE_SIZE}`,
        { accessToken },
      ),
  });

  const platformReviewsQ = useQuery({
    queryKey: ["admin", "overview", "platform-reviews", accessToken, platformReviewsPage],
    enabled: Boolean(accessToken) && selectedArea === "recensioni" && reviewAdminTab === "velvet",
    queryFn: () =>
      apiJson<PageResponse<SuperAdminPlatformReviewRow>>(
        `/api/v1/admin/overview/platform-reviews?page=${platformReviewsPage}&size=${REVIEWS_PAGE_SIZE}`,
        { accessToken },
      ),
  });

  const reviewsTotalPages = Math.max(1, reviewsQ.data?.totalPages ?? 1);
  const reviewsPageSafe = Math.min(reviewsPage, reviewsTotalPages - 1);
  const reviewsSlice = reviewsQ.data?.content ?? [];
  const platformReviewsTotalPages = Math.max(1, platformReviewsQ.data?.totalPages ?? 1);
  const platformReviewsPageSafe = Math.min(platformReviewsPage, platformReviewsTotalPages - 1);
  const platformReviewsSlice = platformReviewsQ.data?.content ?? [];

  const updateSalonM = useMutation({
    mutationFn: async () => {
      if (!editingSalon) return;
      await apiJson<void>(`/api/v1/admin/overview/salons/${editingSalon.studioGroupId}`, {
        method: "PATCH",
        accessToken,
        body: JSON.stringify(editSalonForm),
      });
    },
    onSuccess: async () => {
      setEditingSalon(null);
      await qc.invalidateQueries({ queryKey: ["admin", "overview", "salons"] });
      await qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });

  useEffect(() => {
    setReviewsPage(0);
    setPlatformReviewsPage(0);
    setReviewAdminTab("saloni");
  }, [selectedArea]);

  useEffect(() => {
    if (reviewsPage > reviewsTotalPages - 1) {
      setReviewsPage(Math.max(0, reviewsTotalPages - 1));
    }
  }, [reviewsPage, reviewsTotalPages]);

  useEffect(() => {
    if (platformReviewsPage > platformReviewsTotalPages - 1) {
      setPlatformReviewsPage(Math.max(0, platformReviewsTotalPages - 1));
    }
  }, [platformReviewsPage, platformReviewsTotalPages]);

  useEffect(() => {
    setReviewsPage(0);
    setPlatformReviewsPage(0);
  }, [reviewAdminTab]);

  const submitUpdateSalon = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    updateSalonM.mutate();
  };

  return (
    <div className="velvet-admin-dashboard">
      <section
        className="velvet-admin-welcome-card velvet-admin-welcome-card--minimal"
        aria-labelledby={`${baseId}-welcome-h`}
      >
        <div className="velvet-admin-welcome-card__aurora" aria-hidden />
        <div className="velvet-admin-welcome-card__shine" aria-hidden />
        <div className="velvet-admin-welcome-card__inner">
          <div className="velvet-admin-welcome-card__mark">
            <SaloniVelvetLogoMark variant="default" />
          </div>
          <div className="velvet-admin-welcome-card__copy velvet-admin-welcome-card__copy--minimal">
            <h1 id={`${baseId}-welcome-h`} className="velvet-admin-welcome-card__title velvet-admin-welcome-card__title--welcome">
              Benvenuto, super admin
            </h1>
            <p className="velvet-admin-welcome-card__welcome-name">
              {overviewQ.isLoading ? (
                <span className="velvet-admin-muted">Caricamento…</span>
              ) : overviewQ.isError ? (
                <span className="velvet-admin-muted">Super admin</span>
              ) : (
                welcomeDisplayName
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="velvet-admin-panel" aria-labelledby={`${baseId}-aree-h`}>
        <h2 id={`${baseId}-aree-h`} className="velvet-admin-section-title">
          Aree rapide
        </h2>
        <div className="velvet-admin-subchips" role="toolbar" aria-label="Filtri super admin">
          <button
            type="button"
            className={`velvet-admin-subchip ${selectedArea === "premium" ? "is-active" : ""}`}
            aria-pressed={selectedArea === "premium"}
            onClick={() => setSelectedArea("premium")}
          >
            Saloni premium
          </button>
          <button
            type="button"
            className={`velvet-admin-subchip ${selectedArea === "free" ? "is-active" : ""}`}
            aria-pressed={selectedArea === "free"}
            onClick={() => setSelectedArea("free")}
          >
            Saloni free
          </button>
          <button
            type="button"
            className={`velvet-admin-subchip ${selectedArea === "clienti" ? "is-active" : ""}`}
            aria-pressed={selectedArea === "clienti"}
            onClick={() => setSelectedArea("clienti")}
          >
            Clienti
          </button>
          <button
            type="button"
            className={`velvet-admin-subchip ${selectedArea === "recensioni" ? "is-active" : ""}`}
            aria-pressed={selectedArea === "recensioni"}
            onClick={() => setSelectedArea("recensioni")}
          >
            Recensioni
          </button>
          <button
            type="button"
            className={`velvet-admin-subchip ${selectedArea === "profilo" ? "is-active" : ""}`}
            aria-pressed={selectedArea === "profilo"}
            onClick={() => setSelectedArea("profilo")}
          >
            Profilo
          </button>
          <button
            type="button"
            className={`velvet-admin-subchip ${selectedArea === "statistiche" ? "is-active" : ""}`}
            aria-pressed={selectedArea === "statistiche"}
            onClick={() => setSelectedArea("statistiche")}
          >
            Statistiche
          </button>
          <Link
            to="/admin/messaggi"
            className="velvet-admin-subchip"
            title="Richieste dal modulo Assistenza inviate da titolari di salone e da staff"
          >
            Messaggi
          </Link>
        </div>

      </section>

      {selectedArea === "statistiche" ? <SuperAdminStatisticsSection overviewQ={overviewQ} /> : null}

      {selectedArea === "premium" && accessToken ? (
        <AdminSalonPlanSection
          accessToken={accessToken}
          apiPlanTier="PREMIUM"
          idPrefix={`${baseId}-premium`}
          headingId={`${baseId}-premium-h`}
          title="Saloni premium"
          loadingSalonsLabel="Caricamento saloni premium…"
          createOpenLabel="+ Crea salone PREMIUM"
          createCloseLabel="Chiudi creazione premium"
          paginationAriaLabel="Paginazione saloni premium"
          modalCreateTitle="Registrazione — piano Premium"
          modalCreateIntro={
            <p className="velvet-plans-modal__intro">
              <strong>Questo modulo non è per i clienti che prenotano</strong> (loro hanno ruolo applicativo{" "}
              <code style={{ fontSize: "0.85em", color: "rgba(253, 186, 116, 0.9)" }}>CLIENT</code>). Qui crei
              l&apos;accesso: dopo la registrazione il backend assegna{" "}
              <code style={{ fontSize: "0.85em", color: "rgba(253, 186, 116, 0.9)" }}>OWNER</code>. Con piano{" "}
              <strong>Premium</strong> indica subito dove si trova il salone: questo indirizzo alimenta ricerca/vetrina e la card{" "}
              <strong>Posizione</strong> della pagina pubblica.
            </p>
          }
          createSuccessMessage="Salone premium creato con successo."
          createErrorDefault="Creazione salone premium fallita."
          onEditSalon={(row) => {
            setEditingSalon(row);
            setEditSalonForm({
              ownerEmail: row.ownerEmail ?? "",
              salonName: row.name,
              salonCity: row.primaryLocationCity ?? "",
            });
          }}
        />
      ) : null}
      {selectedArea === "free" && accessToken ? (
        <AdminSalonPlanSection
          accessToken={accessToken}
          apiPlanTier="BASE"
          idPrefix={`${baseId}-free`}
          headingId={`${baseId}-free-h`}
          title="Saloni free (piano BASE)"
          loadingSalonsLabel="Caricamento saloni free…"
          createOpenLabel="+ Crea salone FREE (BASE)"
          createCloseLabel="Chiudi creazione salone free"
          paginationAriaLabel="Paginazione saloni free"
          modalCreateTitle="Registrazione — piano Free (BASE)"
          modalCreateIntro={
            <p className="velvet-plans-modal__intro">
              <strong>Questo modulo non è per i clienti che prenotano</strong> (loro hanno ruolo applicativo{" "}
              <code style={{ fontSize: "0.85em", color: "rgba(253, 186, 116, 0.9)" }}>CLIENT</code>). Qui crei
              l&apos;accesso titolare (
              <code style={{ fontSize: "0.85em", color: "rgba(253, 186, 116, 0.9)" }}>OWNER</code>) con piano{" "}
              <strong>Free</strong> (
              <code style={{ fontSize: "0.85em", color: "rgba(253, 186, 116, 0.9)" }}>BASE</code> nel backend):
              l&apos;indirizzo della sede è obbligatorio per ricerca e vetrina.
            </p>
          }
          createSuccessMessage="Salone free creato con successo."
          createErrorDefault="Creazione salone free fallita."
          onEditSalon={(row) => {
            setEditingSalon(row);
            setEditSalonForm({
              ownerEmail: row.ownerEmail ?? "",
              salonName: row.name,
              salonCity: row.primaryLocationCity ?? "",
            });
          }}
        />
      ) : null}
      {selectedArea === "clienti" && accessToken ? (
        <AdminConsumerClientsSection
          accessToken={accessToken}
          idPrefix={`${baseId}-clients`}
          headingId={`${baseId}-clients-h`}
        />
      ) : null}

      {selectedArea === "profilo" && accessToken ? (
        <AdminSuperAdminProfileSection
          accessToken={accessToken}
          profile={profile}
          idPrefix={`${baseId}-profilo`}
          headingId={`${baseId}-profilo-h`}
        />
      ) : null}

      {selectedArea === "recensioni" ? (
        <section className="velvet-admin-panel velvet-admin-premium-card" aria-labelledby={`${baseId}-reviews-h`}>
          <h2 id={`${baseId}-reviews-h`} className="velvet-admin-section-title">
            Recensioni
          </h2>
          <div className="velvet-admin-subchips" role="tablist" aria-label="Tipo recensioni" style={{ marginBottom: "0.75rem" }}>
            <button
              type="button"
              role="tab"
              aria-selected={reviewAdminTab === "saloni"}
              className={`velvet-admin-subchip ${reviewAdminTab === "saloni" ? "is-active" : ""}`}
              onClick={() => setReviewAdminTab("saloni")}
            >
              Sui saloni (post-visita)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={reviewAdminTab === "velvet"}
              className={`velvet-admin-subchip ${reviewAdminTab === "velvet" ? "is-active" : ""}`}
              onClick={() => setReviewAdminTab("velvet")}
            >
              Su Saloni Luxury
            </button>
          </div>
          <p className="velvet-admin-subchips__intro" style={{ marginTop: "-0.25rem", marginBottom: "0.75rem" }}>
            {reviewAdminTab === "saloni"
              ? "Per ogni salone: media del voto salone su tutte le sedi e tutti i servizi (nessun dettaglio per singolo servizio)."
              : "Feedback clienti e titolari sulla piattaforma (voto 1–5 stelle)."}
          </p>
          <div className="velvet-admin-subreveal is-open">
            {reviewAdminTab === "saloni" ? (
              <>
                <div className="velvet-admin-table-wrap velvet-admin-premium-card__table-wrap">
                  <table className="velvet-admin-table velvet-admin-table--compact velvet-admin-premium-card__table">
                    <thead>
                      <tr>
                        <th>Salone</th>
                        <th>Media voto salone</th>
                        <th>Recensioni</th>
                        <th>Vetrina</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewsQ.isLoading ? (
                        <tr>
                          <td colSpan={4}>Caricamento…</td>
                        </tr>
                      ) : reviewsQ.isError ? (
                        <tr>
                          <td colSpan={4}>
                            {reviewsQ.error instanceof Error ? reviewsQ.error.message : "Impossibile caricare le recensioni."}
                          </td>
                        </tr>
                      ) : reviewsSlice.length === 0 ? (
                        <tr>
                          <td colSpan={4}>Nessuna recensione registrata.</td>
                        </tr>
                      ) : (
                        reviewsSlice.map((row) => {
                          const avg = row.averageRating ?? 0;
                          const caption = `${avg.toFixed(2).replace(".", ",")}/5`;
                          return (
                            <tr key={row.studioGroupId}>
                              <td>{row.salonName}</td>
                              <td>
                                <span aria-label={`Media salone ${caption}`}>
                                  <StarRatingDisplay rating={avg} caption={caption} />
                                </span>
                              </td>
                              <td>{row.reviewCount}</td>
                              <td>
                                {row.showcaseLocationSlug ? (
                                  <a
                                    href={`/s/${encodeURIComponent(row.showcaseLocationSlug)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="velvet-admin-muted"
                                    style={{ textDecoration: "underline" }}
                                    title="Apre la vetrina di una sede del salone"
                                  >
                                    Apri
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {reviewsQ.isSuccess && reviewsQ.data && reviewsQ.data.totalElements > 0 ? (
                  <div
                    className="velvet-admin-subchips velvet-admin-premium-card__pagination"
                    aria-label="Paginazione recensioni saloni"
                  >
                    <button
                      type="button"
                      className="velvet-admin-subchip"
                      disabled={reviewsPageSafe === 0}
                      onClick={() => setReviewsPage((p) => Math.max(0, p - 1))}
                    >
                      ← Precedente
                    </button>
                    <span className="velvet-admin-muted">
                      Pagina {reviewsPageSafe + 1} di {reviewsTotalPages} ·{" "}
                      {reviewsQ.data?.size ?? REVIEWS_PAGE_SIZE} per pagina · {reviewsQ.data?.totalElements ?? 0} saloni
                    </span>
                    <button
                      type="button"
                      className="velvet-admin-subchip"
                      disabled={reviewsPageSafe >= reviewsTotalPages - 1}
                      onClick={() => setReviewsPage((p) => Math.min(reviewsTotalPages - 1, p + 1))}
                    >
                      Successiva →
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="velvet-admin-table-wrap velvet-admin-premium-card__table-wrap">
                  <table className="velvet-admin-table velvet-admin-table--compact velvet-admin-premium-card__table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Autore</th>
                        <th>Voto</th>
                        <th>Commento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platformReviewsQ.isLoading ? (
                        <tr>
                          <td colSpan={5}>Caricamento…</td>
                        </tr>
                      ) : platformReviewsQ.isError ? (
                        <tr>
                          <td colSpan={5}>
                            {platformReviewsQ.error instanceof Error
                              ? platformReviewsQ.error.message
                              : "Impossibile caricare le recensioni."}
                          </td>
                        </tr>
                      ) : platformReviewsSlice.length === 0 ? (
                        <tr>
                          <td colSpan={5}>Nessuna recensione sulla piattaforma.</td>
                        </tr>
                      ) : (
                        platformReviewsSlice.map((row) => (
                          <tr key={row.id}>
                            <td>{formatDate(row.createdAt)}</td>
                            <td>{row.authorKind === "SALON_PARTNER" ? "Salone" : "Cliente"}</td>
                            <td>{row.authorEmailOrSalon}</td>
                            <td>
                              <span aria-label={`${row.rating} su 5 stelle`}>
                                <StarRatingDisplay rating={row.rating} />
                              </span>
                            </td>
                            <td
                              style={{
                                maxWidth: "22rem",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                fontSize: "0.9em",
                              }}
                            >
                              {row.comment?.trim() ? row.comment : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {platformReviewsQ.isSuccess && platformReviewsQ.data && platformReviewsQ.data.totalElements > 0 ? (
                  <div
                    className="velvet-admin-subchips velvet-admin-premium-card__pagination"
                    aria-label="Paginazione recensioni piattaforma"
                  >
                    <button
                      type="button"
                      className="velvet-admin-subchip"
                      disabled={platformReviewsPageSafe === 0}
                      onClick={() => setPlatformReviewsPage((p) => Math.max(0, p - 1))}
                    >
                      ← Precedente
                    </button>
                    <span className="velvet-admin-muted">
                      Pagina {platformReviewsPageSafe + 1} di {platformReviewsTotalPages} ·{" "}
                      {platformReviewsQ.data?.size ?? REVIEWS_PAGE_SIZE} per pagina ·{" "}
                      {platformReviewsQ.data?.totalElements ?? 0} recensioni
                    </span>
                    <button
                      type="button"
                      className="velvet-admin-subchip"
                      disabled={platformReviewsPageSafe >= platformReviewsTotalPages - 1}
                      onClick={() =>
                        setPlatformReviewsPage((p) => Math.min(platformReviewsTotalPages - 1, p + 1))
                      }
                    >
                      Successiva →
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      ) : null}

      {editingSalon ? (
        <div
          className="velvet-plans-modal-root"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget && !updateSalonM.isPending) {
              setEditingSalon(null);
            }
          }}
        >
          <div className="velvet-plans-modal" role="dialog" aria-modal="true" aria-labelledby={`${baseId}-salon-edit-title`}>
            <div className="velvet-plans-modal__head">
              <h2 id={`${baseId}-salon-edit-title`} className="velvet-plans-modal__title">
                Modifica salone
              </h2>
              <button
                type="button"
                className="velvet-plans-modal__close"
                onClick={() => setEditingSalon(null)}
                disabled={updateSalonM.isPending}
                aria-label="Chiudi"
              >
                ×
              </button>
            </div>
            <form className="velvet-plans-modal__form" noValidate onSubmit={submitUpdateSalon}>
              <label className="velvet-plans-field velvet-plans-field--full">
                <span>Email titolare</span>
                <input
                  type="email"
                  value={editSalonForm.ownerEmail}
                  onChange={(e) => setEditSalonForm((s) => ({ ...s, ownerEmail: e.target.value }))}
                  maxLength={320}
                />
              </label>
              <label className="velvet-plans-field velvet-plans-field--full">
                <span>Nome del salone</span>
                <input
                  value={editSalonForm.salonName}
                  onChange={(e) => setEditSalonForm((s) => ({ ...s, salonName: e.target.value }))}
                  required
                  maxLength={200}
                />
              </label>
              <label className="velvet-plans-field velvet-plans-field--full">
                <span>Citta</span>
                <input
                  value={editSalonForm.salonCity}
                  onChange={(e) => setEditSalonForm((s) => ({ ...s, salonCity: e.target.value }))}
                  maxLength={100}
                />
              </label>
              {updateSalonM.isError ? (
                <p className="velvet-alert velvet-alert--error velvet-plans-modal__alert" role="alert">
                  {updateSalonM.error instanceof Error ? updateSalonM.error.message : "Modifica salone fallita."}
                </p>
              ) : null}
              <div className="velvet-plans-modal__actions">
                <button type="button" className="velvet-plan-cta velvet-plan-cta--secondary" onClick={() => setEditingSalon(null)} disabled={updateSalonM.isPending}>
                  Annulla
                </button>
                <button type="submit" className="velvet-plan-cta" disabled={updateSalonM.isPending}>
                  {updateSalonM.isPending ? "Salvataggio…" : "Salva modifiche"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
