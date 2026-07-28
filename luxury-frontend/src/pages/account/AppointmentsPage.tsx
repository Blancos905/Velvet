import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { STAFF_MEMBER_AGENDA_PATH } from "../../lib/staffMemberAgendaPath";
import { apiJson } from "../../api/client";
import type { AppointmentDto } from "../../api/types";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { ClientBookingsHeroHeader } from "../../components/account/ClientBookingsHeroHeader";
import { SearchHitLogoAvatar, searchHitInitials } from "../../components/SearchHitLogoAvatar";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../lib/clientAccountPageShellClasses";
import { formatPriceEUR } from "../../lib/format";
import "../../styles/luxury-consumer-bookings-page.css";
import "../../styles/luxury-info-privacy-hero.css";
import "../../styles/luxury-feedback-client.css";
import "../../styles/luxury-client-account-page.css";
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

function consumerPendingConfirmation(a: AppointmentDto): boolean {
  return a.status === "BOOKED";
}

function consumerDeadlineExpired(a: AppointmentDto): boolean {
  return a.status === "CONFIRMED" && !a.canConsumerCancel && !a.canConsumerReschedule;
}

export default function AppointmentsPage() {
  const { accessToken, isSalonTitolare, isSalonStaff } = useLuxuryAuth();
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
    return <Navigate to={STAFF_MEMBER_AGENDA_PATH} replace />;
  }

  if (isSalonTitolare) {
    return <PrenotazioniStaffPickPage />;
  }

  const listCount = Array.isArray(q.data) ? q.data.length : null;

  return (
    <main
      className={`luxury-page-main luxury-consumer-agenda luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`}
    >
      <div className="luxury-consumer-bookings-dash__shell">
        <ClientBookingsHeroHeader listCount={q.isLoading ? undefined : listCount ?? 0} upcoming={upcoming} />

        <article className="luxury-feedback-client-page__card luxury-surface-card" aria-label="Elenco prenotazioni cliente">
          <div className="luxury-feedback-client-page__card-glow" aria-hidden />
          <header className="luxury-feedback-client-page__card-head">
            <h2 className="luxury-feedback-client-page__card-title">Agenda e storico</h2>
          </header>

          <div className="luxury-feedback-client-page__card-body">
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
              <p className="luxury-consumer-agenda__empty">
                Nessuna prenotazione in questa lista.
                {upcoming ? (
                  <>
                    {" "}
                    <Link className="luxury-link-inline" to="/search">
                      Cerca un salone
                    </Link>{" "}
                    per prenotare la prossima visita.
                  </>
                ) : null}
              </p>
            )}
            <ul className="luxury-consumer-agenda__list">
              {(q.data ?? []).map((a) => {
                const agendaDate = formatAgendaDate(a.start);
                const salonLabel = a.locationName?.trim() || "Salone";
                const salonSlug = a.locationSlug?.trim() || "";
                const salonLogo = a.locationLogoDataUrl?.trim() || "";
                return (
                  <li key={a.id} className="luxury-consumer-agenda__item">
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
                          {statusLabel(a.status)}
                        </span>
                      </p>
                      <Link to={`/account/prenotazioni/${a.id}`} className="luxury-consumer-agenda__title">
                        {a.serviceName}
                      </Link>
                      <p className="luxury-consumer-agenda__desc">
                        {salonLabel} · {formatPriceEUR(a.priceCents)}
                      </p>
                      {upcoming && (a.canConsumerCancel || a.canConsumerReschedule) && (
                        <div className="luxury-consumer-agenda__actions">
                          <Link to={`/account/prenotazioni/${a.id}`} className="luxury-consumer-agenda__manage-link">
                            Modifica orario o disdici
                          </Link>
                        </div>
                      )}
                      {upcoming && consumerPendingConfirmation(a) && (
                        <p className="luxury-consumer-agenda__policy-hint">
                          In attesa di conferma dal salone. Per annullare o cambiare orario contatta {salonLabel}.
                        </p>
                      )}
                      {upcoming && consumerDeadlineExpired(a) && (
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
        </article>
      </div>
    </main>
  );
}
