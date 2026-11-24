import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { apiJson } from "../api/client";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { STAFF_MEMBER_AGENDA_PATH } from "../lib/staffMemberAgendaPath";
import {
  emitInAppSound,
  endInAppUrgentSession,
  isInAppSoundWarm,
  isInAppUrgentSessionActive,
} from "../lib/luxuryInAppSoundBus";
import {
  appointmentAlertBannerForType,
  consumePendingNotificationPopup,
  humanizeNotificationType,
  isAppointmentAlertType,
  isCancellationAlertType,
  isConfirmationAlertType,
  registerLuxuryNotificationPopupListener,
  shouldPlayNotificationChime,
  shouldPlayOperatorAlertSound,
  type LuxuryNotificationPopupPayload,
} from "../lib/luxuryNotificationPopup";
import {
  clearAllSalonAlertPopupsActive,
  clearSalonAlertPopupActive,
  markSalonAlertNotificationSeen,
  markSalonAlertPopupActive,
  snoozeSalonAlertNotification,
} from "../lib/luxuryNotificationAlertUtils";
import "../styles/salon-notifications.css";
import "../styles/luxury-notif-popup-appointment.css";

function isAppointmentAlreadyHandledError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.trim();
  return msg.includes("Solo le richieste in attesa") || msg.includes("APPOINTMENT_NOT_PENDING");
}

function formatSentAt(sentAt: string | null | undefined): string | null {
  if (!sentAt) return null;
  const d = new Date(sentAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("it-IT");
}

function resolveDeleteUrl(payload: LuxuryNotificationPopupPayload, salonSide: boolean): string | null {
  if (!payload.id?.trim()) return null;
  const id = encodeURIComponent(payload.id.trim());
  return salonSide
    ? `/api/v1/me/salon/notifications/messages/${id}`
    : `/api/v1/me/notifications/messages/${id}`;
}

function isConsumerReschedulePayload(payload: LuxuryNotificationPopupPayload): boolean {
  return payload.notificationType === "BOOKING_RESCHEDULED_BY_CONSUMER";
}

function formatAppointmentWhen(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RescheduleCompareBlock({ payload }: { payload: LuxuryNotificationPopupPayload }) {
  const previousWhen = formatAppointmentWhen(payload.previousAppointmentStart);
  const newWhen = formatAppointmentWhen(payload.appointmentStart);
  const serviceName = payload.serviceName?.trim();
  const operatorName = payload.operatorName?.trim();
  const clientName = payload.clientName?.trim();

  if (!previousWhen && !newWhen) return null;

  return (
    <div className="luxury-notif-popup__reschedule-compare" role="group" aria-label="Confronto orari appuntamento">
      {clientName ? (
        <p className="luxury-notif-popup__reschedule-client">
          Cliente <strong>{clientName}</strong>
        </p>
      ) : null}
      <div className="luxury-notif-popup__reschedule-grid">
        {previousWhen ? (
          <div className="luxury-notif-popup__reschedule-slot luxury-notif-popup__reschedule-slot--previous">
            <span className="luxury-notif-popup__reschedule-slot-label">Orario precedente</span>
            <span className="luxury-notif-popup__reschedule-slot-when">{previousWhen}</span>
            {serviceName ? (
              <span className="luxury-notif-popup__reschedule-slot-detail">{serviceName}</span>
            ) : null}
            {operatorName ? (
              <span className="luxury-notif-popup__reschedule-slot-detail">Operatore: {operatorName}</span>
            ) : null}
          </div>
        ) : null}
        {previousWhen && newWhen ? (
          <div className="luxury-notif-popup__reschedule-arrow" aria-hidden>
            →
          </div>
        ) : null}
        {newWhen ? (
          <div className="luxury-notif-popup__reschedule-slot luxury-notif-popup__reschedule-slot--new">
            <span className="luxury-notif-popup__reschedule-slot-label">Nuovo orario</span>
            <span className="luxury-notif-popup__reschedule-slot-when">{newWhen}</span>
            {serviceName ? (
              <span className="luxury-notif-popup__reschedule-slot-detail">{serviceName}</span>
            ) : null}
            {operatorName ? (
              <span className="luxury-notif-popup__reschedule-slot-detail">Operatore: {operatorName}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      {!previousWhen && newWhen ? (
        <p className="luxury-notif-popup__reschedule-fallback">
          L&apos;orario precedente non è disponibile per questa notifica.
        </p>
      ) : null}
    </div>
  );
}

function hasUserActivationForSound(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = (navigator as Navigator & { userActivation?: { isActive?: boolean; hasBeenActive?: boolean } })
    .userActivation;
  return Boolean(ua?.isActive || ua?.hasBeenActive);
}

export function LuxuryNotificationPopupHost() {
  const titleId = useId();
  const acceptBtnRef = useRef<HTMLButtonElement>(null);
  const respondInFlightRef = useRef(false);
  const payloadRef = useRef<LuxuryNotificationPopupPayload | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken, isSalonTitolare, isSalonStaff } = useLuxuryAuth();
  const salonSide = isSalonTitolare || isSalonStaff;
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<LuxuryNotificationPopupPayload | null>(null);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [respondSuccess, setRespondSuccess] = useState<"confirm" | "reject" | "stale" | null>(null);

  const resetInteractiveState = useCallback(() => {
    setRejectConfirmOpen(false);
    setRespondSuccess(null);
  }, []);

  const close = useCallback(() => {
    const current = payloadRef.current;
    const handled = respondSuccess !== null;
    if (current?.id) {
      clearSalonAlertPopupActive(current.id);
      if (handled) {
        markSalonAlertNotificationSeen(current.id);
      } else if (shouldPlayOperatorAlertSound(current)) {
        snoozeSalonAlertNotification(current.id);
      } else {
        markSalonAlertNotificationSeen(current.id);
      }
    }
    respondInFlightRef.current = false;
    endInAppUrgentSession();
    setOpen(false);
    setPayload(null);
    payloadRef.current = null;
    resetInteractiveState();
  }, [resetInteractiveState, respondSuccess]);

  const show = useCallback((next: LuxuryNotificationPopupPayload) => {
    if (respondInFlightRef.current) return;
    if (next.id) markSalonAlertPopupActive(next.id);
    resetInteractiveState();
    payloadRef.current = next;
    setPayload(next);
    setOpen(true);

    if (shouldPlayOperatorAlertSound(next)) {
      emitInAppSound({
        kind: "urgent-start",
        forcePrime: isInAppSoundWarm() || hasUserActivationForSound(),
      });
      return;
    }

    if (shouldPlayNotificationChime(next)) {
      emitInAppSound({
        kind: "chime",
        source: "popup",
        dedupeKey: next.id ? `popup-notif:${next.id}` : undefined,
      });
    }
  }, [resetInteractiveState]);

  const deleteM = useMutation({
    mutationFn: async (messageId: string) => {
      if (!accessToken) throw new Error("Sessione scaduta");
      const targetPayload = payload;
      if (!targetPayload) throw new Error("Notifica non disponibile");
      const url = resolveDeleteUrl({ ...targetPayload, id: messageId }, salonSide);
      if (!url) throw new Error("Impossibile eliminare questa notifica");
      await apiJson<void>(url, { method: "DELETE", accessToken });
    },
    onSuccess: () => {
      markSalonAlertNotificationSeen(payload?.id);
      if (salonSide) {
        void queryClient.invalidateQueries({ queryKey: ["me", "salon", "notifications"] });
        void queryClient.invalidateQueries({ queryKey: ["me", "salon", "notifications", "messages"] });
      } else {
        void queryClient.invalidateQueries({ queryKey: ["me", "notifications"] });
        void queryClient.invalidateQueries({ queryKey: ["me", "notifications", "messages"] });
      }
      close();
    },
  });

  const respondM = useMutation({
    mutationFn: async (action: "confirm" | "reject") => {
      if (!accessToken || !payload?.appointmentId?.trim()) {
        throw new Error("Prenotazione non disponibile");
      }
      const appointmentId = encodeURIComponent(payload.appointmentId.trim());
      const base =
        isSalonStaff && !isSalonTitolare
          ? "/api/v1/me/staff/appointments"
          : "/api/v1/me/salon/appointments";
      const suffix = action === "confirm" ? "confirm" : "reject";
      await apiJson<void>(`${base}/${appointmentId}/${suffix}`, {
        method: "POST",
        accessToken,
      });
      return action;
    },
    onMutate: () => {
      respondInFlightRef.current = true;
      endInAppUrgentSession();
    },
    onSuccess: (action) => {
      markSalonAlertNotificationSeen(payloadRef.current?.id);
      void queryClient.invalidateQueries({ queryKey: ["me", "salon", "agenda"] });
      void queryClient.invalidateQueries({ queryKey: ["me", "staff", "agenda"] });
      void queryClient.invalidateQueries({ queryKey: ["me", "appointments"] });
      void queryClient.invalidateQueries({ queryKey: ["me", "salon", "notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["me", "salon", "notifications", "messages"] });
      void queryClient.invalidateQueries({
        queryKey: ["me", "salon", "notifications", "messages", "salon-alerts"],
      });
      respondInFlightRef.current = false;
      setRespondSuccess(action);
      endInAppUrgentSession();
    },
    onError: (error) => {
      endInAppUrgentSession();
      if (isAppointmentAlreadyHandledError(error)) {
        markSalonAlertNotificationSeen(payloadRef.current?.id);
        respondInFlightRef.current = false;
        setRespondSuccess("stale");
        return;
      }
      respondInFlightRef.current = false;
    },
  });

  useEffect(() => {
    registerLuxuryNotificationPopupListener(show);
    const pending = consumePendingNotificationPopup();
    if (pending) show(pending);

    return () => {
      registerLuxuryNotificationPopupListener(null);
      // Remount Host (Strict Mode / HMR / auth): senza clear, gli ID restano «attivi» e
      // useSalonBookingRequestAlerts non ripropone più Accetta/Rifiuta.
      const currentId = payloadRef.current?.id;
      if (currentId) clearSalonAlertPopupActive(currentId);
      else clearAllSalonAlertPopupsActive();
    };
  }, [show]);

  useEffect(() => {
    if (!open || !payload) return;
    if (!payload.canRespond || !payload.appointmentId) return;
    const focusTimer = window.setTimeout(() => acceptBtnRef.current?.focus(), 80);
    return () => window.clearTimeout(focusTimer);
  }, [open, payload]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!payload) return;
      const canRespond =
        Boolean(payload.canRespond && payload.appointmentId?.trim() && accessToken) &&
        !respondM.isPending &&
        !respondSuccess;

      if (event.key === "Escape") {
        if (rejectConfirmOpen) {
          event.preventDefault();
          setRejectConfirmOpen(false);
          return;
        }
        close();
        return;
      }

      if (!canRespond || rejectConfirmOpen) {
        if (rejectConfirmOpen && event.key === "Enter") {
          event.preventDefault();
          respondM.mutate("reject");
        }
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "a" || (key === "enter" && !event.shiftKey)) {
        event.preventDefault();
        respondM.mutate("confirm");
      } else if (key === "r") {
        event.preventDefault();
        setRejectConfirmOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    accessToken,
    close,
    open,
    payload,
    rejectConfirmOpen,
    respondM,
    respondSuccess,
    salonSide,
  ]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow || "";
    };
  }, [open]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      endInAppUrgentSession();
    };
  }, []);

  if (!open || !payload) return null;

  const sentLabel = formatSentAt(payload.sentAt);
  const typeLabel = payload.notificationType ? humanizeNotificationType(payload.notificationType) : null;
  const appointmentHref = payload.appointmentId
    ? `/account/prenotazioni/${encodeURIComponent(payload.appointmentId)}`
    : null;
  const isReviewInvite = payload.notificationType === "REVIEW_INVITE";
  const reviewsHref = isReviewInvite
    ? payload.appointmentId
      ? `/account/feedback-luxury?invite=${encodeURIComponent(payload.appointmentId)}`
      : "/account/feedback-luxury"
    : null;
  const canDelete = Boolean(payload.id?.trim() && accessToken);
  const isBookingRequest = Boolean(payload.canRespond);
  const isSalonUrgentPopup = Boolean(payload.urgent);
  const isConsumerReschedule = isConsumerReschedulePayload(payload);
  const isAppointmentAlert = isAppointmentAlertType(payload.notificationType);
  const isCancellationAlert = isCancellationAlertType(payload.notificationType);
  const isConfirmationAlert = isConfirmationAlertType(payload.notificationType);
  const isSalonBookingRequest = isBookingRequest;
  const canRespondToBookingRequest = Boolean(
    payload.canRespond && payload.appointmentId?.trim() && accessToken,
  );

  const salonAgendaHref = isSalonStaff && !isSalonTitolare ? STAFF_MEMBER_AGENDA_PATH : "/account/prenotazioni";
  const popupRootClass =
    isSalonBookingRequest
      ? " luxury-notif-popup-root--urgent"
      : isSalonUrgentPopup && isCancellationAlert
        ? " luxury-notif-popup-root--appointment-cancelled luxury-notif-popup-root--urgent-info"
        : isAppointmentAlert
        ? isCancellationAlert
          ? " luxury-notif-popup-root--appointment-cancelled"
          : isConfirmationAlert
            ? " luxury-notif-popup-root--appointment-confirmed"
            : " luxury-notif-popup-root--appointment-alert"
        : "";
  const popupClass =
    isSalonBookingRequest
      ? " luxury-notif-popup--booking-request"
      : isSalonUrgentPopup && isCancellationAlert
        ? " luxury-notif-popup--appointment-alert luxury-notif-popup--appointment-alert--cancelled luxury-notif-popup--urgent-info"
        : isAppointmentAlert
        ? " luxury-notif-popup--appointment-alert"
          + (isCancellationAlert ? " luxury-notif-popup--appointment-alert--cancelled" : "")
          + (isConfirmationAlert ? " luxury-notif-popup--appointment-alert--confirmed" : "")
        : "";
  const bannerClass =
    "luxury-notif-popup__urgent-banner"
    + (isCancellationAlert ? " luxury-notif-popup__urgent-banner--cancelled" : "")
    + (isConfirmationAlert ? " luxury-notif-popup__urgent-banner--confirmed" : "")
    + (!isSalonBookingRequest && isAppointmentAlert && !isCancellationAlert && !isConfirmationAlert
      ? " luxury-notif-popup__urgent-banner--info"
      : "");

  const modal = (
    <div
      className={"luxury-notif-popup-root" + popupRootClass}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !respondM.isPending) close();
      }}
    >
      <div
        className={"luxury-notif-popup" + popupClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-live={isAppointmentAlert ? "assertive" : undefined}
        onPointerDownCapture={() => {
          if (respondSuccess || respondM.isPending) return;
          if (!isInAppUrgentSessionActive() || !shouldPlayOperatorAlertSound(payload)) return;
          emitInAppSound({ kind: "urgent-prime", force: true });
        }}
      >
        {isAppointmentAlert ? (
          <div className={bannerClass} aria-hidden>
            {isSalonBookingRequest ? <span className="luxury-notif-popup__urgent-pulse" /> : null}
            <span className={"luxury-notif-popup__urgent-icon" + (isSalonBookingRequest ? "" : " luxury-notif-popup__urgent-icon--static")}>
              {isCancellationAlert ? "✕" : "🔔"}
            </span>
            <span className="luxury-notif-popup__urgent-label">
              {appointmentAlertBannerForType(payload.notificationType, salonSide, {
                canRespond: payload.canRespond,
              })}
            </span>
          </div>
        ) : null}

        <div className="luxury-notif-popup__hero" aria-hidden>
          <div className="luxury-notif-popup__hero-glow" />
        </div>

        <div className="luxury-notif-popup__head">
          <div className="luxury-notif-popup__head-main">
            <p className="luxury-notif-popup__kicker">
              {isAppointmentAlert ? "Avviso appuntamento" : "Notifica"}
            </p>
            <h2 id={titleId} className="luxury-notif-popup__title">
              {payload.title}
            </h2>
            <div className="luxury-notif-popup__chips" aria-label="Dettagli rapidi">
              {typeLabel ? (
                <span className="luxury-notif-popup__chip luxury-notif-popup__chip--type">{typeLabel}</span>
              ) : null}
              {canRespondToBookingRequest ? (
                <span className="luxury-notif-popup__chip luxury-notif-popup__chip--action-hint">
                  Invio · Accetta
                </span>
              ) : isCancellationAlert && salonSide ? (
                <span className="luxury-notif-popup__chip luxury-notif-popup__chip--action-hint">
                  Apri agenda
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="luxury-notif-popup__close"
            aria-label="Chiudi notifica"
            disabled={respondM.isPending}
            onClick={close}
          >
            ×
          </button>
        </div>

        {respondSuccess ? (
          <>
            <div
              className={
                "luxury-notif-popup__success luxury-notif-popup__success--" + respondSuccess
              }
              role="status"
            >
              <span className="luxury-notif-popup__success-icon" aria-hidden>
                {respondSuccess === "confirm" ? "✓" : respondSuccess === "reject" ? "✕" : "ℹ"}
              </span>
              <p className="luxury-notif-popup__success-text">
                {respondSuccess === "stale"
                  ? "Questa richiesta non è più in attesa — è già stata gestita."
                  : respondSuccess === "confirm"
                  ? isConsumerReschedule
                    ? "Nuovo orario confermato. Il cliente riceverà la notifica."
                    : "Prenotazione confermata. Il cliente riceverà la notifica."
                  : isConsumerReschedule
                    ? "Cambio orario rifiutato. Il cliente è stato avvisato."
                    : "Richiesta rifiutata. Il cliente è stato avvisato."}
              </p>
            </div>
            <div className="luxury-notif-popup__footer luxury-notif-popup__footer--success">
              <span aria-hidden />
              <div className="luxury-notif-popup__actions">
                <button
                  type="button"
                  className="luxury-notif-popup__btn luxury-notif-popup__btn--primary"
                  onClick={() => {
                    close();
                    navigate(salonAgendaHref);
                  }}
                >
                  Apri agenda
                </button>
                {appointmentHref ? (
                  <button
                    type="button"
                    className="luxury-notif-popup__btn luxury-notif-popup__btn--secondary"
                    onClick={() => {
                      close();
                      navigate(appointmentHref);
                    }}
                  >
                    Apri dettaglio
                  </button>
                ) : null}
                <button
                  type="button"
                  className="luxury-notif-popup__btn luxury-notif-popup__btn--secondary"
                  onClick={close}
                >
                  Chiudi
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {canRespondToBookingRequest && isConsumerReschedule ? (
              <RescheduleCompareBlock payload={payload} />
            ) : null}
            {canRespondToBookingRequest ? (
              <div className="luxury-notif-popup__quick-actions">
                {rejectConfirmOpen ? (
                  <div className="luxury-notif-popup__reject-confirm" role="group" aria-label="Conferma rifiuto">
                    <p className="luxury-notif-popup__reject-confirm-text">
                      {isConsumerReschedule
                        ? <>Rifiutare il cambio orario di <strong>{payload.clientName?.trim() || "questo cliente"}</strong>?</>
                        : <>Rifiutare la richiesta di <strong>{payload.clientName?.trim() || "questo cliente"}</strong>?</>}
                    </p>
                    <div className="luxury-notif-popup__reject-confirm-actions">
                      <button
                        type="button"
                        className="luxury-notif-popup__cta luxury-notif-popup__cta--danger"
                        disabled={respondM.isPending}
                        onClick={() => respondM.mutate("reject")}
                      >
                        {respondM.isPending ? "Invio…" : "Sì, rifiuta"}
                      </button>
                      <button
                        type="button"
                        className="luxury-notif-popup__cta luxury-notif-popup__cta--ghost"
                        disabled={respondM.isPending}
                        onClick={() => setRejectConfirmOpen(false)}
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      ref={acceptBtnRef}
                      type="button"
                      className="luxury-notif-popup__cta luxury-notif-popup__cta--accept"
                      disabled={respondM.isPending}
                      onClick={() => respondM.mutate("confirm")}
                    >
                      <span className="luxury-notif-popup__cta-icon" aria-hidden>
                        ✓
                      </span>
                      <span className="luxury-notif-popup__cta-label">
                        {respondM.isPending
                          ? "Conferma in corso…"
                          : isConsumerReschedule
                            ? "Conferma nuovo orario"
                            : "Accetta prenotazione"}
                      </span>
                      <span className="luxury-notif-popup__cta-hint">Invio</span>
                    </button>
                    <button
                      type="button"
                      className="luxury-notif-popup__cta luxury-notif-popup__cta--reject"
                      disabled={respondM.isPending}
                      onClick={() => setRejectConfirmOpen(true)}
                    >
                      <span className="luxury-notif-popup__cta-icon" aria-hidden>
                        ✕
                      </span>
                      <span className="luxury-notif-popup__cta-label">Rifiuta</span>
                      <span className="luxury-notif-popup__cta-hint">R</span>
                    </button>
                  </>
                )}
              </div>
            ) : null}

            <div className="luxury-notif-popup__body">
              <div className="luxury-notif-popup__message-card">
                <span className="luxury-notif-popup__message-label">
                  {isAppointmentAlert ? "Dettaglio" : "Messaggio"}
                </span>
                <p className="luxury-notif-popup__text">{payload.body}</p>
              </div>
            </div>

            {payload.clientName?.trim() || sentLabel ? (
              <dl className="luxury-notif-popup__meta">
                {payload.clientName?.trim() ? (
                  <div className="luxury-notif-popup__meta-row luxury-notif-popup__meta-row--highlight">
                    <dt>{salonSide ? "Cliente" : "Salone"}</dt>
                    <dd>{payload.clientName.trim()}</dd>
                  </div>
                ) : null}
                {sentLabel ? (
                  <div className="luxury-notif-popup__meta-row">
                    <dt>Data invio</dt>
                    <dd>{sentLabel}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            <div className="luxury-notif-popup__footer">
              {canDelete && !canRespondToBookingRequest ? (
                <button
                  type="button"
                  className="luxury-notif-popup__delete"
                  disabled={deleteM.isPending}
                  onClick={() => {
                    if (!payload.id) return;
                    deleteM.mutate(payload.id);
                  }}
                >
                  {deleteM.isPending ? "Eliminazione…" : "Elimina"}
                </button>
              ) : (
                <span aria-hidden />
              )}

              <div className="luxury-notif-popup__actions">
                {isCancellationAlert && salonSide ? (
                  <button
                    type="button"
                    className="luxury-notif-popup__btn luxury-notif-popup__btn--primary"
                    onClick={() => {
                      close();
                      navigate(salonAgendaHref);
                    }}
                  >
                    Apri agenda
                  </button>
                ) : null}
                {(reviewsHref || appointmentHref) &&
                !canRespondToBookingRequest &&
                !(isCancellationAlert && salonSide) ? (
                  <button
                    type="button"
                    className="luxury-notif-popup__btn luxury-notif-popup__btn--primary"
                    onClick={() => {
                      close();
                      navigate(reviewsHref ?? appointmentHref!);
                    }}
                  >
                    {isReviewInvite
                      ? "Vai a recensioni"
                      : salonSide && isAppointmentAlert
                        ? "Vai all'appuntamento"
                        : "Vai alla prenotazione"}
                  </button>
                ) : null}
                {appointmentHref && canRespondToBookingRequest ? (
                  <button
                    type="button"
                    className="luxury-notif-popup__btn luxury-notif-popup__btn--secondary"
                    onClick={() => {
                      close();
                      navigate(appointmentHref);
                    }}
                  >
                    Apri dettaglio
                  </button>
                ) : null}
                <button
                  type="button"
                  className="luxury-notif-popup__btn luxury-notif-popup__btn--secondary"
                  disabled={respondM.isPending}
                  onClick={close}
                >
                  {canRespondToBookingRequest ? "Rispondi dopo" : isAppointmentAlert ? "Chiudi avviso" : "Chiudi"}
                </button>
              </div>
            </div>
          </>
        )}

        {deleteM.isError || (respondM.isError && !respondSuccess) ? (
          <p className="luxury-notif-popup__error" role="alert">
            {deleteM.error instanceof Error
              ? deleteM.error.message
              : respondM.error instanceof Error
                ? respondM.error.message
                : "Operazione non riuscita."}
          </p>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
