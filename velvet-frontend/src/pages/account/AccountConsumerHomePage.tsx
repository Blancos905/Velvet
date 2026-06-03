import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { AppointmentDto } from "../../api/types";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { resolveVelvetAccountGreetingName, useMeProfileQuery } from "../../hooks/useMeProfile";
import { formatPriceEUR } from "../../lib/format";

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}

export default function AccountConsumerHomePage() {
  const { accessToken, isSalonTitolare, isVelvetSuperAdmin } = useVelvetAuth();
  const meProfile = useMeProfileQuery();
  const [searchParams, setSearchParams] = useSearchParams();
  const bookingConfirmed = searchParams.get("booking") === "confirmed";

  if (isVelvetSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (isSalonTitolare) {
    return <Navigate to="/account/salone" replace />;
  }

  const appointmentsQ = useQuery({
    queryKey: ["me", "appointments", "upcoming", "home"],
    queryFn: () =>
      apiJson<AppointmentDto[]>(`/api/v1/me/appointments?upcoming=${true}`, {
        accessToken,
      }),
    enabled: Boolean(accessToken),
  });

  const upcomingPreview = (appointmentsQ.data ?? []).slice(0, 6);

  const greetingName = resolveVelvetAccountGreetingName(meProfile.data?.displayName);
  const greeting = greetingName ? `Ciao ${greetingName}` : "Il tuo spazio Saloni Luxury";

  return (
    <div className="velvet-consumer-home">
      <h1 className="velvet-page-title">{greeting}</h1>
      <p className="velvet-page-subtitle">Ecco la lista dei tuoi appuntamenti.</p>
      {bookingConfirmed && (
        <p className="velvet-alert velvet-alert--success velvet-consumer-home__confirm" role="status">
          Prenotazione confermata con successo.
          <button
            type="button"
            className="velvet-link-inline"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete("booking");
              setSearchParams(next, { replace: true });
            }}
          >
            Chiudi
          </button>
        </p>
      )}

      {appointmentsQ.isLoading && <p className="velvet-text-muted">Caricamento…</p>}
      {appointmentsQ.error && (
        <p className="velvet-alert velvet-alert--error" role="alert">
          {appointmentsQ.error instanceof Error ? appointmentsQ.error.message : "Errore"}
        </p>
      )}
      {appointmentsQ.data && upcomingPreview.length === 0 && (
        <div className="velvet-surface-card velvet-consumer-home__empty">
          <p className="velvet-consumer-home__empty-text">
            Non hai ancora visite in programma.{" "}
            <Link className="velvet-link-inline" to="/search">
              Cerca un salone
            </Link>{" "}
            e prenota il tuo prossimo momento.
          </p>
        </div>
      )}
      <ul className="velvet-consumer-home__appointments-list">
        {upcomingPreview.map((a) => (
          <li key={a.id} className="velvet-surface-card velvet-consumer-home__appointment-item">
            <Link to={`/account/prenotazioni/${a.id}`} className="velvet-link-inline velvet-consumer-home__appointment-title">
              {a.serviceName}
            </Link>
            <p className="velvet-consumer-home__appointment-meta">
              {a.locationName} · {formatWhen(a.start)} · {formatPriceEUR(a.priceCents)}
            </p>
            {(a.canConsumerCancel || a.canConsumerReschedule) && (
              <p className="velvet-consumer-home__appointment-manage">
                <Link to={`/account/prenotazioni/${a.id}`} className="velvet-link-inline">
                  Modifica orario o disdici
                </Link>
              </p>
            )}
          </li>
        ))}
      </ul>
      {appointmentsQ.data && appointmentsQ.data.length > 3 && (
        <p className="velvet-consumer-home__all-link-wrap">
          <Link className="velvet-link-inline" to="/account/prenotazioni">
            Vedi tutte le prenotazioni
          </Link>
        </p>
      )}
    </div>
  );
}
