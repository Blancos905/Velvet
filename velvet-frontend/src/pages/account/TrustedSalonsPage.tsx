import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { SalonClientMembershipDto } from "../../api/types";
import { useVelvetAuth } from "../../auth/VelvetAuthProvider";
import { formatSalonCityForDisplay } from "../../lib/formatSalonCityForDisplay";
import { notifySalonCatalogClientsChanged } from "../../lib/salonCatalogClientsSync";
import "../../styles/luxury-consumer-bookings-page.css";
import "../../styles/luxury-trusted-salons-page.css";

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
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackIsError, setFeedbackIsError] = useState(false);
  const [leavingOrganizationId, setLeavingOrganizationId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["me", "salon-clients", accessToken],
    queryFn: () => apiJson<SalonClientMembershipDto[]>("/api/v1/me/salon-clients", { accessToken }),
    enabled: Boolean(accessToken),
  });

  const leaveSalonClientM = useMutation({
    mutationFn: (organizationId: string) =>
      apiJson<void>(`/api/v1/me/salon-clients/${encodeURIComponent(organizationId)}/leave`, {
        method: "POST",
        accessToken,
      }),
    onMutate: (organizationId) => {
      setLeavingOrganizationId(organizationId);
    },
    onSuccess: (_, organizationId) => {
      setFeedbackIsError(false);
      queryClient.setQueryData<SalonClientMembershipDto[]>(["me", "salon-clients", accessToken], (current) =>
        (current ?? []).filter((item) => item.organizationId !== organizationId),
      );
      void queryClient.invalidateQueries({ queryKey: ["catalog", "clients"] });
      notifySalonCatalogClientsChanged();
      setFeedback("Hai scollegato il tuo profilo da questo salone.");
    },
    onError: (error) => {
      setFeedbackIsError(true);
      setFeedback(error instanceof Error ? error.message : "Impossibile completare la richiesta.");
    },
    onSettled: () => {
      setLeavingOrganizationId(null);
    },
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
    <main className="luxury-page-main luxury-consumer-agenda luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-trusted-salons-page">
      <div className="luxury-consumer-bookings-dash__shell">
        <header className="luxury-consumer-bookings-dash__header--hero">
          <div className="luxury-consumer-bookings-dash__hero-glow" aria-hidden />
          <div className="luxury-consumer-bookings-dash__title-row">
            <h1 className="luxury-consumer-bookings-dash__headline">
              <span className="luxury-consumer-bookings-dash__headline-pre">Saloni di </span>
              <span className="luxury-consumer-bookings-dash__headline-accent">fiducia</span>
            </h1>
            {q.isLoading ? (
              <p className="luxury-consumer-bookings-dash__total-pill luxury-consumer-bookings-dash__total-pill--loading" aria-hidden>
                …
              </p>
            ) : (
              <p
                className="luxury-consumer-bookings-dash__total-pill"
                aria-label={`Totale ${listCount ?? 0} ${listCount === 1 ? "salone" : "saloni"} di fiducia`}
              >
                <span className="luxury-consumer-bookings-dash__total-pill__n" aria-hidden>
                  {listCount ?? 0}
                </span>
                <span className="luxury-consumer-bookings-dash__total-pill__label">
                  {listCount === 1 ? "salone" : "saloni"}
                </span>
              </p>
            )}
          </div>
        </header>

        {q.isLoading ? (
          <p className="luxury-trusted-salons-state luxury-trusted-salons-state--loading" aria-live="polite">
            Caricamento…
          </p>
        ) : null}

        {q.error ? (
          <p className="luxury-alert luxury-alert--error" role="alert">
            {q.error instanceof Error ? q.error.message : "Errore"}
          </p>
        ) : null}

        {feedback ? (
          <p
            className={`luxury-trusted-salons-feedback${feedbackIsError ? " luxury-trusted-salons-feedback--error" : ""}`}
            role={feedbackIsError ? "alert" : "status"}
          >
            {feedback}
          </p>
        ) : null}

        {!q.isLoading && !q.error && rows.length === 0 ? (
          <div className="luxury-trusted-salons-empty luxury-consumer-bookings-dash__empty" role="status">
            <p className="luxury-trusted-salons-empty__title">Ancora nessun salone di fiducia</p>
            <p className="luxury-trusted-salons-empty__body">
              Entra nella scheda di un salone e scegli <span className="luxury-trusted-salons-empty__hl">Diventa cliente</span>:
              così il salone ti riconosce tra i suoi clienti e puoi usare la chat dedicata.
            </p>
            <Link to="/" className="luxury-trusted-salons-empty__cta">
              Vai all&apos;area di ricerca
            </Link>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <ul className="luxury-consumer-agenda__list">
            {rows.map((m) => {
              const since = formatTrustedSince(m.createdAt);
              return (
                <li key={m.id} className="luxury-consumer-agenda__item">
                  <div className="luxury-consumer-agenda__date" aria-hidden>
                    <span className="luxury-consumer-agenda__day">{since.day}</span>
                    <span className="luxury-consumer-agenda__month">{since.month}</span>
                  </div>
                  <div className="luxury-consumer-agenda__content">
                    <p className="luxury-consumer-agenda__meta">
                      <span>Cliente dal {since.full}</span>
                      <span className="luxury-consumer-agenda__status luxury-consumer-agenda__status--confirmed">
                        Cliente attivo
                      </span>
                    </p>
                    <Link to={`/s/${encodeURIComponent(m.slug)}`} className="luxury-consumer-agenda__title">
                      {m.name}
                    </Link>
                    <p className="luxury-consumer-agenda__desc">
                      {m.city ? `${formatSalonCityForDisplay(m.city) ?? m.city} · ` : ""}
                      Salone collegato al tuo profilo.
                    </p>
                    <div className="luxury-consumer-agenda__actions luxury-trusted-salons-page__actions">
                      <Link
                        to={`/account/chat?salonClientId=${encodeURIComponent(m.id)}`}
                        className="luxury-consumer-agenda__manage-link"
                      >
                        Apri chat
                      </Link>
                      <button
                        type="button"
                        className="luxury-trusted-salons-page__leave-btn"
                        disabled={leaveSalonClientM.isPending && leavingOrganizationId === m.organizationId}
                        onClick={() => {
                          setFeedback(null);
                          setFeedbackIsError(false);
                          const ok = window.confirm(
                            `Vuoi smettere di risultare cliente di ${m.name}? Lo storico delle prenotazioni resta lato salone dove necessario.`,
                          );
                          if (!ok) return;
                          leaveSalonClientM.mutate(m.organizationId);
                        }}
                      >
                        {leaveSalonClientM.isPending && leavingOrganizationId === m.organizationId
                          ? "Scollegamento…"
                          : "Non essere più cliente"}
                      </button>
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
