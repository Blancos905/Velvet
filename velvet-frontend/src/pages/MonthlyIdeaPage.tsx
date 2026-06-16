import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { apiJson } from "../api/client";
import type { OrganizationSummary } from "../api/types";
import { findTrendIdea } from "../data/trendingIdeas";
import { useVelvetNativeAppShell } from "../hooks/useVelvetNativeAppShell";
import { SearchHitLogoAvatar } from "../components/SearchHitLogoAvatar";
import { StarRatingDisplay } from "../components/StarRatingDisplay";
import { formatSalonCityForDisplay } from "../lib/formatSalonCityForDisplay";
import { formatSalonClientAudienceLabel } from "../lib/formatSalonClientAudience";
import { prefetchSalonPublicPage } from "../lib/prefetchSalonPublicPage";
import type { SalonOrgNavState } from "../lib/publicOrganizationDetail";
import "../styles/velvet-search-page.css";
import "../styles/monthly-idea-page.css";

function monthlySalonCaption(o: OrganizationSummary): string | null {
  const avg = o.averageRating;
  const n = o.reviewCount;
  if (typeof avg !== "number" || !Number.isFinite(avg) || n == null || n < 1) return null;
  const avgLabel = avg.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const recLabel = n === 1 ? "1 recensione" : `${n} recensioni`;
  return `${avgLabel}/5 · ${recLabel}`;
}

function goBackOrHome(navigate: ReturnType<typeof useNavigate>) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    navigate(-1);
  } else {
    navigate("/");
  }
}

function ChevronIcon() {
  return (
    <svg className="velvet-search-card-chevron" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2" fill="currentColor" />
    </svg>
  );
}

export default function MonthlyIdeaPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isNativeApp = useVelvetNativeAppShell();
  const { groupId, itemId } = useParams<{ groupId: string; itemId: string }>();
  const resolved = useMemo(
    () =>
      groupId && itemId
        ? findTrendIdea(groupId, itemId, { nativeApp: isNativeApp })
        : null,
    [groupId, itemId, isNativeApp],
  );

  if (!resolved) {
    return <Navigate to="/" replace />;
  }

  const { group, card } = resolved;

  const salonsQ = useQuery({
    queryKey: ["publicOrganizations", "monthlyIdea", group.id, card.q],
    queryFn: () => {
      const p = new URLSearchParams();
      p.set("monthlyIdea", card.q);
      p.set("monthlyIdeaSalonKind", group.id);
      p.set("monthlyIdeaLimit", "5");
      return apiJson<OrganizationSummary[]>(`/api/v1/public/organizations?${p.toString()}`);
    },
  });

  const hits = salonsQ.data ?? [];
  const showSkeleton = salonsQ.isLoading && hits.length === 0;

  return (
    <main className="velvet-page-main velvet-search-page velvet-monthly-idea-page">
      <div className="velvet-search-back-row">
        <button
          type="button"
          className="velvet-search-back"
          aria-label="Torna indietro"
          onClick={() => goBackOrHome(navigate)}
        >
          <svg className="velvet-search-back__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Torna indietro
        </button>
      </div>

      <header className="velvet-search-hero">
        <div className="velvet-search-hero__glow" aria-hidden />
        <h1 className="velvet-page-title">
          <span className="velvet-search-hero__title-text">I migliori saloni del mese</span>
        </h1>
      </header>

      {salonsQ.isError ? (
        <p className="velvet-alert velvet-alert--error" role="alert">
          Non siamo riusciti a caricare l&apos;elenco. Riprova tra poco.
        </p>
      ) : null}

      {showSkeleton ? (
        <div className="velvet-search-skeleton-grid" aria-hidden>
          {[0, 1, 2, 3, 4].map((k) => (
            <div key={k} className="velvet-search-skeleton-card" />
          ))}
        </div>
      ) : null}

      {!showSkeleton && hits.length > 0 ? (
        <>
          <p className="velvet-search-a11y-live" aria-live="polite" aria-atomic="true">
            {hits.length} saloni in classifica per questa idea.
          </p>
          <ul className="velvet-search-grid">
            {hits.map((o, idx) => {
              const caption = monthlySalonCaption(o);
              const avg = o.averageRating;
              const showStars = typeof avg === "number" && Number.isFinite(avg) && caption != null;
              const audienceLabel = formatSalonClientAudienceLabel(o.salonClientGenders);
              const pageToneClass =
                idx === 0 ? " velvet-search-card--page-lead" : " velvet-search-card--page-following";
              return (
                <li key={o.id} className={"velvet-search-card" + pageToneClass}>
                  <Link
                    to={`/s/${encodeURIComponent(o.slug)}`}
                    state={{ orgPreview: o } satisfies SalonOrgNavState}
                    onMouseEnter={() => prefetchSalonPublicPage(queryClient, o.slug)}
                    onFocus={() => prefetchSalonPublicPage(queryClient, o.slug)}
                    className="velvet-search-card__link"
                  >
                    <SearchHitLogoAvatar
                      slug={o.slug}
                      name={o.name}
                      avatarClass="velvet-search-card-avatar"
                      logoExtraClass="velvet-search-card-avatar--logo"
                    />
                    <div className="velvet-search-card-body">
                      <h3 className="velvet-search-card-name">{o.name}</h3>
                      {showStars ? (
                        <div className="velvet-search-card-rating">
                          <StarRatingDisplay rating={avg} caption={caption} />
                        </div>
                      ) : (
                        <p className="velvet-search-card-rating velvet-monthly-idea-no-reviews">Recensioni in arrivo</p>
                      )}
                      <div className="velvet-search-card-footer">
                        {audienceLabel ? (
                          <span className="velvet-search-card-audience">{audienceLabel}</span>
                        ) : null}
                        {o.city ? (
                          <span className="velvet-search-card-city">
                            <PinIcon />
                            {formatSalonCityForDisplay(o.city) ?? o.city}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ChevronIcon />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {!showSkeleton && hits.length === 0 && !salonsQ.isError ? (
        <section className="velvet-search-empty-state" aria-labelledby="velvet-monthly-idea-empty-title">
          <h2 id="velvet-monthly-idea-empty-title" className="velvet-search-empty-title">
            Nessun salone in evidenza per questa idea
          </h2>
          <div className="velvet-search-empty-actions">
            <button
              type="button"
              className="velvet-search-empty-btn velvet-search-empty-btn--primary"
              onClick={() => navigate("/")}
            >
              Torna alla home
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
