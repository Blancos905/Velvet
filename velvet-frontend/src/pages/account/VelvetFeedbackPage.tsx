import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { ReviewSubmitResponse } from "../../api/types";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { StarRatingInput } from "../../components/StarRatingInput";
import { useMePendingReviewInvitesQuery } from "../../hooks/useMePendingReviewInvites";
import { useMeReviewHistoryQuery } from "../../hooks/useMeReviewHistory";
import { useMeSalonReviewsQuery } from "../../hooks/useMeSalonReviews";
import { isVelvetUnauthorizedError } from "../../lib/authErrors";
import { markClientReviewPendingSeen } from "../../lib/clientReviewNotifications";
import { velvetJwtHintsFromAccessToken } from "../../lib/velvetJwtHintsFromAccessToken";
import "../../styles/velvet-consumer-bookings-page.css";
import "../../styles/velvet-feedback-page.css";

export default function VelvetFeedbackPage() {
  const { accessToken, isSalonTitolare, isSalonStaff, signIn } = useVelvetAuth();
  const qc = useQueryClient();
  const canSalonOwner = isSalonTitolare && !isSalonStaff;
  const showStaffSalonReviews = isSalonStaff;
  const salonReviews = useMeSalonReviewsQuery(canSalonOwner || showStaffSalonReviews);
  const pendingInvites = useMePendingReviewInvitesQuery(!isSalonTitolare && !isSalonStaff);
  const reviewHistory = useMeReviewHistoryQuery(!isSalonTitolare && !isSalonStaff);
  const roles = useMemo(() => velvetJwtHintsFromAccessToken(accessToken ?? undefined).realmRoles, [accessToken]);
  const canClient = roles.includes("CLIENT");
  const [activeInviteId, setActiveInviteId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [staffRating, setStaffRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccessInviteId, setSubmitSuccessInviteId] = useState<string | null>(null);

  /** L’API restituisce solo appuntamenti già nella finestra «fine visita + offset» (default 2 h). */
  const eligiblePendingInvites = pendingInvites.data ?? [];

  const submitReviewM = useMutation({
    mutationFn: ({
      appointmentId,
      reviewRating,
      reviewStaffRating,
      reviewComment,
    }: {
      appointmentId: string;
      reviewRating: number;
      reviewStaffRating: number;
      reviewComment: string;
    }) =>
      apiJson<ReviewSubmitResponse>("/api/v1/me/reviews", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          appointmentId,
          rating: reviewRating,
          staffRating: reviewStaffRating,
          comment: reviewComment.trim() || null,
        }),
      }),
    onSuccess: async (_result, variables) => {
      setSubmitSuccessInviteId(variables.appointmentId);
      setActiveInviteId(null);
      setComment("");
      setRating(5);
      setStaffRating(5);
      setSubmitError(null);
      await qc.invalidateQueries({ queryKey: ["me", "reviews", "pending"] });
      await qc.invalidateQueries({ queryKey: ["me", "reviews", "history"] });
      await qc.invalidateQueries({ queryKey: ["me", "reviews"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Invio non riuscito";
      setSubmitError(message);
      if (message.toLowerCase().includes("non ancora ammissibile")) {
        setActiveInviteId(null);
        void qc.invalidateQueries({ queryKey: ["me", "reviews", "pending"] });
      }
    },
  });

  useEffect(() => {
    if (!activeInviteId) return;
    const id = window.setTimeout(() => {
      document.getElementById(`velvet-feedback-invite-${activeInviteId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 80);
    return () => window.clearTimeout(id);
  }, [activeInviteId]);

  const feedbackHero = (sub: string) => (
    <header className="velvet-consumer-bookings-dash__header--hero">
      <div className="velvet-consumer-bookings-dash__hero-glow" aria-hidden />
      <div className="velvet-consumer-bookings-dash__title-row">
        <h1 className="velvet-consumer-bookings-dash__headline">
          <span className="velvet-consumer-bookings-dash__headline-pre">Le mie </span>
          <span className="velvet-consumer-bookings-dash__headline-accent">recensioni</span>
        </h1>
        <p className="velvet-page-subtitle" style={{ margin: 0 }}>
          {sub}
        </p>
      </div>
    </header>
  );

  if (!canClient && !canSalonOwner && !showStaffSalonReviews) {
    return (
      <div className="velvet-feedback-page velvet-feedback-page--denied">
        {feedbackHero("Accesso riservato agli account cliente, titolare o operatore salone.")}
        <p className="velvet-text-muted">Questa pagina non è disponibile per il tuo profilo attuale.</p>
        <Link to="/account/home" className="velvet-btn velvet-btn--primary">
          Torna all&apos;account
        </Link>
      </div>
    );
  }

  if (canSalonOwner || showStaffSalonReviews) {
    const salonReviewsSubtitle = showStaffSalonReviews
      ? "Valutazioni dei clienti sugli appuntamenti a te assegnati."
      : "Valutazioni lasciate dai clienti dopo le visite alle tue sedi.";
    return (
      <div className="velvet-feedback-page velvet-feedback-page--salon">
        {feedbackHero(salonReviewsSubtitle)}
        {salonReviews.isPending ? (
          <div className="velvet-surface-card velvet-feedback-page__panel">
            <p className="velvet-text-muted">Caricamento recensioni…</p>
          </div>
        ) : salonReviews.isError ? (
          <div className="velvet-surface-card velvet-feedback-page__panel">
            {salonReviews.error && isVelvetUnauthorizedError(salonReviews.error) ? (
              <>
                <p className="velvet-text-muted">
                  Sessione scaduta o token non più valido. Effettua di nuovo l&apos;accesso per vedere lo storico
                  recensioni.
                </p>
                <button type="button" className="velvet-btn velvet-btn--primary" onClick={() => void signIn()}>
                  Accedi di nuovo
                </button>
              </>
            ) : (
              <p className="velvet-text-muted">
                Non riusciamo a caricare lo storico recensioni.
                {salonReviews.error instanceof Error && salonReviews.error.message.trim()
                  ? ` (${salonReviews.error.message.trim()})`
                  : ""}
              </p>
            )}
          </div>
        ) : salonReviews.data?.length ? (
          <div className="velvet-feedback-reviews-list">
            {salonReviews.data.map((review) => (
              <article key={review.id} className="velvet-surface-card velvet-feedback-review-card">
                <div className="velvet-feedback-review-card__head">
                  <p className="velvet-feedback-review-card__reviewer">{review.reviewerName}</p>
                  <p className="velvet-feedback-review-card__date velvet-text-muted">
                    {new Date(review.createdAt).toLocaleString("it-IT")}
                  </p>
                </div>
                <p className="velvet-feedback-review-card__rating">
                  Salone: {"★".repeat(Math.max(1, Math.min(5, review.rating)))}{" "}
                  <span className="velvet-text-muted">({review.rating}/5)</span>
                </p>
                {review.staffRating != null ? (
                  <p className="velvet-feedback-review-card__rating" style={{ marginTop: "0.25rem" }}>
                    {review.operatorName?.trim() || "Operatore"}:{" "}
                    {"★".repeat(Math.max(1, Math.min(5, review.staffRating)))}{" "}
                    <span className="velvet-text-muted">({review.staffRating}/5)</span>
                  </p>
                ) : null}
                <p className="velvet-feedback-review-card__service velvet-text-muted">
                  {review.serviceName ? review.serviceName : "Servizio non specificato"}
                  {review.locationName ? ` — ${review.locationName}` : null}
                </p>
                <p className="velvet-feedback-review-card__comment">{review.comment?.trim() || "Nessun commento."}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="velvet-surface-card velvet-feedback-page__panel">
            <p className="velvet-text-muted">Nessuna recensione ricevuta al momento.</p>
          </div>
        )}
      </div>
    );
  }

  const pendingLoaded = !pendingInvites.isPending && !pendingInvites.isError;
  const showEmptyClient = pendingLoaded && eligiblePendingInvites.length === 0;

  return (
    <div className="velvet-feedback-page velvet-feedback-page--client">
      {feedbackHero(
        "Dopo la visita, valuta salone e operatore con cui hai prenotato: le richieste compaiono qui quando è passato il tempo configurato dal backend (di default 2 ore dalla fine dell’appuntamento).",
      )}

      {pendingInvites.isPending ? (
        <div className="velvet-surface-card velvet-feedback-page__panel">
          <p className="velvet-text-muted">Caricamento richieste recensione…</p>
        </div>
      ) : pendingInvites.isError ? (
        <div className="velvet-surface-card velvet-feedback-page__panel">
          <p className="velvet-text-muted">
            Non riusciamo a caricare le richieste recensione.
            {pendingInvites.error instanceof Error && pendingInvites.error.message.trim()
              ? ` (${pendingInvites.error.message.trim()})`
              : ""}
          </p>
        </div>
      ) : (
        <>
          {eligiblePendingInvites.length ? (
            <>
              <h2 className="velvet-feedback-page__section-title">Da valutare ora</h2>
              <div className="velvet-feedback-invites-list">
                {eligiblePendingInvites.map((invite) => {
                  const expanded = activeInviteId === invite.appointmentId;
                  return (
                    <article
                      key={invite.appointmentId}
                      id={`velvet-feedback-invite-${invite.appointmentId}`}
                      className={
                        "velvet-surface-card velvet-feedback-invite-card" +
                        (expanded ? " velvet-feedback-invite-card--expanded" : "")
                      }
                    >
                      <p className="velvet-feedback-invite-card__title">
                        Valuta <strong>{invite.salonName}</strong>
                        {invite.operatorName ? (
                          <>
                            {" "}
                            e l&apos;operatore <strong>{invite.operatorName}</strong>
                          </>
                        ) : null}
                      </p>
                      <p className="velvet-feedback-invite-card__meta velvet-text-muted">
                        {invite.serviceName ? `Servizio: ${invite.serviceName}` : "Servizio effettuato"}
                        {invite.completedAt ? ` — fine appuntamento ${new Date(invite.completedAt).toLocaleString("it-IT")}` : ""}
                      </p>
                      {submitSuccessInviteId === invite.appointmentId ? (
                        <p className="velvet-alert velvet-alert--success velvet-feedback-invite-card__success" role="status">
                          Grazie, recensione inviata.
                        </p>
                      ) : null}
                      {expanded ? (
                        <form
                          className="velvet-feedback-invite-card__review-form"
                          onSubmit={(e: FormEvent) => {
                            e.preventDefault();
                            setSubmitError(null);
                            submitReviewM.mutate({
                              appointmentId: invite.appointmentId,
                              reviewRating: rating,
                              reviewStaffRating: staffRating,
                              reviewComment: comment,
                            });
                          }}
                        >
                          <StarRatingInput
                            id={`invite-review-salon-${invite.appointmentId}`}
                            label="Voto (1–5) — salone / struttura"
                            value={rating}
                            onChange={setRating}
                            disabled={submitReviewM.isPending}
                          />
                          <StarRatingInput
                            id={`invite-review-staff-${invite.appointmentId}`}
                            label={
                              invite.operatorName
                                ? `Voto (1–5) — operatore ${invite.operatorName}`
                                : "Voto (1–5) — operatore / professionista"
                            }
                            value={staffRating}
                            onChange={setStaffRating}
                            disabled={submitReviewM.isPending}
                          />
                          <label className="velvet-form-label velvet-feedback-page__invite-comment-label">
                            Commento (opzionale)
                            <textarea
                              className="velvet-soft-field"
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              rows={4}
                              disabled={submitReviewM.isPending}
                            />
                          </label>
                          {submitError ? (
                            <p className="velvet-alert velvet-alert--error velvet-feedback-invite-card__error" role="alert">
                              {submitError}
                            </p>
                          ) : null}
                          <div className="velvet-feedback-invite-card__actions">
                            <button
                              type="submit"
                              className="velvet-btn velvet-btn--primary velvet-feedback-invite-card__cta"
                              disabled={submitReviewM.isPending}
                            >
                              {submitReviewM.isPending ? "Invio…" : "Invia recensione"}
                            </button>
                            <button
                              type="button"
                              className="velvet-btn velvet-btn--secondary velvet-feedback-invite-card__cancel"
                              onClick={() => {
                                setActiveInviteId(null);
                                setSubmitError(null);
                                setComment("");
                                setRating(5);
                              }}
                              disabled={submitReviewM.isPending}
                            >
                              Annulla
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="velvet-feedback-invite-card__actions">
                          <button
                            type="button"
                            className="velvet-btn velvet-btn--primary velvet-feedback-invite-card__cta"
                            onClick={() => {
                              markClientReviewPendingSeen([invite.appointmentId]);
                              setActiveInviteId(invite.appointmentId);
                              setSubmitSuccessInviteId(null);
                              setSubmitError(null);
                              setComment("");
                              setRating(5);
                              setStaffRating(5);
                            }}
                          >
                            Valuta ora
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          ) : null}

          {showEmptyClient ? (
            <div className="velvet-surface-card velvet-feedback-page__panel">
              <p className="velvet-text-muted">Nessun salone da valutare in questo momento.</p>
            </div>
          ) : null}
        </>
      )}

      {!pendingInvites.isPending && !pendingInvites.isError && reviewHistory.data?.length ? (
        <section className="velvet-feedback-page__history" aria-label="Recensioni già inviate">
          <div className="velvet-feedback-page__history-head">
            <h2 className="velvet-feedback-page__history-title">Le tue recensioni inviate</h2>
            <p className="velvet-feedback-page__history-hint">Stesso elenco di GET /api/v1/me/reviews (anche in Profilo).</p>
          </div>
          <ul className="velvet-feedback-page__history-list">
            {reviewHistory.data.map((r) => (
              <li key={r.id} className="velvet-feedback-page__history-item">
                <div className="velvet-feedback-page__history-item-top">
                  <p className="velvet-feedback-page__history-salon">{r.salonName?.trim() || "Salone"}</p>
                  <p className="velvet-feedback-page__history-stars">
                    Salone {"★".repeat(Math.max(1, Math.min(5, r.rating)))}{" "}
                    <span className="velvet-text-muted">({r.rating}/5)</span>
                    {r.staffRating != null ? (
                      <>
                        {" · op. "}
                        {"★".repeat(Math.max(1, Math.min(5, r.staffRating)))}{" "}
                        <span className="velvet-text-muted">({r.staffRating}/5)</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <p className="velvet-feedback-page__history-meta">
                  {r.serviceName ? `${r.serviceName} · ` : null}
                  {r.appointmentStart ? new Date(r.appointmentStart).toLocaleDateString("it-IT") : null}
                  {r.createdAt ? ` · inviata il ${new Date(r.createdAt).toLocaleDateString("it-IT")}` : null}
                </p>
                {r.comment?.trim() ? <p className="velvet-feedback-page__history-comment">{r.comment.trim()}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
