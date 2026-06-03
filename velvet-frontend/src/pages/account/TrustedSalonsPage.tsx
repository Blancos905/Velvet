import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { SalonClientMembershipDto } from "../../api/types";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { formatSalonCityForDisplay } from "../../lib/formatSalonCityForDisplay";
import "../../styles/velvet-consumer-bookings-page.css";
import "../../styles/velvet-trusted-salons-page.css";

function formatTrustedSince(iso: string): { day: string; month: string; full: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: "--", month: "---", full: "Data non disponibile" };
  return {
    day: d.toLocaleDateString("it-IT", { day: "2-digit" }),
    month: d.toLocaleDateString("it-IT", { month: "short" }).replace(".", "").toUpperCase(),
    full: d.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }),
  };
}

export default function TrustedSalonsPage() {
  const { accessToken, isSalonTitolare, isSalonStaff, isVelvetSuperAdmin } = useVelvetAuth();

  const q = useQuery({
    queryKey: ["me", "salon-clients", accessToken],
    queryFn: () => apiJson<SalonClientMembershipDto[]>("/api/v1/me/salon-clients", { accessToken }),
    enabled: Boolean(accessToken),
  });

  if (isVelvetSuperAdmin || isSalonStaff) {
    return <Navigate to="/account" replace />;
  }
  if (isSalonTitolare) {
    return <Navigate to="/account/salone" replace />;
  }

  const rows = q.data ?? [];
  const listCount = q.isLoading ? null : rows.length;

  return (
    <main className="velvet-page-main velvet-consumer-agenda velvet-consumer-bookings-dash velvet-consumer-bookings-dash--base44 velvet-trusted-salons-page">
      <div className="velvet-consumer-bookings-dash__shell">
        <header className="velvet-consumer-bookings-dash__header--hero">
          <div className="velvet-consumer-bookings-dash__hero-glow" aria-hidden />
          <div className="velvet-consumer-bookings-dash__title-row">
            <h1 className="velvet-consumer-bookings-dash__headline">
              <span className="velvet-consumer-bookings-dash__headline-pre">Saloni di </span>
              <span className="velvet-consumer-bookings-dash__headline-accent">fiducia</span>
            </h1>
            {q.isLoading ? (
              <p className="velvet-consumer-bookings-dash__total-pill velvet-consumer-bookings-dash__total-pill--loading" aria-hidden>
                …
              </p>
            ) : (
              <p
                className="velvet-consumer-bookings-dash__total-pill"
                aria-label={`Totale ${listCount ?? 0} ${listCount === 1 ? "salone" : "saloni"} di fiducia`}
              >
                <span className="velvet-consumer-bookings-dash__total-pill__n" aria-hidden>
                  {listCount ?? 0}
                </span>
                <span className="velvet-consumer-bookings-dash__total-pill__label">
                  {listCount === 1 ? "salone" : "saloni"}
                </span>
              </p>
            )}
          </div>
        </header>

        {q.isLoading ? (
          <p className="velvet-trusted-salons-state velvet-trusted-salons-state--loading" aria-live="polite">
            Caricamento…
          </p>
        ) : null}

        {q.error ? (
          <p className="velvet-alert velvet-alert--error" role="alert">
            {q.error instanceof Error ? q.error.message : "Errore"}
          </p>
        ) : null}

        {!q.isLoading && !q.error && rows.length === 0 ? (
          <div className="velvet-trusted-salons-empty velvet-consumer-bookings-dash__empty" role="status">
            <p className="velvet-trusted-salons-empty__title">Ancora nessun salone di fiducia</p>
            <p className="velvet-trusted-salons-empty__body">
              Entra nella scheda di un salone e scegli <span className="velvet-trusted-salons-empty__hl">Diventa cliente</span>:
              così il salone ti riconosce tra i suoi clienti e puoi usare la chat dedicata.
            </p>
            <Link to="/" className="velvet-trusted-salons-empty__cta">
              Vai all&apos;area di ricerca
            </Link>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <ul className="velvet-consumer-agenda__list">
            {rows.map((m) => {
              const since = formatTrustedSince(m.createdAt);
              return (
                <li key={m.id} className="velvet-consumer-agenda__item">
                  <div className="velvet-consumer-agenda__date" aria-hidden>
                    <span className="velvet-consumer-agenda__day">{since.day}</span>
                    <span className="velvet-consumer-agenda__month">{since.month}</span>
                  </div>
                  <div className="velvet-consumer-agenda__content">
                    <p className="velvet-consumer-agenda__meta">
                      <span>Cliente dal {since.full}</span>
                      <span className="velvet-consumer-agenda__status velvet-consumer-agenda__status--confirmed">
                        Cliente attivo
                      </span>
                    </p>
                    <Link to={`/s/${encodeURIComponent(m.slug)}`} className="velvet-consumer-agenda__title">
                      {m.name}
                    </Link>
                    <p className="velvet-consumer-agenda__desc">
                      {m.city ? `${formatSalonCityForDisplay(m.city) ?? m.city} · ` : ""}
                      Salone collegato al tuo profilo.
                    </p>
                    <div className="velvet-consumer-agenda__actions">
                      <Link
                        to={`/account/chat?salonClientId=${encodeURIComponent(m.id)}`}
                        className="velvet-consumer-agenda__manage-link"
                      >
                        Apri chat
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </main>
  );
}
