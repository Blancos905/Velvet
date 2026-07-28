import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { ReviewSubmitResponse } from "../../api/types";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { StarRatingInput } from "../../components/StarRatingInput";
import { SearchHitLogoAvatar, searchHitInitials } from "../../components/SearchHitLogoAvatar";
import { useMePendingReviewInvitesQuery } from "../../hooks/useMePendingReviewInvites";
import { useMeReviewHistoryQuery } from "../../hooks/useMeReviewHistory";
import { useMeSalonReviewsQuery } from "../../hooks/useMeSalonReviews";
import { isLuxuryUnauthorizedError } from "../../lib/authErrors";
import {
  CLIENT_REVIEW_PENDING_CHANGED_EVENT,
  dismissClientReviewPending,
  markClientReviewPendingSeen,
  readDismissedClientReviewPendingIds,
} from "../../lib/clientReviewNotifications";
import { luxuryJwtHintsFromAccessToken } from "../../lib/luxuryJwtHintsFromAccessToken";
import { ClientReviewsHeroHeader } from "../../components/account/ClientReviewsHeroHeader";
import { CLIENT_ACCOUNT_ICONS, ClientAccountContentCard } from "../../components/account/ClientAccountContentCard";
import { ClientAccountHeroHeader } from "../../components/account/ClientAccountHeroHeader";
import { INFO_PRIVACY_HERO_ICONS } from "../../components/account/InfoPrivacyAccountHeroHeader";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../lib/clientAccountPageShellClasses";
import "../../styles/luxury-consumer-bookings-page.css";
import "../../styles/luxury-info-privacy-hero.css";
import "../../styles/luxury-feedback-page.css";
import "../../styles/luxury-feedback-client.css";
import "../../styles/luxury-feedback-salon.css";
import "../../styles/luxury-feedback-staff.css";

export default function LuxuryFeedbackPage() {
  const { accessToken, isSalonTitolare, isSalonStaff, signIn } = useLuxuryAuth();
  const qc = useQueryClient();
  const canSalonOwner = isSalonTitolare && !isSalonStaff;
  const showStaffSalonReviews = isSalonStaff;
  const salonReviews = useMeSalonReviewsQuery(canSalonOwner || showStaffSalonReviews);
  const pendingInvites = useMePendingReviewInvitesQuery(!isSalonTitolare && !isSalonStaff);
  const reviewHistory = useMeReviewHistoryQuery(!isSalonTitolare && !isSalonStaff);
  const roles = useMemo(() => luxuryJwtHintsFromAccessToken(accessToken ?? undefined).realmRoles, [accessToken]);
  const canClient = roles.includes("CLIENT");
  const [activeInviteId, setActiveInviteId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [staffRating, setStaffRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccessInviteId, setSubmitSuccessInviteId] = useState<string | null>(null);
  const [dismissedInviteTick, setDismissedInviteTick] = useState(0);

  useEffect(() => {
    const onPendingChanged = () => setDismissedInviteTick((n) => n + 1);
    window.addEventListener(CLIENT_REVIEW_PENDING_CHANGED_EVENT, onPendingChanged);
    return () => window.removeEventListener(CLIENT_REVIEW_PENDING_CHANGED_EVENT, onPendingChanged);
  }, []);

  /** L’API restituisce solo appuntamenti già nella finestra «fine visita + offset» (default 2 h). */
  const eligiblePendingInvites = useMemo(() => {
    const dismissed = readDismissedClientReviewPendingIds();
    return (pendingInvites.data ?? []).filter((invite) => !dismissed.has(invite.appointmentId));
  }, [pendingInvites.data, dismissedInviteTick]);

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
      document.getElementById(`luxury-feedback-invite-${activeInviteId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 80);
    return () => window.clearTimeout(id);
  }, [activeInviteId]);

  const feedbackHero = (subtitle?: ReactNode) => (
    <header className="luxury-consumer-bookings-dash__header--hero">
      <div className="luxury-consumer-bookings-dash__hero-glow" aria-hidden />
      <div className="luxury-consumer-bookings-dash__title-row">
        <h1 className="luxury-consumer-bookings-dash__headline">
          <span className="luxury-consumer-bookings-dash__headline-pre">Le mie </span>
          <span className="luxury-consumer-bookings-dash__headline-accent">recensioni</span>
        </h1>
        {subtitle != null && subtitle !== "" ? (
          <div className="luxury-feedback-page__hero-sub" style={{ margin: 0 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </header>
  );

  if (!canClient && !canSalonOwner && !showStaffSalonReviews) {
    return (
      <div className="luxury-feedback-page luxury-feedback-page--denied">
        {feedbackHero("Accesso riservato agli account cliente, titolare o operatore salone.")}
        <p className="luxury-text-muted">Questa pagina non è disponibile per il tuo profilo attuale.</p>
        <Link to="/account" className="luxury-btn luxury-btn--primary">
          Torna all&apos;account
        </Link>
      </div>
    );
  }

  if (canSalonOwner || showStaffSalonReviews) {
    const salonReviewsList = salonReviews.data ?? [];
    const ratingValues = showStaffSalonReviews
      ? salonReviewsList.map((r) => r.staffRating).filter((v): v is number => v != null)
      : salonReviewsList.map((r) => r.rating);
    const avgRating = ratingValues.length
      ? ratingValues.reduce((acc, v) => acc + v, 0) / ratingValues.length
      : null;
    const ratingLabel =
      avgRating != null
        ? `${avgRating.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/5 medio`
        : "Nessuna valutazione";
    const countLabel = `${salonReviewsList.length} ${salonReviewsList.length === 1 ? "recensione" : "recensioni"}`;
    return (
      <div
        className={`luxury-account-page-shell luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-account-page-shell--narrow luxury-feedback-page luxury-feedback-page--salon ${showStaffSalonReviews ? "luxury-feedback-page--staff-side" : "luxury-feedback-page--salon-side"} ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`}
      >
        <div className="luxury-consumer-bookings-dash__shell">
          <ClientAccountHeroHeader
            headlinePre="Le tue "
            headlineAccent="recensioni"
            badgePrimary={showStaffSalonReviews ? "Area operatore" : "Area salone"}
            badgeSecondary="Opinioni dei clienti"
            kickerLabel="Post-visita"
            kickerChip="Valutazioni ricevute"
            subtitle={
              showStaffSalonReviews ? (
                <>
                  Valutazioni dei clienti sugli <strong>appuntamenti a te assegnati</strong>.
                </>
              ) : (
                <>
                  Valutazioni lasciate dai clienti dopo le visite alle tue <strong>sedi</strong>.
                </>
              )
            }
            metaItems={[
              { icon: CLIENT_ACCOUNT_ICONS.heart, label: ratingLabel },
              { icon: INFO_PRIVACY_HERO_ICONS.user, label: countLabel },
            ]}
          />

          <ClientAccountContentCard ariaLabel="Recensioni ricevute dal salone" title="Recensioni ricevute">
            {salonReviews.isPending ? (
              <div className="luxury-surface-card luxury-feedback-page__panel">
                <p className="luxury-text-muted">Caricamento recensioni…</p>
              </div>
            ) : salonReviews.isError ? (
              <div className="luxury-surface-card luxury-feedback-page__panel">
                {salonReviews.error && isLuxuryUnauthorizedError(salonReviews.error) ? (
                  <>
                    <p className="luxury-text-muted">
                      Sessione scaduta o token non più valido. Effettua di nuovo l&apos;accesso per vedere lo storico
                      recensioni.
                    </p>
                    <button type="button" className="luxury-btn luxury-btn--primary" onClick={() => void signIn()}>
                      Accedi di nuovo
                    </button>
                  </>
                ) : (
                  <p className="luxury-text-muted">
                    Non riusciamo a caricare lo storico recensioni.
                    {salonReviews.error instanceof Error && salonReviews.error.message.trim()
                      ? ` (${salonReviews.error.message.trim()})`
                      : ""}
                  </p>
                )}
              </div>
            ) : salonReviewsList.length ? (
              <div className="luxury-feedback-reviews-list">
                {salonReviewsList.map((review) => (
                  <article key={review.id} className="luxury-surface-card luxury-feedback-review-card">
                    <div className="luxury-feedback-review-card__head">
                      <p className="luxury-feedback-review-card__reviewer">{review.reviewerName}</p>
                      <p className="luxury-feedback-review-card__date luxury-text-muted">
                        {new Date(review.createdAt).toLocaleString("it-IT")}
                      </p>
                    </div>
                    <p className="luxury-feedback-review-card__rating">
                      Salone:{" "}
                      <span className="luxury-feedback-stars" aria-hidden>
                        {"★".repeat(Math.max(1, Math.min(5, review.rating)))}
                      </span>{" "}
                      <span className="luxury-text-muted">({review.rating}/5)</span>
                    </p>
                    {review.staffRating != null ? (
                      <p className="luxury-feedback-review-card__rating" style={{ marginTop: "0.25rem" }}>
                        {review.operatorName?.trim() || "Operatore"}:{" "}
                        <span className="luxury-feedback-stars" aria-hidden>
                          {"★".repeat(Math.max(1, Math.min(5, review.staffRating)))}
                        </span>{" "}
                        <span className="luxury-text-muted">({review.staffRating}/5)</span>
                      </p>
                    ) : null}
                    <p className="luxury-feedback-review-card__service luxury-text-muted">
                      {review.serviceName ? review.serviceName : "Servizio non specificato"}
                      {review.locationName ? ` — ${review.locationName}` : null}
                    </p>
                    <p className="luxury-feedback-review-card__comment">{review.comment?.trim() || "Nessun commento."}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="luxury-surface-card luxury-feedback-page__panel">
                <p className="luxury-text-muted">Nessuna recensione ricevuta al momento.</p>
              </div>
            )}
          </ClientAccountContentCard>
        </div>
      </div>
    );
  }

  const pendingLoaded = !pendingInvites.isPending && !pendingInvites.isError;
  const historyCount = reviewHistory.data?.length ?? 0;

  return (
    <div className={`luxury-account-page-shell luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-account-page-shell--narrow luxury-feedback-page luxury-feedback-page--client ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`}>
      <div className="luxury-consumer-bookings-dash__shell">
        <ClientReviewsHeroHeader
          pendingCount={pendingLoaded ? eligiblePendingInvites.length : undefined}
          historyCount={!reviewHistory.isPending && !reviewHistory.isError ? historyCount : undefined}
        />

        <article className="luxury-feedback-client-page__card luxury-surface-card" aria-label="Gestione recensioni cliente">
          <div className="luxury-feedback-client-page__card-glow" aria-hidden />
          <header className="luxury-feedback-client-page__card-head">
            <h2 className="luxury-feedback-client-page__card-title">Valutazioni e storico</h2>
          </header>

          <div className="luxury-feedback-client-page__card-body">
      {pendingInvites.isPending ? (
        <div className="luxury-surface-card luxury-feedback-page__panel">
          <p className="luxury-text-muted">Caricamento richieste recensione…</p>
        </div>
      ) : pendingInvites.isError ? (
        <div className="luxury-surface-card luxury-feedback-page__panel">
          <p className="luxury-text-muted">
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
              <div className="luxury-feedback-client-page__section-head">
                <h2 className="luxury-feedback-page__section-title">Da valutare ora</h2>
                <span className="luxury-feedback-client-page__section-pill">{eligiblePendingInvites.length}</span>
              </div>
              <div className="luxury-feedback-invites-list">
                {eligiblePendingInvites.map((invite) => {
                  const expanded = activeInviteId === invite.appointmentId;
                  return (
                    <article
                      key={invite.appointmentId}
                      id={`luxury-feedback-invite-${invite.appointmentId}`}
                      className={
                        "luxury-surface-card luxury-feedback-invite-card" +
                        (expanded ? " luxury-feedback-invite-card--expanded" : "")
                      }
                    >
                      <p className="luxury-feedback-invite-card__title">
                        Valuta <strong>{invite.salonName}</strong>
                        {invite.operatorName ? (
                          <>
                            {" "}
                            e l&apos;operatore <strong>{invite.operatorName}</strong>
                          </>
                        ) : null}
                      </p>
                      <p className="luxury-feedback-invite-card__meta luxury-text-muted">
                        {invite.serviceName ? `Servizio: ${invite.serviceName}` : "Servizio effettuato"}
                        {invite.completedAt ? ` — fine appuntamento ${new Date(invite.completedAt).toLocaleString("it-IT")}` : ""}
                      </p>
                      {submitSuccessInviteId === invite.appointmentId ? (
                        <p className="luxury-alert luxury-alert--success luxury-feedback-invite-card__success" role="status">
                          Grazie, recensione inviata.
                        </p>
                      ) : null}
                      {expanded ? (
                        <form
                          className="luxury-feedback-invite-card__review-form"
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
                          <label className="luxury-form-label luxury-feedback-page__invite-comment-label">
                            Commento (opzionale)
                            <textarea
                              className="luxury-soft-field"
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              rows={4}
                              disabled={submitReviewM.isPending}
                            />
                          </label>
                          {submitError ? (
                            <p className="luxury-alert luxury-alert--error luxury-feedback-invite-card__error" role="alert">
                              {submitError}
                            </p>
                          ) : null}
                          <div className="luxury-feedback-invite-card__actions">
                            <button
                              type="submit"
                              className="luxury-btn luxury-btn--primary luxury-feedback-invite-card__cta"
                              disabled={submitReviewM.isPending}
                            >
                              {submitReviewM.isPending ? "Invio…" : "Invia recensione"}
                            </button>
                            <button
                              type="button"
                              className="luxury-btn luxury-btn--secondary luxury-feedback-invite-card__cancel"
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
                        <div className="luxury-feedback-invite-card__actions">
                          <button
                            type="button"
                            className="luxury-btn luxury-btn--primary luxury-feedback-invite-card__cta"
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
                          <button
                            type="button"
                            className="luxury-btn luxury-btn--secondary luxury-feedback-invite-card__cancel"
                            onClick={() => {
                              dismissClientReviewPending([invite.appointmentId]);
                              if (activeInviteId === invite.appointmentId) {
                                setActiveInviteId(null);
                                setSubmitError(null);
                                setComment("");
                                setRating(5);
                                setStaffRating(5);
                              }
                            }}
                          >
                            Non valutare
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          ) : null}

        </>
      )}

      {!pendingInvites.isPending && !pendingInvites.isError && reviewHistory.data?.length ? (
        <section className="luxury-feedback-page__history luxury-feedback-client-page__history" aria-label="Recensioni già inviate">
          <div className="luxury-feedback-page__history-head">
            <h2 className="luxury-feedback-page__history-title">Le tue recensioni inviate</h2>
            <p className="luxury-feedback-page__history-hint">
              {historyCount} {historyCount === 1 ? "recensione" : "recensioni"} pubblicate sulla piattaforma.
            </p>
          </div>
          <ul className="luxury-feedback-page__history-list">
            {reviewHistory.data.map((r) => {
              const salonLabel = r.salonName?.trim() || "Salone";
              const salonSlug = r.salonSlug?.trim() || "";
              const salonLogo = r.salonLogoDataUrl?.trim() || "";
              return (
              <li key={r.id} className="luxury-feedback-page__history-item">
                <div className="luxury-feedback-client-page__history-item-layout">
                  {salonLogo ? (
                    <div
                      className="luxury-feedback-client-page__history-logo luxury-feedback-client-page__history-logo--logo"
                      aria-hidden
                    >
                      <img src={salonLogo} alt="" />
                    </div>
                  ) : salonSlug ? (
                    <SearchHitLogoAvatar
                      slug={salonSlug}
                      name={salonLabel}
                      avatarClass="luxury-feedback-client-page__history-logo"
                      logoExtraClass="luxury-feedback-client-page__history-logo--logo"
                    />
                  ) : (
                    <div className="luxury-feedback-client-page__history-logo" aria-hidden>
                      {searchHitInitials(salonLabel)}
                    </div>
                  )}
                  <div className="luxury-feedback-client-page__history-item-body">
                <div className="luxury-feedback-page__history-item-top">
                  <p className="luxury-feedback-page__history-salon">{salonLabel}</p>
                  <p className="luxury-feedback-page__history-stars">
                    Salone{" "}
                    <span className="luxury-feedback-stars" aria-hidden>
                      {"★".repeat(Math.max(1, Math.min(5, r.rating)))}
                    </span>{" "}
                    <span className="luxury-text-muted">({r.rating}/5)</span>
                    {r.staffRating != null ? (
                      <>
                        {" · op. "}
                        <span className="luxury-feedback-stars" aria-hidden>
                          {"★".repeat(Math.max(1, Math.min(5, r.staffRating)))}
                        </span>{" "}
                        <span className="luxury-text-muted">({r.staffRating}/5)</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <p className="luxury-feedback-page__history-meta">
                  {r.serviceName ? `${r.serviceName} · ` : null}
                  {r.appointmentStart ? new Date(r.appointmentStart).toLocaleDateString("it-IT") : null}
                  {r.createdAt ? ` · inviata il ${new Date(r.createdAt).toLocaleDateString("it-IT")}` : null}
                </p>
                {r.comment?.trim() ? <p className="luxury-feedback-page__history-comment">{r.comment.trim()}</p> : null}
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        </section>
      ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}
