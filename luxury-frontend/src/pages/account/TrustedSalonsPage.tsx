import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiJson } from "../../api/client";
import type { SalonClientMembershipDto } from "../../api/types";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";
import { CLIENT_ACCOUNT_ICONS, ClientAccountContentCard } from "../../components/account/ClientAccountContentCard";
import { ClientAccountHeroHeader } from "../../components/account/ClientAccountHeroHeader";
import { SearchHitLogoAvatar } from "../../components/SearchHitLogoAvatar";
import { INFO_PRIVACY_HERO_ICONS } from "../../components/account/InfoPrivacyAccountHeroHeader";
import { CLIENT_ACCOUNT_PAGE_SHELL_CLASS } from "../../lib/clientAccountPageShellClasses";
import { formatSalonCityForDisplay } from "../../lib/formatSalonCityForDisplay";
import { prefetchSalonPublicPage } from "../../lib/prefetchSalonPublicPage";
import { notifySalonCatalogClientsChanged } from "../../lib/salonCatalogClientsSync";
import "../../styles/luxury-consumer-bookings-page.css";
import "../../styles/luxury-info-privacy-hero.css";
import "../../styles/luxury-feedback-client.css";
import "../../styles/luxury-client-account-page.css";
import "../../styles/luxury-trusted-salons-page.css";

function formatTrustedSinceFull(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Data non disponibile";
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

export default function TrustedSalonsPage() {
  const { accessToken, isSalonTitolare, isSalonStaff, isLuxurySuperAdmin } = useLuxuryAuth();
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

  if (isLuxurySuperAdmin || isSalonStaff) {
    return <Navigate to="/account" replace />;
  }
  if (isSalonTitolare) {
    return <Navigate to="/salone" replace />;
  }

  const rows = q.data ?? [];
  const listCount = q.isLoading ? null : rows.length;
  const countLabel =
    listCount == null
      ? "Caricamento elenco…"
      : listCount === 0
        ? "Nessun salone collegato"
        : `${listCount} ${listCount === 1 ? "salone di fiducia" : "saloni di fiducia"}`;

  return (
    <main
      className={`luxury-page-main luxury-consumer-agenda luxury-consumer-bookings-dash luxury-consumer-bookings-dash--base44 luxury-trusted-salons-page ${CLIENT_ACCOUNT_PAGE_SHELL_CLASS}`}
    >
      <div className="luxury-consumer-bookings-dash__shell">
        <ClientAccountHeroHeader
          headlinePre="Saloni di "
          headlineAccent="fiducia"
          badgeSecondary="I tuoi saloni"
          kickerLabel="Legame cliente"
          kickerChip="Prenotazioni e chat"
          subtitle={
            <>
              I saloni con cui hai prenotato restano collegati al profilo: da qui apri la <strong>vetrina</strong>, la{" "}
              <em>chat</em> e gestisci il legame. Senza una nuova prenotazione entro <strong>60 giorni</strong> non sarai più
              cliente del salone.
            </>
          }
          metaItems={[
            { icon: INFO_PRIVACY_HERO_ICONS.user, label: countLabel },
            { icon: CLIENT_ACCOUNT_ICONS.heart, label: "Cliente attivo dopo ogni visita" },
          ]}
        />

        <ClientAccountContentCard ariaLabel="Elenco saloni di fiducia" title="I saloni collegati">
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
                Prenota un appuntamento: diventi automaticamente cliente del salone e dell&apos;operatore con cui prenoti.
                Senza una nuova prenotazione entro 60 giorni non sarai più cliente.
              </p>
              <Link to="/" className="luxury-trusted-salons-empty__cta">
                Vai all&apos;area di ricerca
              </Link>
            </div>
          ) : null}

          {rows.length > 0 ? (
            <ul className="luxury-consumer-agenda__list">
              {rows.map((m) => {
                const sinceFull = formatTrustedSinceFull(m.createdAt);
                return (
                  <li key={m.id} className="luxury-consumer-agenda__item">
                    <Link
                      to={`/s/${encodeURIComponent(m.slug)}`}
                      className="luxury-trusted-salons-page__logo-link"
                      aria-label={`Vai alla pagina di ${m.name}`}
                      onMouseEnter={() => prefetchSalonPublicPage(queryClient, m.slug)}
                      onFocus={() => prefetchSalonPublicPage(queryClient, m.slug)}
                    >
                      <SearchHitLogoAvatar
                        slug={m.slug}
                        name={m.name}
                        avatarClass="luxury-trusted-salons-page__logo-avatar"
                        logoExtraClass="luxury-trusted-salons-page__logo-avatar--logo"
                      />
                    </Link>
                    <div className="luxury-consumer-agenda__content">
                      <p className="luxury-consumer-agenda__meta">
                        <span>Cliente dal {sinceFull}</span>
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
                          className="luxury-consumer-agenda__manage-link luxury-consumer-agenda__manage-link--chat"
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
        </ClientAccountContentCard>
      </div>
    </main>
  );
}
