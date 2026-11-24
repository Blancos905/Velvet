import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { SalonListLoading } from "../components/SalonListLoading";
import { goBackOrHome } from "../lib/goBackOrHome";
import { showResultsLoader } from "../lib/showResultsLoader";
import { apiJson } from "../api/client";
import type { TopOperatorSummary } from "../api/types";
import {
  DEFAULT_TOP_OPERATOR_KIND,
  TOP_OPERATOR_KINDS,
  TOP_OPERATORS_PAGE_LIMIT,
  findTopOperatorKind,
  topRatedOperatorsApiPath,
  type TopOperatorKindId,
} from "../data/topOperatorKinds";
import { getEditorialMonthKey } from "../lib/editorialMonthKey";
import { useLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";
import { StarRatingDisplay } from "../components/StarRatingDisplay";
import { formatSalonCityForDisplay } from "../lib/formatSalonCityForDisplay";
import { formatStarReviewCaption } from "../lib/reviewCaptionForUi";
import { localizedTopOperatorKind } from "../i18n/homeTopOperatorTranslations";
import { useLuxuryLocale } from "../i18n/useLuxuryLocale";
import "../styles/luxury-search-page.css";
import "../styles/monthly-idea-page.css";
import "../styles/top-operators-page.css";

function operatorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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

export default function TopOperatorsPage() {
  const { kind: kindParam } = useParams<{ kind: string }>();
  const selectedKind = findTopOperatorKind(kindParam);

  if (!selectedKind) {
    return <Navigate to={`/operatori/migliori/${DEFAULT_TOP_OPERATOR_KIND}`} replace />;
  }

  return <TopOperatorsPageContent selectedKind={selectedKind} />;
}

function TopOperatorsPageContent({
  selectedKind,
}: {
  selectedKind: (typeof TOP_OPERATOR_KINDS)[number];
}) {
  const navigate = useNavigate();
  const isNativeApp = useLuxuryNativeAppShell();
  const { locale, t } = useLuxuryLocale();
  const editorialMonthKey = getEditorialMonthKey();

  const kindText = localizedTopOperatorKind(locale, selectedKind.id, {
    label: selectedKind.label,
    heading: selectedKind.heading,
  });

  const localizedKinds = TOP_OPERATOR_KINDS.map((kind) => ({
    ...kind,
    ...localizedTopOperatorKind(locale, kind.id, { label: kind.label, heading: kind.heading }),
  }));

  const operatorsQ = useQuery({
    queryKey: ["publicOperators", "topRated", editorialMonthKey, selectedKind.id],
    queryFn: () =>
      apiJson<TopOperatorSummary[]>(
        topRatedOperatorsApiPath(selectedKind.id as TopOperatorKindId, TOP_OPERATORS_PAGE_LIMIT),
      ),
  });

  const hits = operatorsQ.data ?? [];
  const showLoader = showResultsLoader(operatorsQ, hits.length);

  return (
    <main
      className={
        "luxury-page-main luxury-search-page luxury-monthly-idea-page luxury-top-operators-page" +
        (isNativeApp ? " luxury-top-operators-page--native" : "")
      }
    >
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
          <span className="luxury-search-hero__title-text">{kindText.heading}</span>
        </h1>
        <p className="luxury-top-operators-lead">
          {t("home.topOperators.leadBeforeCount")}
          <strong>{t("home.topOperators.leadCount")}</strong>
          {t("home.topOperators.leadMid")}
          <strong>{t("home.topOperators.leadNational")}</strong>
          {t("home.topOperators.leadAfter")}
        </p>
      </header>

      <div
        className="luxury-top-operators-kind-picker"
        role="tablist"
        aria-label={t("home.topOperators.kindPickerAria")}
      >
        {localizedKinds.map((kind) => {
          const active = selectedKind.id === kind.id;
          return (
            <Link
              key={kind.id}
              to={`/operatori/migliori/${kind.id}`}
              role="tab"
              aria-selected={active}
              className={
                "luxury-top-operators-kind-btn" + (active ? " luxury-top-operators-kind-btn--active" : "")
              }
            >
              {kind.label}
            </Link>
          );
        })}
      </div>

      {operatorsQ.isError ? (
        <p className="luxury-alert luxury-alert--error" role="alert">
          {t("home.topOperators.loadError")}
        </p>
      ) : null}

      {showLoader ? <SalonListLoading label={t("home.topOperators.loading")} /> : null}

      {!showLoader && hits.length > 0 ? (
        <>
          <p className="luxury-search-a11y-live" aria-live="polite" aria-atomic="true">
            {t("home.topOperators.resultsLive", {
              count: hits.length,
              kind: kindText.label.toLowerCase(),
            })}
          </p>
          <ul className="luxury-search-grid">
            {hits.map((op, idx) => {
              const avg = op.averageStaffRating;
              const n = op.staffReviewCount;
              const caption =
                typeof avg === "number" && Number.isFinite(avg) && n != null && n >= 1
                  ? formatStarReviewCaption(avg, n, locale, t)
                  : null;
              const showStars = caption != null;
              const pageToneClass =
                idx === 0 ? " luxury-search-card--page-lead" : " luxury-search-card--page-following";
              const salonCity = op.salonCity ? formatSalonCityForDisplay(op.salonCity) ?? op.salonCity : null;
              const bookingHref = `/s/${encodeURIComponent(op.salonSlug)}?operator=${encodeURIComponent(op.id)}&prenota=1`;
              return (
                <li key={op.id} className={"luxury-search-card" + pageToneClass}>
                  <Link to={bookingHref} className="luxury-search-card__link">
                    <span className="luxury-top-operator-avatar" aria-hidden>
                      {operatorInitials(op.displayName)}
                    </span>
                    <div className="luxury-search-card-body">
                      <h3 className="luxury-search-card-name">{op.displayName}</h3>
                      {op.role?.trim() ? (
                        <p className="luxury-top-operator-role">{op.role.trim()}</p>
                      ) : null}
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
                        <span className="luxury-top-operator-salon">{op.salonName}</span>
                        {salonCity ? (
                          <span className="luxury-search-card-city">
                            <PinIcon />
                            {salonCity}
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

      {!showLoader && hits.length === 0 && !operatorsQ.isError ? (
        <section className="luxury-search-empty-state" aria-labelledby="luxury-top-operators-empty-title">
          <h2 id="luxury-top-operators-empty-title" className="luxury-search-empty-title">
            {t("home.topOperators.emptyTitle", { kind: kindText.label.toLowerCase() })}
          </h2>
          <div className="luxury-search-empty-actions">
            <button
              type="button"
              className="luxury-search-empty-btn luxury-search-empty-btn--primary"
              onClick={() => navigate("/")}
            >
              {t("home.topOperators.backHome")}
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
