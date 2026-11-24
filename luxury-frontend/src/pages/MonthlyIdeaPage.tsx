import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { SalonListLoading } from "../components/SalonListLoading";
import { apiJson } from "../api/client";
import type { OrganizationSummary } from "../api/types";
import { findTrendIdea } from "../data/trendingIdeas";
import { getEditorialMonthKey } from "../lib/editorialMonthKey";
import { useLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";
import { SearchHitLogoAvatar } from "../components/SearchHitLogoAvatar";
import { StarRatingDisplay } from "../components/StarRatingDisplay";
import { formatSalonCityForDisplay } from "../lib/formatSalonCityForDisplay";
import { formatSalonClientAudienceLabel } from "../lib/formatSalonClientAudience";
import { goBackOrHome } from "../lib/goBackOrHome";
import { showResultsLoader } from "../lib/showResultsLoader";
import { prefetchSalonPublicPage } from "../lib/prefetchSalonPublicPage";
import type { SalonOrgNavState } from "../lib/publicOrganizationDetail";
import { formatStarReviewCaption } from "../lib/reviewCaptionForUi";
import { useLuxuryLocale } from "../i18n/useLuxuryLocale";
import "../styles/luxury-search-page.css";
import "../styles/monthly-idea-page.css";

function ChevronIcon() {
  return (
    <svg className="luxury-search-card-chevron" viewBox="0 0 24 24" fill="none" aria-hidden>
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
  const isNativeApp = useLuxuryNativeAppShell();
  const { locale, t } = useLuxuryLocale();
  const { groupId, itemId } = useParams<{ groupId: string; itemId: string }>();
  const resolved = useMemo(
    () =>
      groupId && itemId
        ? findTrendIdea(groupId, itemId, { nativeApp: isNativeApp })
        : null,
    [groupId, itemId, isNativeApp],
  );
  const editorialMonthKey = useMemo(() => getEditorialMonthKey(), []);

  const salonsQ = useQuery({
    queryKey: [
      "publicOrganizations",
      "monthlyIdea",
      editorialMonthKey,
      resolved?.group.id ?? "",
      resolved?.card.q ?? "",
    ],
    enabled: resolved != null,
    queryFn: () => {
      if (!resolved) return Promise.resolve([]);
      const p = new URLSearchParams();
      p.set("monthlyIdea", resolved.card.q);
      p.set("monthlyIdeaSalonKind", resolved.group.id);
      p.set("monthlyIdeaLimit", "5");
      return apiJson<OrganizationSummary[]>(`/api/v1/public/organizations?${p.toString()}`);
    },
  });

  if (!resolved) {
    return <Navigate to="/" replace />;
  }

  const hits = salonsQ.data ?? [];
  const showLoader = showResultsLoader(salonsQ, hits.length);

  return (
    <main className="luxury-page-main luxury-search-page luxury-monthly-idea-page">
      <div className="luxury-search-back-row">
        <button
          type="button"
          className="luxury-search-back"
          aria-label={t("auth.backAria")}
          onClick={() => goBackOrHome(navigate)}
        >
          <svg className="luxury-search-back__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t("common.back")}
        </button>
      </div>

      <header className="luxury-search-hero">
        <div className="luxury-search-hero__glow" aria-hidden />
        <h1 className="luxury-page-title">
          <span className="luxury-search-hero__title-text">{t("home.monthlyIdea.title")}</span>
        </h1>
      </header>

      {salonsQ.isError ? (
        <p className="luxury-alert luxury-alert--error" role="alert">
          {t("home.monthlyIdea.loadError")}
        </p>
      ) : null}

      {showLoader ? <SalonListLoading label={t("home.salonResults.loading")} /> : null}

      {!showLoader && hits.length > 0 ? (
        <>
          <p className="luxury-search-a11y-live" aria-live="polite" aria-atomic="true">
            {t("home.monthlyIdea.resultsLive", { count: hits.length })}
          </p>
          <ul className="luxury-search-grid">
            {hits.map((o, idx) => {
              const avg = o.averageRating;
              const n = o.reviewCount;
              const caption =
                typeof avg === "number" && Number.isFinite(avg) && n != null && n >= 1
                  ? formatStarReviewCaption(avg, n, locale, t)
                  : null;
              const showStars = caption != null;
              const audienceLabel = formatSalonClientAudienceLabel(o.salonClientGenders);
              const pageToneClass =
                idx === 0 ? " luxury-search-card--page-lead" : " luxury-search-card--page-following";
              return (
                <li key={o.id} className={"luxury-search-card" + pageToneClass}>
                  <Link
                    to={`/s/${encodeURIComponent(o.slug)}`}
                    state={{ orgPreview: o } satisfies SalonOrgNavState}
                    onMouseEnter={() => prefetchSalonPublicPage(queryClient, o.slug)}
                    onFocus={() => prefetchSalonPublicPage(queryClient, o.slug)}
                    className="luxury-search-card__link"
                  >
                    <SearchHitLogoAvatar
                      slug={o.slug}
                      name={o.name}
                      avatarClass="luxury-search-card-avatar"
                      logoExtraClass="luxury-search-card-avatar--logo"
                    />
                    <div className="luxury-search-card-body">
                      <h3 className="luxury-search-card-name">{o.name}</h3>
                      {showStars && avg != null ? (
                        <div className="luxury-search-card-rating">
                          <StarRatingDisplay rating={avg} caption={caption} />
                        </div>
                      ) : (
                        <p className="luxury-search-card-rating luxury-monthly-idea-no-reviews">
                          {t("home.monthlyIdea.reviewsPending")}
                        </p>
                      )}
                      <div className="luxury-search-card-footer">
                        {audienceLabel ? (
                          <span className="luxury-search-card-audience">{audienceLabel}</span>
                        ) : null}
                        {o.city ? (
                          <span className="luxury-search-card-city">
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

      {!showLoader && hits.length === 0 && !salonsQ.isError ? (
        <section className="luxury-search-empty-state" aria-labelledby="luxury-monthly-idea-empty-title">
          <h2 id="luxury-monthly-idea-empty-title" className="luxury-search-empty-title">
            {t("home.monthlyIdea.emptyTitle")}
          </h2>
          <div className="luxury-search-empty-actions">
            <button
              type="button"
              className="luxury-search-empty-btn luxury-search-empty-btn--primary"
              onClick={() => navigate("/")}
            >
              {t("home.monthlyIdea.backHome")}
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
