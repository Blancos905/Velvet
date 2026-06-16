import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { AppointmentDto, ReviewSubmitResponse } from "../../api/types";
import { StarRatingInput } from "../../components/StarRatingInput";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { formatPriceEUR } from "../../lib/format";
import "../../styles/velvet-appointment-detail-page.css";

function localDayBounds(): { from: string; to: string } {
  const d = new Date();
  const from = d.toISOString().slice(0, 10);
  const end = new Date(d);
  end.setDate(end.getDate() + 14);
  const to = end.toISOString().slice(0, 10);
  return { from, to };
}

function isBookedOrConfirmed(status: string): boolean {
  return status === "BOOKED" || status === "CONFIRMED";
}

function canSalonCancel(status: string): boolean {
  return status !== "CANCELLED" && status !== "COMPLETED";
}

function appointmentStatusLabel(status: string): string {
  switch (status) {
    case "BOOKED":
      return "Prenotata";
    case "CONFIRMED":
      return "Confermata";
    case "COMPLETED":
      return "Completata";
    case "CANCELLED":
      return "Cancellata";
    default:
      return status;
  }
}

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { accessToken, isSalonTitolare } = useVelvetAuth();
  const qc = useQueryClient();
  const reviewSectionRef = useRef<HTMLElement | null>(null);

  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewStaffRating, setReviewStaffRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewErr, setReviewErr] = useState<string | null>(null);
  const [reviewDone, setReviewDone] = useState(false);
  const [reviewReturning, setReviewReturning] = useState(false);
  const openReview = searchParams.get("openReview") === "1";
  const rawReturnTo = searchParams.get("returnTo")?.trim() ?? "";
  const returnTo = rawReturnTo.startsWith("/account/") ? rawReturnTo : null;

  const q = useQuery({
    queryKey: ["me", "appointments", "one", id, isSalonTitolare ? "salon" : "consumer"],
    queryFn: () =>
      apiJson<AppointmentDto>(
        isSalonTitolare ? `/api/v1/me/salon/appointments/${id}` : `/api/v1/me/appointments/${id}`,
        { accessToken },
      ),
    enabled: Boolean(id && accessToken),
  });

  const reload = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["me", "appointments"] });
  }, [qc]);

  const a = q.data;

  useEffect(() => {
    setSlots([]);
    setSelectedSlot(null);
    setErr(null);
    setOkMsg(null);
    setReviewRating(5);
    setReviewComment("");
    setReviewErr(null);
    setReviewDone(false);
    setReviewReturning(false);
  }, [id]);

  useEffect(() => {
    if (!openReview) return;
    if (!a || a.status !== "COMPLETED" || isSalonTitolare) return;
    const t = window.setTimeout(() => {
      reviewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [openReview, a, isSalonTitolare]);

  const loadSlots = async () => {
    if (!id || !accessToken) return;
    const { from, to } = localDayBounds();
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    setErr(null);
    try {
      const list = await apiJson<string[]>(
        `/api/v1/me/appointments/${id}/reschedule/slots?from=${from}&to=${to}`,
        { accessToken },
      );
      setSlots(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Slot non disponibili");
    } finally {
      setSlotsLoading(false);
    }
  };

  const onCancel = async () => {
    if (!id || !accessToken || !a || !a.canConsumerCancel) return;
    if (!window.confirm("Annullare questa prenotazione?")) return;
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      await apiJson(`/api/v1/me/appointments/${id}/cancel`, {
        method: "POST",
        accessToken,
      });
      await reload();
      await q.refetch();
      setOkMsg("Prenotazione annullata con successo.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Annullamento fallito");
    } finally {
      setBusy(false);
    }
  };

  const onCancelSalon = async () => {
    if (!id || !accessToken || !a || !canSalonCancel(a.status)) return;
    if (!window.confirm("Annullare questa prenotazione come salone?")) return;
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      await apiJson(`/api/v1/me/salon/appointments/${id}/cancel`, {
        method: "POST",
        accessToken,
      });
      await qc.invalidateQueries({ queryKey: ["me", "salon", "agenda"] });
      await q.refetch();
      setOkMsg("Prenotazione annullata con successo.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Annullamento fallito");
    } finally {
      setBusy(false);
    }
  };

  const onReschedule = async () => {
    if (!id || !accessToken || !selectedSlot) return;
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      await apiJson(`/api/v1/me/appointments/${id}/reschedule`, {
        method: "POST",
        accessToken,
        body: JSON.stringify({ newStart: selectedSlot }),
      });
      setSlots([]);
      setSelectedSlot(null);
      await reload();
      await q.refetch();
      setOkMsg("Orario prenotazione aggiornato con successo.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Riprogrammazione fallita");
    } finally {
      setBusy(false);
    }
  };

  const onRescheduleSalon = async () => {
    if (!id || !accessToken || !selectedSlot || !a || !canSalonCancel(a.status)) return;
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      await apiJson(`/api/v1/me/salon/appointments/${id}/reschedule`, {
        method: "POST",
        accessToken,
        body: JSON.stringify({ newStart: selectedSlot }),
      });
      setSlots([]);
      setSelectedSlot(null);
      await qc.invalidateQueries({ queryKey: ["me", "salon", "agenda"] });
      await q.refetch();
      setOkMsg("Appuntamento modificato con successo.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Riprogrammazione fallita");
    } finally {
      setBusy(false);
    }
  };

  const loadSlotsSalon = async () => {
    if (!id || !accessToken || !a || !canSalonCancel(a.status)) return;
    const { from, to } = localDayBounds();
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    setErr(null);
    try {
      const list = await apiJson<string[]>(
        `/api/v1/me/salon/appointments/${id}/reschedule/slots?from=${from}&to=${to}`,
        { accessToken },
      );
      setSlots(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Slot non disponibili");
    } finally {
      setSlotsLoading(false);
    }
  };

  if (q.isLoading) {
    return (
      <div className="velvet-appointment-detail-page">
        <p className="velvet-text-muted">Caricamento…</p>
      </div>
    );
  }
  if (q.error || !a) {
    return (
      <div className="velvet-appointment-detail-page">
        <p className="velvet-alert velvet-alert--error" role="alert">
          {q.error instanceof Error ? q.error.message : "Appuntamento non trovato"}
        </p>
        <Link to="/account/prenotazioni" className="velvet-link-back">
          ← Torna all&apos;elenco
        </Link>
      </div>
    );
  }

  const showConsumerBookingActions = isBookedOrConfirmed(a.status) && !isSalonTitolare;
  const hasSelfService = a.canConsumerCancel || a.canConsumerReschedule;
  const deadlineFmt = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="velvet-appointment-detail-page">
      <Link to="/account/prenotazioni" className="velvet-link-back velvet-link-back--overlay-nav">
        <span className="velvet-link-back__chevron" aria-hidden="true">
          ←
        </span>
        <span className="velvet-link-back__text">{isSalonTitolare ? "Agenda" : "Prenotazioni"}</span>
      </Link>
      <header className="velvet-appointment-detail-page__hero">
        <div className="velvet-appointment-detail-page__hero-glow" aria-hidden />
        <div className="velvet-appointment-detail-page__hero-inner">
          <h1 className="velvet-appointment-detail-page__headline">
            <span className="velvet-appointment-detail-page__headline-pre">
              {isSalonTitolare ? "Appuntamento · " : "Prenotazione · "}
            </span>
            <span className="velvet-appointment-detail-page__headline-accent">{a.serviceName}</span>
          </h1>
          <p className="velvet-appointment-detail-page__hero-sub">
            {isSalonTitolare
              ? "Dettaglio prenotazione: modifica orario o annulla come salone."
              : "Dettaglio della tua visita: orario, sede e stato."}
          </p>
        </div>
      </header>

      <section className="velvet-surface-card velvet-appointment-detail-page__summary">
        <p className="velvet-appointment-detail-page__location">{a.locationName}</p>
        <p className="velvet-appointment-detail-page__meta">
          {formatPriceEUR(a.priceCents)} · {a.operatorName}
        </p>
        <p className="velvet-appointment-detail-page__when">
          {new Date(a.start).toLocaleString(undefined, {
            dateStyle: "full",
            timeStyle: "short",
          })}
        </p>
        <div className="velvet-appointment-detail-page__status-row">
          <span className="velvet-appointment-detail-page__status-label">Stato</span>
          <span className="velvet-appointment-detail-page__status" data-appt-status={a.status}>
            {appointmentStatusLabel(a.status)}
          </span>
        </div>
      </section>

      {err && (
        <p className="velvet-alert velvet-alert--error" role="alert">
          {err}
        </p>
      )}
      {okMsg && (
        <p className="velvet-alert velvet-alert--success" role="status">
          {okMsg}
        </p>
      )}

      {showConsumerBookingActions && hasSelfService && (
        <div className="velvet-btn-row velvet-appointment-detail-page__actions">
          {a.canConsumerCancel ? (
            <button type="button" className="velvet-btn velvet-btn--secondary" onClick={() => void onCancel()} disabled={busy}>
              Disdici prenotazione
            </button>
          ) : null}

          {!slots.length && a.canConsumerReschedule && (
            <button
              type="button"
              className="velvet-btn velvet-btn--primary"
              onClick={() => void loadSlots()}
              disabled={busy || slotsLoading}
            >
              {slotsLoading ? "Carico orari…" : "Cambia orario"}
            </button>
          )}

          {!!slots.length && a.canConsumerReschedule && (
            <div className="velvet-appointment-detail-page__reschedule-block">
              <label htmlFor="slot-me" className="velvet-form-label">
                Scegli un nuovo orario
              </label>
              <select
                id="slot-me"
                className="velvet-soft-field"
                value={selectedSlot ?? ""}
                onChange={(e) => setSelectedSlot(e.target.value || null)}
              >
                <option value="">—</option>
                {slots.map((s) => (
                  <option key={s} value={s}>
                    {new Date(s).toLocaleString(undefined, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="velvet-btn velvet-btn--primary"
                onClick={() => void onReschedule()}
                disabled={!selectedSlot || busy}
              >
                Conferma nuovo orario
              </button>
            </div>
          )}
        </div>
      )}

      {showConsumerBookingActions && !hasSelfService && (
        <p className="velvet-text-muted" style={{ marginTop: "1.25rem" }}>
          La modifica e la disdetta autonoma non sono più disponibili: termine per la disdetta era il{" "}
          {deadlineFmt.format(new Date(a.consumerCancelDeadline))}, termine per cambiare orario il{" "}
          {deadlineFmt.format(new Date(a.consumerRescheduleDeadline))}. Per eccezioni contatta {a.locationName}.
        </p>
      )}

      {!showConsumerBookingActions && a.status !== "CANCELLED" && a.status !== "COMPLETED" && !isSalonTitolare && (
        <p className="velvet-text-muted" style={{ marginTop: "1.25rem" }}>
          Per modifiche in questo stato contatta il salone.
        </p>
      )}

      {isSalonTitolare && (
        <div className="velvet-btn-row velvet-appointment-detail-page__actions">
          {!slots.length && canSalonCancel(a.status) ? (
            <button
              type="button"
              className="velvet-btn velvet-btn--primary"
              onClick={() => void loadSlotsSalon()}
              disabled={busy || slotsLoading}
            >
              {slotsLoading ? "Carico orari…" : "Modifica appuntamento"}
            </button>
          ) : null}
          {canSalonCancel(a.status) ? (
            <button type="button" className="velvet-btn velvet-btn--secondary" onClick={() => void onCancelSalon()} disabled={busy}>
              Annulla appuntamento
            </button>
          ) : null}
          {!!slots.length && canSalonCancel(a.status) ? (
            <div className="velvet-appointment-detail-page__reschedule-block">
              <label htmlFor="slot-salon" className="velvet-form-label">
                Scegli un nuovo orario
              </label>
              <select
                id="slot-salon"
                className="velvet-soft-field"
                value={selectedSlot ?? ""}
                onChange={(e) => setSelectedSlot(e.target.value || null)}
              >
                <option value="">—</option>
                {slots.map((s) => (
                  <option key={s} value={s}>
                    {new Date(s).toLocaleString("it-IT", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="velvet-btn velvet-btn--primary"
                onClick={() => void onRescheduleSalon()}
                disabled={!selectedSlot || busy}
              >
                Conferma modifica appuntamento
              </button>
            </div>
          ) : null}
        </div>
      )}

      {a.status === "COMPLETED" && !isSalonTitolare && accessToken && (
        <section ref={reviewSectionRef} className="velvet-surface-card velvet-appointment-detail-page__review">
          <h2 className="velvet-section-title" style={{ marginTop: 0 }}>
            La tua recensione
          </h2>
          <p className="velvet-text-muted" style={{ margin: "0 0 1rem", fontSize: "0.92rem" }}>
            Puoi usare anche il link che ricevi via email dopo la visita: qui è lo stesso flusso, con il tuo
            account.
          </p>
          {reviewErr && (
            <p className="velvet-alert velvet-alert--error" role="alert">
              {reviewErr}
            </p>
          )}
          {reviewDone ? (
            <p className="velvet-alert velvet-alert--success" role="status">
              {reviewReturning ? "Grazie, recensione registrata. Ritorno alle recensioni..." : "Grazie, recensione registrata."}
            </p>
          ) : (
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                if (!id || !accessToken) return;
                setReviewBusy(true);
                setReviewErr(null);
                void (async () => {
                  try {
                    await apiJson<ReviewSubmitResponse>("/api/v1/me/reviews", {
                      method: "POST",
                      accessToken,
                      body: JSON.stringify({
                        appointmentId: id,
                        rating: reviewRating,
                        staffRating: reviewStaffRating,
                        comment: reviewComment.trim() || null,
                      }),
                    });
                    setReviewDone(true);
                    await reload();
                    if (returnTo) {
                      setReviewReturning(true);
                      window.setTimeout(() => {
                        navigate(returnTo, { replace: true });
                      }, 900);
                    }
                  } catch (ex) {
                    setReviewErr(ex instanceof Error ? ex.message : "Invio non riuscito");
                  } finally {
                    setReviewBusy(false);
                  }
                })();
              }}
            >
              <StarRatingInput
                id="appointment-review-salon"
                label="Voto (1–5) — salone / struttura"
                value={reviewRating}
                onChange={setReviewRating}
                disabled={reviewBusy}
              />
              <StarRatingInput
                id="appointment-review-staff"
                label="Voto (1–5) — operatore / professionista"
                value={reviewStaffRating}
                onChange={setReviewStaffRating}
                disabled={reviewBusy}
              />
              <label className="velvet-form-label" style={{ marginTop: "0.85rem" }}>
                Commento (opzionale)
                <textarea
                  className="velvet-soft-field"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                />
              </label>
              <button type="submit" className="velvet-btn velvet-btn--primary" disabled={reviewBusy} style={{ marginTop: "1rem" }}>
                {reviewBusy ? "Invio…" : "Invia recensione"}
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
