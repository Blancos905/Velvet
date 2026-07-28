import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { AppointmentDto, ReviewSubmitResponse } from "../../api/types";
import { BookingActionConfirmModal } from "../../components/BookingActionConfirmModal";
import { BookingConfirmedModal } from "../../components/BookingConfirmedModal";
import { StarRatingInput } from "../../components/StarRatingInput";
import { ClientAccountContentCard } from "../../components/account/ClientAccountContentCard";
import { ClientAccountHeroHeader } from "../../components/account/ClientAccountHeroHeader";
import { INFO_PRIVACY_HERO_ICONS } from "../../components/account/InfoPrivacyAccountHeroHeader";
import { SearchHitLogoAvatar, searchHitInitials } from "../../components/SearchHitLogoAvatar";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { STAFF_MEMBER_AGENDA_PATH } from "../../lib/staffMemberAgendaPath";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../lib/clientAccountPageShellClasses";
import { formatPriceEUR } from "../../lib/format";
import "../../styles/luxury-consumer-bookings-page.css";
import "../../styles/luxury-info-privacy-hero.css";
import "../../styles/luxury-feedback-client.css";
import "../../styles/luxury-client-account-page.css";
import "../../styles/luxury-appointment-detail-page.css";

function formatAgendaDate(iso: string): { day: string; month: string; weekday: string; time: string; full: string } {
  const d = new Date(iso);
  return {
    day: new Intl.DateTimeFormat("it-IT", { day: "2-digit" }).format(d),
    month: new Intl.DateTimeFormat("it-IT", { month: "short" }).format(d),
    weekday: new Intl.DateTimeFormat("it-IT", { weekday: "short" }).format(d),
    time: new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(d),
    full: new Intl.DateTimeFormat("it-IT", { dateStyle: "full", timeStyle: "short" }).format(d),
  };
}

function localDayBounds(): { from: string; to: string } {
  const d = new Date();
  const from = d.toISOString().slice(0, 10);
  const end = new Date(d);
  end.setDate(end.getDate() + 14);
  const to = end.toISOString().slice(0, 10);
  return { from, to };
}


function canSalonCancel(status: string): boolean {
  return status !== "CANCELLED" && status !== "COMPLETED";
}

function appointmentStatusLabel(status: string): string {
  switch (status) {
    case "BOOKED":
      return "In attesa di conferma";
    case "CONFIRMED":
      return "Confermata";
    case "COMPLETED":
      return "Completata";
    case "CANCELLED":
      return "Annullata";
    default:
      return status;
  }
}

function salonAppointmentApiBase(isSalonTitolare: boolean, isSalonStaff: boolean): string | null {
  if (isSalonTitolare) return "/api/v1/me/salon/appointments";
  if (isSalonStaff) return "/api/v1/me/staff/appointments";
  return null;
}

type BookingConfirmedLocationState = {
  bookingConfirmed?: {
    startIso: string;
    serviceName?: string;
  };
};

type PendingAppointmentConfirm =
  | "consumer-cancel"
  | "salon-cancel"
  | "salon-reject"
  | null;

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { accessToken, isSalonTitolare, isSalonStaff } = useLuxuryAuth();
  const qc = useQueryClient();
  const reviewSectionRef = useRef<HTMLDivElement | null>(null);
  const salonSide = isSalonTitolare || isSalonStaff;
  const salonApiBase = salonAppointmentApiBase(isSalonTitolare, isSalonStaff);
  /** Base consumer appuntamenti (BE `consumer-appointments-path`; dettaglio `/account/prenotazioni/{id}`). */
  const consumerAppointmentsBase = "/account/prenotazioni";
  const agendaListPath = isSalonStaff ? STAFF_MEMBER_AGENDA_PATH : consumerAppointmentsBase;

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
  const [pendingConfirm, setPendingConfirm] = useState<PendingAppointmentConfirm>(null);
  const [bookingConfirmedPopup, setBookingConfirmedPopup] = useState<{
    startIso: string;
    serviceName?: string;
  } | null>(() => {
    const state = location.state as BookingConfirmedLocationState | null;
    const payload = state?.bookingConfirmed;
    return payload?.startIso ? payload : null;
  });
  const openReview = searchParams.get("openReview") === "1";
  const rawReturnTo = searchParams.get("returnTo")?.trim() ?? "";
  const returnTo = rawReturnTo.startsWith("/account/") ? rawReturnTo : null;

  const q = useQuery({
    queryKey: ["me", "appointments", "one", id, isSalonTitolare ? "salon" : isSalonStaff ? "staff" : "consumer"],
    queryFn: () => {
      const url = salonApiBase
        ? `${salonApiBase}/${id}`
        : `/api/v1/me/appointments/${id}`;
      return apiJson<AppointmentDto>(url, { accessToken });
    },
    enabled: Boolean(id && accessToken && (salonSide ? salonApiBase : true)),
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
    setPendingConfirm(null);
    setReviewRating(5);
    setReviewComment("");
    setReviewErr(null);
    setReviewDone(false);
    setReviewReturning(false);
  }, [id]);

  useEffect(() => {
    if (!openReview) return;
    if (!a || a.status !== "COMPLETED" || salonSide) return;
    const t = window.setTimeout(() => {
      reviewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [openReview, a, salonSide]);

  useEffect(() => {
    const state = location.state as BookingConfirmedLocationState | null;
    if (!state?.bookingConfirmed) return;
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);

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

  const runConsumerCancel = async () => {
    if (!id || !accessToken || !a || !a.canConsumerCancel) return;
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      await apiJson(`/api/v1/me/appointments/${id}/cancel`, {
        method: "POST",
        accessToken,
      });
      setPendingConfirm(null);
      await reload();
      await q.refetch();
      setOkMsg("Prenotazione annullata con successo.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Annullamento fallito");
    } finally {
      setBusy(false);
    }
  };

  const runSalonCancel = async () => {
    if (!id || !accessToken || !a || !canSalonCancel(a.status) || !salonApiBase) return;
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      await apiJson(`${salonApiBase}/${id}/cancel`, {
        method: "POST",
        accessToken,
      });
      setPendingConfirm(null);
      await qc.invalidateQueries({ queryKey: ["me", "salon", "agenda"] });
      await q.refetch();
      setOkMsg("Prenotazione annullata con successo.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Annullamento fallito");
    } finally {
      setBusy(false);
    }
  };

  const onConfirmSalon = async () => {
    if (!id || !accessToken || !a || a.status !== "BOOKED" || !salonApiBase) return;
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      await apiJson(`${salonApiBase}/${id}/confirm`, {
        method: "POST",
        accessToken,
      });
      await qc.invalidateQueries({ queryKey: ["me", "salon", "agenda"] });
      await qc.invalidateQueries({ queryKey: ["me", "salon", "notifications"] });
      await q.refetch();
      setOkMsg("Prenotazione confermata. Il cliente riceverà una notifica.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Conferma non riuscita");
    } finally {
      setBusy(false);
    }
  };

  const runSalonReject = async () => {
    if (!id || !accessToken || !a || a.status !== "BOOKED" || !salonApiBase) return;
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      await apiJson(`${salonApiBase}/${id}/reject`, {
        method: "POST",
        accessToken,
      });
      setPendingConfirm(null);
      await qc.invalidateQueries({ queryKey: ["me", "salon", "agenda"] });
      await qc.invalidateQueries({ queryKey: ["me", "salon", "notifications"] });
      await q.refetch();
      setOkMsg("Richiesta rifiutata. Il cliente riceverà una notifica.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Rifiuto non riuscito");
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
      setOkMsg("Orario aggiornato. In attesa di conferma dal salone.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Riprogrammazione fallita");
    } finally {
      setBusy(false);
    }
  };

  const onRescheduleSalon = async () => {
    if (!id || !accessToken || !selectedSlot || !a || !canSalonCancel(a.status) || !salonApiBase) return;
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      await apiJson(`${salonApiBase}/${id}/reschedule`, {
        method: "POST",
        accessToken,
        body: JSON.stringify({ newStart: selectedSlot }),
      });
      setSlots([]);
      setSelectedSlot(null);
      await qc.invalidateQueries({ queryKey: ["me", "salon", "agenda"] });
      await qc.invalidateQueries({ queryKey: ["me", "staff", "agenda"] });
      await q.refetch();
      setOkMsg("Appuntamento modificato con successo.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Riprogrammazione fallita");
    } finally {
      setBusy(false);
    }
  };

  const loadSlotsSalon = async () => {
    if (!id || !accessToken || !a || !canSalonCancel(a.status) || !salonApiBase) return;
    const { from, to } = localDayBounds();
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    setErr(null);
    try {
      const list = await apiJson<string[]>(
        `${salonApiBase}/${id}/reschedule/slots?from=${from}&to=${to}`,
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
    if (!salonSide) {
      return (
        <main
          className={`luxury-page-main luxury-consumer-agenda luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-appointment-detail-page luxury-appointment-detail-page--consumer ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`}
        >
          <div className="luxury-consumer-bookings-dash__shell">
            <p className="luxury-text-muted">Caricamento…</p>
          </div>
        </main>
      );
    }
    return (
      <div className="luxury-appointment-detail-page">
        <p className="luxury-text-muted">Caricamento…</p>
      </div>
    );
  }
  if (q.error || !a) {
    if (!salonSide) {
      return (
        <main
          className={`luxury-page-main luxury-consumer-agenda luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-appointment-detail-page luxury-appointment-detail-page--consumer ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`}
        >
          <div className="luxury-consumer-bookings-dash__shell">
            <p className="luxury-alert luxury-alert--error" role="alert">
              {q.error instanceof Error ? q.error.message : "Appuntamento non trovato"}
            </p>
            <Link to={agendaListPath} className="luxury-consumer-agenda__manage-link luxury-appointment-detail-page__back">
              ← Prenotazioni
            </Link>
          </div>
        </main>
      );
    }
    return (
      <div className="luxury-appointment-detail-page">
        <p className="luxury-alert luxury-alert--error" role="alert">
          {q.error instanceof Error ? q.error.message : "Appuntamento non trovato"}
        </p>
        <Link to={agendaListPath} className="luxury-link-back">
          ← Torna all&apos;elenco
        </Link>
      </div>
    );
  }

  const isConfirmedConsumerAppointment = a.status === "CONFIRMED" && !salonSide;
  const isPendingConsumerAppointment = a.status === "BOOKED" && !salonSide;
  const pendingSalonDecision = a.status === "BOOKED" && salonSide;
  const hasSelfService = a.canConsumerCancel || a.canConsumerReschedule;
  const deadlineFmt = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" });
  const appointmentWhenLabel = new Date(a.start).toLocaleString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const confirmModalProps =
    pendingConfirm === "consumer-cancel"
      ? {
          eyebrow: "Prenotazione",
          title: "Annullare questa prenotazione?",
          detail: a.serviceName,
          hint: `${appointmentWhenLabel} · ${a.locationName}. L'annullamento è definitivo e il salone riceverà una notifica.`,
          confirmLabel: "Sì, annulla",
          onConfirm: () => void runConsumerCancel(),
        }
      : pendingConfirm === "salon-cancel"
        ? {
            eyebrow: "Appuntamento",
            title: "Annullare questa prenotazione?",
            detail: a.serviceName,
            hint: `${appointmentWhenLabel}. Il cliente riceverà una notifica di annullamento.`,
            confirmLabel: "Sì, annulla",
            onConfirm: () => void runSalonCancel(),
          }
        : pendingConfirm === "salon-reject"
          ? {
              eyebrow: "Richiesta cliente",
              title: "Rifiutare questa richiesta?",
              detail: a.serviceName,
              hint: `${appointmentWhenLabel}. Il cliente riceverà una notifica di rifiuto.`,
              confirmLabel: "Sì, rifiuta",
              onConfirm: () => void runSalonReject(),
            }
          : null;

  const modals = (
    <>
      {confirmModalProps ? (
        <BookingActionConfirmModal
          open
          busy={busy}
          cancelLabel="Indietro"
          onCancel={() => {
            if (!busy) setPendingConfirm(null);
          }}
          {...confirmModalProps}
        />
      ) : null}
      {bookingConfirmedPopup ? (
        <BookingConfirmedModal
          startIso={bookingConfirmedPopup.startIso}
          serviceName={bookingConfirmedPopup.serviceName}
          pendingApproval
          onClose={() => setBookingConfirmedPopup(null)}
        />
      ) : null}
    </>
  );

  if (!salonSide) {
    const agendaDate = formatAgendaDate(a.start);
    const salonLabel = a.locationName?.trim() || "Salone";
    const salonSlug = a.locationSlug?.trim() || "";
    const salonLogo = a.locationLogoDataUrl?.trim() || "";
    const consumerShellClass = `luxury-page-main luxury-consumer-agenda luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-appointment-detail-page luxury-appointment-detail-page--consumer ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`;

    return (
      <main className={consumerShellClass}>
        <div className="luxury-consumer-bookings-dash__shell">
          <Link to={agendaListPath} className="luxury-consumer-agenda__manage-link luxury-appointment-detail-page__back">
            ← Prenotazioni
          </Link>

          <ClientAccountHeroHeader
            headlinePre="Prenotazione · "
            headlineAccent={a.serviceName}
            badgeSecondary="Le tue visite"
            kickerLabel="Agenda personale"
            kickerChip={
              a.status === "BOOKED"
                ? "In attesa di conferma"
                : a.status === "CONFIRMED"
                  ? "Visita confermata"
                  : appointmentStatusLabel(a.status)
            }
            subtitle={
              a.status === "BOOKED" ? (
                <>
                  In attesa di conferma dal salone. Riceverai una notifica quando la richiesta sarà{" "}
                  <em>accettata o rifiutata</em>.
                </>
              ) : (
                <>
                  Dettaglio della tua visita: <strong>orario</strong>, sede e stato.
                </>
              )
            }
            metaItems={[
              { icon: INFO_PRIVACY_HERO_ICONS.calendar, label: agendaDate.full },
              { icon: INFO_PRIVACY_HERO_ICONS.clock, label: appointmentStatusLabel(a.status) },
            ]}
          />

          <ClientAccountContentCard ariaLabel="Dettaglio prenotazione cliente" title="Riepilogo visita">
            <div className="luxury-consumer-agenda__item luxury-appointment-detail-page__agenda-item">
              {salonLogo ? (
                <div
                  className="luxury-consumer-agenda__salon-logo luxury-feedback-client-page__history-logo luxury-feedback-client-page__history-logo--logo"
                  aria-hidden
                >
                  <img src={salonLogo} alt="" />
                </div>
              ) : salonSlug ? (
                <SearchHitLogoAvatar
                  slug={salonSlug}
                  name={salonLabel}
                  avatarClass="luxury-consumer-agenda__salon-logo luxury-feedback-client-page__history-logo"
                  logoExtraClass="luxury-feedback-client-page__history-logo--logo"
                />
              ) : (
                <div className="luxury-consumer-agenda__salon-logo luxury-feedback-client-page__history-logo" aria-hidden>
                  {searchHitInitials(salonLabel)}
                </div>
              )}
              <div className="luxury-consumer-agenda__content">
                <p className="luxury-consumer-agenda__meta">
                  <span className="luxury-consumer-agenda__when" aria-label={agendaDate.full}>
                    <span className="luxury-consumer-agenda__when-weekday">{agendaDate.weekday}</span>
                    <span className="luxury-consumer-agenda__when-day">{agendaDate.day}</span>
                    <span className="luxury-consumer-agenda__when-month">{agendaDate.month}</span>
                    <span className="luxury-consumer-agenda__when-sep" aria-hidden>
                      ·
                    </span>
                    <span className="luxury-consumer-agenda__when-time">{agendaDate.time}</span>
                  </span>
                  <span className={`luxury-consumer-agenda__status luxury-consumer-agenda__status--${a.status.toLowerCase()}`}>
                    {appointmentStatusLabel(a.status)}
                  </span>
                </p>
                <p className="luxury-consumer-agenda__title luxury-consumer-agenda__title--static">{a.serviceName}</p>
                <p className="luxury-consumer-agenda__desc">
                  {salonLabel} · {formatPriceEUR(a.priceCents)} · {a.operatorName}
                </p>

                {isConfirmedConsumerAppointment && hasSelfService ? (
                  <div className="luxury-consumer-agenda__actions luxury-appointment-detail-page__consumer-actions">
                    {a.canConsumerCancel ? (
                      <button
                        type="button"
                        className="luxury-consumer-agenda__manage-link luxury-consumer-agenda__manage-link--danger"
                        onClick={() => setPendingConfirm("consumer-cancel")}
                        disabled={busy}
                      >
                        Disdici prenotazione
                      </button>
                    ) : null}
                    {!slots.length && a.canConsumerReschedule ? (
                      <button
                        type="button"
                        className="luxury-consumer-agenda__manage-link"
                        onClick={() => void loadSlots()}
                        disabled={busy || slotsLoading}
                      >
                        {slotsLoading ? "Carico orari…" : "Cambia orario"}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {!!slots.length && a.canConsumerReschedule ? (
                  <div className="luxury-appointment-detail-page__reschedule-block">
                    <label htmlFor="slot-me" className="luxury-form-label">
                      Scegli un nuovo orario
                    </label>
                    <select
                      id="slot-me"
                      className="luxury-soft-field"
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
                      className="luxury-consumer-agenda__manage-link"
                      onClick={() => void onReschedule()}
                      disabled={!selectedSlot || busy}
                    >
                      Conferma nuovo orario
                    </button>
                  </div>
                ) : null}

                {isConfirmedConsumerAppointment && !hasSelfService ? (
                  <p className="luxury-consumer-agenda__policy-hint">
                    La modifica e la disdetta autonoma non sono più disponibili: termine per la disdetta era il{" "}
                    {deadlineFmt.format(new Date(a.consumerCancelDeadline))}, termine per cambiare orario il{" "}
                    {deadlineFmt.format(new Date(a.consumerRescheduleDeadline))}. Per eccezioni contatta {salonLabel}.
                  </p>
                ) : null}

                {isPendingConsumerAppointment ? (
                  <p className="luxury-consumer-agenda__policy-hint">
                    La richiesta è in attesa di conferma dal salone. Per annullarla o cambiarla contatta direttamente{" "}
                    {salonLabel}.
                  </p>
                ) : null}

                {!isConfirmedConsumerAppointment &&
                !isPendingConsumerAppointment &&
                a.status !== "CANCELLED" &&
                a.status !== "COMPLETED" ? (
                  <p className="luxury-consumer-agenda__policy-hint">Per modifiche in questo stato contatta il salone.</p>
                ) : null}
              </div>
            </div>
          </ClientAccountContentCard>

          {err ? (
            <p className="luxury-alert luxury-alert--error" role="alert">
              {err}
            </p>
          ) : null}
          {okMsg ? (
            <p className="luxury-alert luxury-alert--success" role="status">
              {okMsg}
            </p>
          ) : null}

          {a.status === "COMPLETED" && accessToken ? (
            <ClientAccountContentCard ariaLabel="Recensione visita" title="La tua recensione">
              <div ref={reviewSectionRef}>
                <p className="luxury-text-muted" style={{ margin: "0 0 1rem", fontSize: "0.92rem" }}>
                  Puoi usare anche il link che ricevi via email dopo la visita: qui è lo stesso flusso, con il tuo account.
                </p>
                {reviewErr ? (
                  <p className="luxury-alert luxury-alert--error" role="alert">
                    {reviewErr}
                  </p>
                ) : null}
                {reviewDone ? (
                  <p className="luxury-alert luxury-alert--success" role="status">
                    {reviewReturning
                      ? "Grazie, recensione registrata. Ritorno alle recensioni..."
                      : "Grazie, recensione registrata."}
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
                    <label className="luxury-form-label" style={{ marginTop: "0.85rem" }}>
                      Commento (opzionale)
                      <textarea
                        className="luxury-soft-field"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        rows={4}
                      />
                    </label>
                    <button
                      type="submit"
                      className="luxury-consumer-agenda__manage-link"
                      disabled={reviewBusy}
                      style={{ marginTop: "1rem" }}
                    >
                      {reviewBusy ? "Invio…" : "Invia recensione"}
                    </button>
                  </form>
                )}
              </div>
            </ClientAccountContentCard>
          ) : null}
        </div>
        {modals}
      </main>
    );
  }

  return (
    <div className="luxury-appointment-detail-page">
      <Link to={agendaListPath} className="luxury-link-back luxury-link-back--overlay-nav">
        <span className="luxury-link-back__chevron" aria-hidden="true">
          ←
        </span>
        <span className="luxury-link-back__text">Agenda</span>
      </Link>
      <header className="luxury-appointment-detail-page__hero">
        <div className="luxury-appointment-detail-page__hero-glow" aria-hidden />
        <div className="luxury-appointment-detail-page__hero-inner">
          <h1 className="luxury-appointment-detail-page__headline">
            <span className="luxury-appointment-detail-page__headline-pre">Appuntamento · </span>
            <span className="luxury-appointment-detail-page__headline-accent">{a.serviceName}</span>
          </h1>
          <p className="luxury-appointment-detail-page__hero-sub">
            {pendingSalonDecision
              ? "Richiesta cliente in attesa: accetta o rifiuta la prenotazione."
              : isSalonStaff
                ? "Dettaglio prenotazione: sposta l'orario o annulla se non puoi essere presente."
                : "Dettaglio prenotazione: modifica orario o annulla come salone."}
          </p>
        </div>
      </header>

      <section className="luxury-surface-card luxury-appointment-detail-page__summary">
        <div className="luxury-appointment-detail-page__summary-glow" aria-hidden />
        <div className="luxury-appointment-detail-page__summary-body">
          <p className="luxury-appointment-detail-page__location">{a.locationName}</p>
          <p className="luxury-appointment-detail-page__meta">
            {formatPriceEUR(a.priceCents)} · {a.operatorName}
          </p>
          <p className="luxury-appointment-detail-page__when">
            {new Date(a.start).toLocaleString("it-IT", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <div className="luxury-appointment-detail-page__status-row">
            <span className="luxury-appointment-detail-page__status-label">Stato</span>
            <span className="luxury-appointment-detail-page__status" data-appt-status={a.status}>
              {appointmentStatusLabel(a.status)}
            </span>
          </div>
        </div>
      </section>

      {err && (
        <p className="luxury-alert luxury-alert--error" role="alert">
          {err}
        </p>
      )}
      {okMsg && (
        <p className="luxury-alert luxury-alert--success" role="status">
          {okMsg}
        </p>
      )}

      {pendingSalonDecision ? (
        <div className="luxury-btn-row luxury-appointment-detail-page__actions">
          <button type="button" className="luxury-btn luxury-btn--primary" onClick={() => void onConfirmSalon()} disabled={busy}>
            Accetta prenotazione
          </button>
          <button
            type="button"
            className="luxury-btn luxury-btn--secondary"
            onClick={() => setPendingConfirm("salon-reject")}
            disabled={busy}
          >
            Rifiuta
          </button>
        </div>
      ) : null}

      {!pendingSalonDecision ? (
        <div className="luxury-btn-row luxury-appointment-detail-page__actions">
          {!slots.length && canSalonCancel(a.status) && salonApiBase ? (
            <button
              type="button"
              className="luxury-btn luxury-btn--primary"
              onClick={() => void loadSlotsSalon()}
              disabled={busy || slotsLoading}
            >
              {slotsLoading ? "Carico orari…" : isSalonStaff ? "Sposta appuntamento" : "Modifica appuntamento"}
            </button>
          ) : null}
          {canSalonCancel(a.status) ? (
            <button
              type="button"
              className="luxury-btn luxury-btn--secondary"
              onClick={() => setPendingConfirm("salon-cancel")}
              disabled={busy}
            >
              Annulla appuntamento
            </button>
          ) : null}
          {!!slots.length && canSalonCancel(a.status) ? (
            <div className="luxury-appointment-detail-page__reschedule-block">
              <label htmlFor="slot-salon" className="luxury-form-label">
                Scegli un nuovo orario
              </label>
              <select
                id="slot-salon"
                className="luxury-soft-field"
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
                className="luxury-btn luxury-btn--primary"
                onClick={() => void onRescheduleSalon()}
                disabled={!selectedSlot || busy}
              >
                Conferma modifica appuntamento
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {modals}
    </div>
  );
}
