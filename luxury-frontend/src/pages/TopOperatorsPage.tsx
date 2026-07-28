import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
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
import "../styles/luxury-search-page.css";
import "../styles/monthly-idea-page.css";
import "../styles/top-operators-page.css";

function operatorReviewCaption(op: TopOperatorSummary): string | null {
  const avg = op.averageStaffRating;
  const n = op.staffReviewCount;
  if (typeof avg !== "number" || !Number.isFinite(avg) || n == null || n < 1) return null;
  const avgLabel = avg.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const recLabel = n === 1 ? "1 recensione" : `${n} recensioni`;
  return `${avgLabel}/5 · ${recLabel}`;
}

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
  const editorialMonthKey = getEditorialMonthKey();

  const operatorsQ = useQuery({
    queryKey: ["publicOperators", "topRated", editorialMonthKey, selectedKind.id],
    queryFn: () =>
      apiJson<TopOperatorSummary[]>(
        topRatedOperatorsApiPath(selectedKind.id as TopOperatorKindId, TOP_OPERATORS_PAGE_LIMIT),
      ),
  });

  const hits = operatorsQ.data ?? [];
  const showSkeleton = operatorsQ.isLoading && hits.length === 0;

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
          aria-label="Torna indietro"
          onClick={() => navigate("/")}
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
          Torna indietro
        </button>
      </div>

      <header className="luxury-search-hero">
        <div className="luxury-search-hero__glow" aria-hidden />
        <h1 className="luxury-page-title">
          <span className="luxury-search-hero__title-text">{selectedKind.heading}</span>
        </h1>
        <p className="luxury-top-operators-lead">
          I 10 professionisti più apprezzati a livello nazionale, in base alle recensioni dei clienti.
        </p>
      </header>

      <div className="luxury-top-operators-kind-picker" role="tablist" aria-label="Categoria operatori">
        {TOP_OPERATOR_KINDS.map((kind) => {
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
          Non siamo riusciti a caricare la classifica. Riprova tra poco.
        </p>
      ) : null}

      {showSkeleton ? (
        <div className="luxury-search-skeleton-grid" aria-hidden>
          {Array.from({ length: TOP_OPERATORS_PAGE_LIMIT }).map((_, k) => (
            <div key={k} className="luxury-search-skeleton-card" />
          ))}
        </div>
      ) : null}

      {!showSkeleton && hits.length > 0 ? (
        <>
          <p className="luxury-search-a11y-live" aria-live="polite" aria-atomic="true">
            {hits.length} {selectedKind.label.toLowerCase()} in classifica nazionale.
          </p>
          <ul className="luxury-search-grid">
            {hits.map((op, idx) => {
              const caption = operatorReviewCaption(op);
              const avg = op.averageStaffRating;
              const showStars = typeof avg === "number" && Number.isFinite(avg) && caption != null;
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
                      {showStars ? (
                        <div className="luxury-search-card-rating">
                          <StarRatingDisplay rating={avg} caption={caption} />
                        </div>
                      ) : (
                        <p className="luxury-search-card-rating luxury-monthly-idea-no-reviews">
                          Recensioni in arrivo
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

      {!showSkeleton && hits.length === 0 && !operatorsQ.isError ? (
        <section className="luxury-search-empty-state" aria-labelledby="luxury-top-operators-empty-title">
          <h2 id="luxury-top-operators-empty-title" className="luxury-search-empty-title">
            Nessun operatore in classifica per {selectedKind.label.toLowerCase()}
          </h2>
          <div className="luxury-search-empty-actions">
            <button
              type="button"
              className="luxury-search-empty-btn luxury-search-empty-btn--primary"
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
