import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { AppointmentDto } from "../../api/types";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { formatPriceEUR } from "../../lib/format";
import "../../styles/luxury-consumer-bookings-page.css";
import PrenotazioniStaffPickPage from "./PrenotazioniStaffPickPage";

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

function statusLabel(status: string): string {
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

function consumerSalonFollowUp(a: AppointmentDto): boolean {
  return (
    (a.status === "BOOKED" || a.status === "CONFIRMED") && !a.canConsumerCancel && !a.canConsumerReschedule
  );
}

export default function AppointmentsPage() {
  const { accessToken, isSalonTitolare, isSalonStaff } = useVelvetAuth();
  const [upcoming, setUpcoming] = useState(true);

  const q = useQuery({
    queryKey: ["me", "appointments", upcoming],
    queryFn: () =>
      apiJson<AppointmentDto[]>(`/api/v1/me/appointments?upcoming=${upcoming}`, {
        accessToken,
      }),
    enabled: Boolean(accessToken) && !isSalonTitolare && !isSalonStaff,
  });

  if (isSalonStaff) {
    return <Navigate to="/account/staff" replace />;
  }

  if (isSalonTitolare) {
    return <PrenotazioniStaffPickPage />;
  }

  const listCount = Array.isArray(q.data) ? q.data.length : null;

  return (
    <main className="luxury-page-main luxury-consumer-agenda luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44">
      <div className="luxury-consumer-bookings-dash__shell">
        <header className="luxury-consumer-bookings-dash__header--hero">
          <div className="luxury-consumer-bookings-dash__hero-glow" aria-hidden />
          <div className="luxury-consumer-bookings-dash__title-row">
            <h1 className="luxury-consumer-bookings-dash__headline">
              <span className="luxury-consumer-bookings-dash__headline-pre">Le mie </span>
              <span className="luxury-consumer-bookings-dash__headline-accent">prenotazioni</span>
            </h1>
            {q.isLoading ? (
              <p className="luxury-consumer-bookings-dash__total-pill luxury-consumer-bookings-dash__total-pill--loading" aria-hidden>
                …
              </p>
            ) : listCount !== null ? (
              <p
                className="luxury-consumer-bookings-dash__total-pill"
                aria-label={`Totale ${listCount} ${listCount === 1 ? "prenotazione" : "prenotazioni"} in questa lista`}
              >
                <span className="luxury-consumer-bookings-dash__total-pill__n" aria-hidden>
                  {listCount}
                </span>
                <span className="luxury-consumer-bookings-dash__total-pill__label">
                  {listCount === 1 ? "prenotazione" : "prenotazioni"}
                </span>
              </p>
            ) : null}
          </div>
        </header>

        <div className="luxury-consumer-agenda__filters" role="tablist" aria-label="Filtri prenotazioni">
          <button
            type="button"
            role="tab"
            aria-selected={upcoming}
            onClick={() => setUpcoming(true)}
            className={`luxury-consumer-agenda__tab${upcoming ? " is-active" : ""}`}
          >
            In arrivo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!upcoming}
            onClick={() => setUpcoming(false)}
            className={`luxury-consumer-agenda__tab${!upcoming ? " is-active" : ""}`}
          >
            Passate
          </button>
        </div>

        {q.isLoading && <p className="luxury-text-muted">Caricamento…</p>}
        {q.error && (
          <p className="luxury-alert luxury-alert--error" role="alert">
            {q.error instanceof Error ? q.error.message : "Errore"}
          </p>
        )}
        {q.data && q.data.length === 0 && (
          <p className="luxury-consumer-agenda__empty luxury-consumer-bookings-dash__empty">
            Nessuna prenotazione in questa lista.
          </p>
        )}
        <ul className="luxury-consumer-agenda__list">
          {(q.data ?? []).map((a) => {
            const agendaDate = formatAgendaDate(a.start);
            return (
              <li key={a.id} className="luxury-consumer-agenda__item">
                <div className="luxury-consumer-agenda__date" aria-hidden>
                  <span className="luxury-consumer-agenda__day">{agendaDate.day}</span>
                  <span className="luxury-consumer-agenda__month">{agendaDate.month}</span>
                </div>
                <div className="luxury-consumer-agenda__content">
                  <p className="luxury-consumer-agenda__meta">
                    <span>
                      {agendaDate.weekday} · {agendaDate.time}
                    </span>
                    <span className={`luxury-consumer-agenda__status luxury-consumer-agenda__status--${a.status.toLowerCase()}`}>
                      {statusLabel(a.status)}
                    </span>
                  </p>
                  <Link to={`/account/prenotazioni/${a.id}`} className="luxury-consumer-agenda__title">
                    {a.serviceName}
                  </Link>
                  <p className="luxury-consumer-agenda__desc">
                    {a.locationName} · {formatPriceEUR(a.priceCents)}
                  </p>
                  <p className="luxury-consumer-agenda__full-date">{agendaDate.full}</p>
                  {upcoming && (a.canConsumerCancel || a.canConsumerReschedule) && (
                    <div className="luxury-consumer-agenda__actions">
                      <Link to={`/account/prenotazioni/${a.id}`} className="luxury-consumer-agenda__manage-link">
                        Modifica orario o disdici
                      </Link>
                    </div>
                  )}
                  {upcoming && consumerSalonFollowUp(a) && (
                    <p className="luxury-consumer-agenda__policy-hint">
                      Per cambiare o annullare questa prenotazione contatta il salone: la finestra online è scaduta.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
