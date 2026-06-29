import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { apiJson } from "../api/client";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import {
  playNotificationChime,
  primeBookingAlertSound,
  startBookingRequestAlertSound,
  stopBookingRequestAlertSound,
} from "../lib/velvetBookingAlertSound";
import {
  consumePendingNotificationPopup,
  humanizeNotificationType,
  isSalonInteractiveAlertType,
  registerVelvetNotificationPopupListener,
  salonAlertBannerForType,
  type VelvetNotificationPopupPayload,
} from "../lib/velvetNotificationPopup";
import "../styles/salon-notifications.css";

function formatSentAt(sentAt: string | null | undefined): string | null {
  if (!sentAt) return null;
  const d = new Date(sentAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("it-IT");
}

function formatStatus(status: string | undefined): { label: string; tone: "sent" | "pending" | "other" } | null {
  if (!status) return null;
  if (status === "SENT") return { label: "Inviata", tone: "sent" };
  if (status === "PENDING") return { label: "In coda", tone: "pending" };
  return { label: status, tone: "other" };
}

function resolveDeleteUrl(payload: VelvetNotificationPopupPayload, salonSide: boolean): string | null {
  if (!payload.id?.trim()) return null;
  const id = encodeURIComponent(payload.id.trim());
  return salonSide
    ? `/api/v1/me/salon/notifications/messages/${id}`
    : `/api/v1/me/notifications/messages/${id}`;
}

function isBookingRequestPayload(payload: VelvetNotificationPopupPayload): boolean {
  return payload.notificationType === "BOOKING_CREATED_FOR_SALON";
}

function isSalonAppointmentAlertPayload(payload: VelvetNotificationPopupPayload): boolean {
  return isSalonInteractiveAlertType(payload.notificationType) || payload.urgent === true;
}

export function VelvetNotificationPopupHost() {
  const titleId = useId();
  const acceptBtnRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken, isSalonTitolare, isSalonStaff } = useVelvetAuth();
  const salonSide = isSalonTitolare || isSalonStaff;
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<VelvetNotificationPopupPayload | null>(null);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [respondSuccess, setRespondSuccess] = useState<"confirm" | "reject" | null>(null);

  const resetInteractiveState = useCallback(() => {
    setRejectConfirmOpen(false);
    setRespondSuccess(null);
  }, []);

  const show = useCallback((next: VelvetNotificationPopupPayload) => {
    resetInteractiveState();
    setPayload(next);
    setOpen(true);
    if (next.playSound !== false) {
      const urgent = next.urgent === true || isSalonInteractiveAlertType(next.notificationType);
      if (urgent) {
        void startBookingRequestAlertSound();
      } else {
        void playNotificationChime();
      }
    }
  }, [resetInteractiveState]);

  const close = useCallback(() => {
    stopBookingRequestAlertSound();
    setOpen(false);
    setPayload(null);
    resetInteractiveState();
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
    onSuccess: (action) => {
      void queryClient.invalidateQueries({ queryKey: ["me", "salon", "agenda"] });
      void queryClient.invalidateQueries({ queryKey: ["me", "appointments"] });
      void queryClient.invalidateQueries({ queryKey: ["me", "salon", "notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["me", "salon", "notifications", "messages"] });
      setRespondSuccess(action);
      stopBookingRequestAlertSound();
      window.setTimeout(() => close(), 1400);
    },
  });

  useEffect(() => {
    registerVelvetNotificationPopupListener(show);
    const pending = consumePendingNotificationPopup();
    if (pending) show(pending);

    const unlockAudio = () => {
      void primeBookingAlertSound();
    };
    document.addEventListener("pointerdown", unlockAudio, { once: true, passive: true });
    document.addEventListener("keydown", unlockAudio, { once: true, passive: true });

    return () => {
      registerVelvetNotificationPopupListener(null);
      stopBookingRequestAlertSound();
      document.removeEventListener("pointerdown", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };
  }, [show]);

  useEffect(() => {
    if (!open || !payload) return;
    const bookingRequest = isBookingRequestPayload(payload) && salonSide && payload.appointmentId;
    if (!bookingRequest) return;
    const focusTimer = window.setTimeout(() => acceptBtnRef.current?.focus(), 80);
    return () => window.clearTimeout(focusTimer);
  }, [open, payload, salonSide]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!payload) return;
      const canRespond =
        salonSide &&
        isBookingRequestPayload(payload) &&
        Boolean(payload.appointmentId?.trim() && accessToken) &&
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
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || !payload) return null;

  const sentLabel = formatSentAt(payload.sentAt);
  const status = formatStatus(payload.status);
  const typeLabel = payload.notificationType ? humanizeNotificationType(payload.notificationType) : null;
  const appointmentHref = payload.appointmentId
    ? `/account/prenotazioni/${encodeURIComponent(payload.appointmentId)}`
    : null;
  const canDelete = Boolean(payload.id?.trim() && accessToken);
  const isBookingRequest = isBookingRequestPayload(payload);
  const isSalonAppointmentAlert = isSalonAppointmentAlertPayload(payload);
  const canRespondToBookingRequest =
    salonSide &&
    isBookingRequest &&
    Boolean(payload.appointmentId?.trim() && accessToken);

  const modal = (
    <div
      className={
        "luxury-notif-popup-root" + (isSalonAppointmentAlert ? " luxury-notif-popup-root--urgent" : "")
      }
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !respondM.isPending) close();
      }}
    >
      <div
        className={
          "luxury-notif-popup" + (isSalonAppointmentAlert ? " luxury-notif-popup--booking-request" : "")
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-live={isSalonAppointmentAlert ? "assertive" : undefined}
      >
        {isSalonAppointmentAlert ? (
          <div className="luxury-notif-popup__urgent-banner" aria-hidden>
            <span className="luxury-notif-popup__urgent-pulse" />
            <span className="luxury-notif-popup__urgent-icon">🔔</span>
            <span className="luxury-notif-popup__urgent-label">
              {salonAlertBannerForType(payload.notificationType)}
            </span>
          </div>
        ) : null}

        <div className="luxury-notif-popup__hero" aria-hidden>
          <div className="luxury-notif-popup__hero-glow" />
        </div>

        <div className="luxury-notif-popup__head">
          <div className="luxury-notif-popup__head-main">
            <p className="luxury-notif-popup__kicker">
              {isSalonAppointmentAlert ? "Avviso appuntamento" : "Notifica"}
            </p>
            <h2 id={titleId} className="luxury-notif-popup__title">
              {payload.title}
            </h2>
            <div className="luxury-notif-popup__chips" aria-label="Dettagli rapidi">
              {typeLabel ? (
                <span className="luxury-notif-popup__chip luxury-notif-popup__chip--type">{typeLabel}</span>
              ) : null}
              {status ? (
                <span
                  className={
                    "luxury-notif-popup__chip luxury-notif-popup__chip--status luxury-notif-popup__chip--status-" +
                    status.tone
                  }
                >
                  {status.label}
                </span>
              ) : null}
              {canRespondToBookingRequest ? (
                <span className="luxury-notif-popup__chip luxury-notif-popup__chip--action-hint">
                  Invio · Accetta
                </span>
              ) : isSalonAppointmentAlert ? (
                <span className="luxury-notif-popup__chip luxury-notif-popup__chip--action-hint">
                  Apri dettaglio
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
          <div
            className={
              "luxury-notif-popup__success luxury-notif-popup__success--" + respondSuccess
            }
            role="status"
          >
            <span className="luxury-notif-popup__success-icon" aria-hidden>
              {respondSuccess === "confirm" ? "✓" : "✕"}
            </span>
            <p className="luxury-notif-popup__success-text">
              {respondSuccess === "confirm"
                ? "Prenotazione confermata. Il cliente riceverà la notifica."
                : "Richiesta rifiutata. Il cliente è stato avvisato."}
            </p>
          </div>
        ) : (
          <>
            {canRespondToBookingRequest ? (
              <div className="luxury-notif-popup__quick-actions">
                {rejectConfirmOpen ? (
                  <div className="luxury-notif-popup__reject-confirm" role="group" aria-label="Conferma rifiuto">
                    <p className="luxury-notif-popup__reject-confirm-text">
                      Rifiutare la richiesta di <strong>{payload.clientName?.trim() || "questo cliente"}</strong>?
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
                        {respondM.isPending ? "Conferma in corso…" : "Accetta prenotazione"}
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
                  {isSalonAppointmentAlert ? "Dettaglio" : "Messaggio"}
                </span>
                <p className="luxury-notif-popup__text">{payload.body}</p>
              </div>
            </div>

            {payload.clientName?.trim() || sentLabel ? (
              <dl className="luxury-notif-popup__meta">
                {payload.clientName?.trim() ? (
                  <div className="luxury-notif-popup__meta-row luxury-notif-popup__meta-row--highlight">
                    <dt>Cliente</dt>
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
                {appointmentHref && !canRespondToBookingRequest ? (
                  <button
                    type="button"
                    className="luxury-notif-popup__btn luxury-notif-popup__btn--primary"
                    onClick={() => {
                      close();
                      navigate(appointmentHref);
                    }}
                  >
                    Vai alla prenotazione
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
                {appointmentHref && isSalonAppointmentAlert && !canRespondToBookingRequest ? (
                  <button
                    type="button"
                    className="luxury-notif-popup__btn luxury-notif-popup__btn--primary"
                    onClick={() => {
                      close();
                      navigate(appointmentHref);
                    }}
                  >
                    Vai all'appuntamento
                  </button>
                ) : null}
                <button
                  type="button"
                  className="luxury-notif-popup__btn luxury-notif-popup__btn--secondary"
                  disabled={respondM.isPending}
                  onClick={close}
                >
                  {canRespondToBookingRequest ? "Rispondi dopo" : isSalonAppointmentAlert ? "Chiudi avviso" : "Chiudi"}
                </button>
              </div>
            </div>
          </>
        )}

        {deleteM.isError || respondM.isError ? (
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
