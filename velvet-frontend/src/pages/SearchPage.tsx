import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiJson } from "../api/client";
import type { OrganizationSummary } from "../api/types";
import { SearchHitLogoAvatar } from "../components/SearchHitLogoAvatar";
import { StarRatingDisplay } from "../components/StarRatingDisplay";
import {
  SALON_BUSINESS_TYPE_OPTIONS,
  SALON_BUSINESS_TYPE_SHORT_LABELS,
  normalizeSalonBusinessTypeIds,
  organizationMatchesSalonBusinessTypes,
  type SalonBusinessTypeId,
} from "../data/salonBusinessTypes";
import { formatSalonCityForDisplay } from "../lib/formatSalonCityForDisplay";
import { formatSalonClientAudienceLabel } from "../lib/formatSalonClientAudience";
import { prefetchSalonPublicPage } from "../lib/prefetchSalonPublicPage";
import type { SalonOrgNavState } from "../lib/publicOrganizationDetail";
import "../styles/velvet-search-page.css";

/** Saloni per pagina nell’impaginatore risultati ricerca. */
const SEARCH_RESULTS_PAGE_SIZE = 8;

/** Query string `sort=rating`: saloni con media recensioni più alta (poi più recensioni) in cima. */
const SEARCH_SORT_RATING = "rating";

/** `nearLat` / `nearLng` (+ opz. `nearKm`, default 25) — filtro distanza lato API. */
function parseNearFromSearchParams(searchParams: URLSearchParams): {
  nearLat: number;
  nearLng: number;
  nearKm: number;
  nearActive: boolean;
} {
  const latRaw = searchParams.get("nearLat");
  const lngRaw = searchParams.get("nearLng");
  if (latRaw == null || latRaw.trim() === "" || lngRaw == null || lngRaw.trim() === "") {
    return { nearLat: 0, nearLng: 0, nearKm: 25, nearActive: false };
  }
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  const kmRaw = searchParams.get("nearKm");
  const kmNum = kmRaw != null && kmRaw !== "" ? Number(kmRaw) : Number.NaN;
  const nearActive =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;
  if (!nearActive) {
    return { nearLat: 0, nearLng: 0, nearKm: 25, nearActive: false };
  }
  const nearKm = Number.isFinite(kmNum) && kmNum > 0 ? Math.min(kmNum, 200) : 25;
  return { nearLat: lat, nearLng: lng, nearKm, nearActive: true };
}

function parseSalonClientGendersFromSearchParams(searchParams: URLSearchParams): string[] {
  const raw = searchParams.getAll("salonClientGender");
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    const normalized = value.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

/** `businessType` (ripetibile) — filtro esplicito per tipologia attività (OR tra le tipologie scelte). */
function parseSalonBusinessTypesFromSearchParams(searchParams: URLSearchParams): SalonBusinessTypeId[] {
  return normalizeSalonBusinessTypeIds(searchParams.getAll("businessType"));
}

function compareOrganizationsByRatingThenReviews(a: OrganizationSummary, b: OrganizationSummary): number {
  const ar = typeof a.averageRating === "number" && Number.isFinite(a.averageRating);
  const br = typeof b.averageRating === "number" && Number.isFinite(b.averageRating);
  if (ar && br) {
    const d = b.averageRating! - a.averageRating!;
    if (d !== 0) return d;
  } else if (ar && !br) {
    return -1;
  } else if (!ar && br) {
    return 1;
  }
  const ac = a.reviewCount ?? 0;
  const bc = b.reviewCount ?? 0;
  if (bc !== ac) return bc - ac;
  return a.name.localeCompare(b.name, "it");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function searchHitReviewCaption(o: OrganizationSummary): string | null {
  const avg = o.averageRating;
  const n = o.reviewCount;
  if (typeof avg !== "number" || !Number.isFinite(avg) || n == null || n < 1) return null;
  const avgLabel = avg.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const recLabel = n === 1 ? "1 recensione" : `${n} recensioni`;
  return `${avgLabel}/5 · ${recLabel}`;
}

function highlightName(name: string, query: string): ReactNode {
  const t = query.trim();
  if (!t) return name;
  let re: RegExp;
  try {
    re = new RegExp(`(${escapeRegExp(t)})`, "gi");
  } catch {
    return name;
  }
  const parts = name.split(re);
  return parts.map((part, i) => {
    if (part === "") return null;
    if (part.toLowerCase() === t.toLowerCase()) {
      return (
        <mark key={i} className="velvet-search-hit-mark">
          {part}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
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

function goBackOrHome(navigate: ReturnType<typeof useNavigate>) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    navigate(-1);
  } else {
    navigate("/");
  }
}

function buildPaginationItems(total: number, current: number): (number | null)[] {
  if (total <= 1) return [];
  if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  for (const n of [...pages]) {
    if (n < 1 || n > total) pages.delete(n);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i]!;
    if (i > 0 && n - sorted[i - 1]! > 1) out.push(null);
    out.push(n);
  }
  return out;
}

function SearchEmptyState({
  variant = "no-results",
  queryLabel,
  activeTypeLabels = [],
  onClearTypeFilters,
}: {
  variant?: "no-results" | "filter-no-match";
  queryLabel?: string;
  activeTypeLabels?: string[];
  onClearTypeFilters?: () => void;
}) {
  const nav = useNavigate();
  const titleId = "velvet-search-empty-title";
  const isFilter = variant === "filter-no-match";
  const typesLine = activeTypeLabels.length > 0 ? activeTypeLabels.join(", ") : "selezionati";

  return (
    <section className="velvet-search-empty-state" aria-labelledby={titleId}>
      <h2 id={titleId} className="velvet-search-empty-title">
        {isFilter ? "Nessun salone con questi filtri" : "Nessun salone trovato"}
      </h2>
      <p className="velvet-search-empty-lead">
        {isFilter ? (
          <>
            Tra i risultati{queryLabel ? <> per «{queryLabel}»</> : null} non c&apos;è un salone con tipologia{" "}
            <strong>{typesLine}</strong>. Prova a togliere un filtro o cerca con un&apos;altra parola.
          </>
        ) : (
          <>Prova un&apos;altra parola, un&apos;altra città o torna indietro e modifica la ricerca.</>
        )}
      </p>
      <div className="velvet-search-empty-actions">
        {isFilter && onClearTypeFilters ? (
          <button type="button" className="velvet-search-empty-btn velvet-search-empty-btn--primary" onClick={onClearTypeFilters}>
            Mostra tutti i risultati
          </button>
        ) : null}
        <button
          type="button"
          className={`velvet-search-empty-btn${isFilter ? "" : " velvet-search-empty-btn--primary"}`}
          onClick={() => goBackOrHome(nav)}
        >
          Indietro
        </button>
      </div>
    </section>
  );
}

export default function SearchPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const city = params.get("city") ?? "";
  const date = params.get("date") ?? "";
  const sortParam = params.get("sort") ?? "";
  const sortByRating = sortParam === SEARCH_SORT_RATING;
  const nearFromUrl = useMemo(() => parseNearFromSearchParams(params), [params]);
  const salonClientGendersFromUrl = useMemo(() => parseSalonClientGendersFromSearchParams(params), [params]);
  const businessTypesFromUrl = useMemo(() => parseSalonBusinessTypesFromSearchParams(params), [params]);
  const businessTypesKey = businessTypesFromUrl.join(",");

  const toggleBusinessType = (id: SalonBusinessTypeId) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const current = normalizeSalonBusinessTypeIds(next.getAll("businessType"));
        const updated = current.includes(id)
          ? current.filter((t) => t !== id)
          : [...current, id];
        next.delete("businessType");
        for (const t of updated) next.append("businessType", t);
        return next;
      },
      { replace: true },
    );
  };

  const clearBusinessTypeFilters = () => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("businessType");
        return next;
      },
      { replace: true },
    );
  };
  const [resultsPage, setResultsPage] = useState(1);
  const resultsAnchorRef = useRef<HTMLDivElement>(null);
  const skipResultsPageScrollRef = useRef(true);

  const { data, isFetching, isPending, isPlaceholderData, error, refetch } = useQuery<
    OrganizationSummary[]
  >({
    queryKey: [
      "orgs",
      "search",
      urlQ,
      city,
      nearFromUrl.nearActive,
      nearFromUrl.nearActive ? nearFromUrl.nearLat : null,
      nearFromUrl.nearActive ? nearFromUrl.nearLng : null,
      nearFromUrl.nearActive ? nearFromUrl.nearKm : null,
      salonClientGendersFromUrl.join(","),
    ],
    queryFn: () => {
      const p = new URLSearchParams();
      const t = urlQ.trim();
      if (t) p.set("query", t);
      if (city) p.set("city", city);
      if (nearFromUrl.nearActive) {
        p.set("nearLat", String(nearFromUrl.nearLat));
        p.set("nearLng", String(nearFromUrl.nearLng));
        p.set("nearKm", String(nearFromUrl.nearKm));
      }
      for (const gender of salonClientGendersFromUrl) {
        p.append("salonClientGenders", gender);
      }
      return apiJson<OrganizationSummary[]>(`/api/v1/public/organizations?${p.toString()}`);
    },
    refetchOnMount: "always",
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  /** Chip tipologia: restringe l’elenco già in pagina (stessa risposta API di «tutti i risultati»). */
  const businessFilteredHits = useMemo(() => {
    const list = data ?? [];
    if (businessTypesFromUrl.length === 0) return list;
    return list.filter((o) =>
      organizationMatchesSalonBusinessTypes(o.salonBusinessTypes, businessTypesFromUrl, {
        name: o.name,
        slug: o.slug,
      }),
    );
  }, [data, businessTypesFromUrl]);

  const sortedHits = useMemo(() => {
    const list = businessFilteredHits;
    if (!sortByRating || list.length === 0) return list;
    return [...list].sort(compareOrganizationsByRatingThenReviews);
  }, [businessFilteredHits, sortByRating]);

  const totalResultsPages = useMemo(
    () => Math.max(1, Math.ceil(sortedHits.length / SEARCH_RESULTS_PAGE_SIZE)),
    [sortedHits.length],
  );

  useEffect(() => {
    setResultsPage(1);
  }, [urlQ, city, sortParam, nearFromUrl.nearActive, nearFromUrl.nearLat, nearFromUrl.nearLng, nearFromUrl.nearKm, salonClientGendersFromUrl, businessTypesKey]);

  useEffect(() => {
    setResultsPage((p) => Math.min(Math.max(1, p), totalResultsPages));
  }, [totalResultsPages]);

  useEffect(() => {
    if (totalResultsPages <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setResultsPage((p) => Math.max(1, p - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setResultsPage((p) => Math.min(totalResultsPages, p + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [totalResultsPages]);

  const pagedHits = useMemo(() => {
    const start = (resultsPage - 1) * SEARCH_RESULTS_PAGE_SIZE;
    return sortedHits.slice(start, start + SEARCH_RESULTS_PAGE_SIZE);
  }, [sortedHits, resultsPage]);

  useEffect(() => {
    if (skipResultsPageScrollRef.current) {
      skipResultsPageScrollRef.current = false;
      return;
    }
    resultsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [resultsPage]);

  const showSkeleton = isPending && data === undefined;
  const showNoHits = Boolean(data && !showSkeleton && sortedHits.length === 0);
  const showFilterEmpty = showNoHits && businessTypesFromUrl.length > 0;
  const showSearchEmpty = showNoHits && !showFilterEmpty;
  const resultsRefreshing = isFetching && isPlaceholderData;
  const activeTypeLabels = useMemo(
    () => businessTypesFromUrl.map((bt) => SALON_BUSINESS_TYPE_SHORT_LABELS[bt]),
    [businessTypesFromUrl],
  );

  return (
    <main className="velvet-page-main velvet-search-page">
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
          <span className="velvet-search-hero__title-text">Cerca salone</span>
        </h1>
        {date ? (
          <p className="velvet-page-subtitle velvet-search-hero__subtitle">Data richiesta: {date}.</p>
        ) : null}
      </header>

      <div
        className="velvet-search-typefilter"
        role="group"
        aria-label="Filtra per tipologia di salone"
      >
        {SALON_BUSINESS_TYPE_OPTIONS.map((opt) => {
          const active = businessTypesFromUrl.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={[
                "velvet-header-cta-pill",
                "velvet-search-typechip",
                active ? "velvet-search-typechip--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={active}
              onClick={() => toggleBusinessType(opt.id)}
            >
              <span className="velvet-header-partner-label">{SALON_BUSINESS_TYPE_SHORT_LABELS[opt.id]}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="velvet-alert velvet-alert--error" role="alert">
          {error instanceof Error ? error.message : "Errore"}
        </p>
      )}

      {showSkeleton ? (
        <div className="velvet-search-skeleton-grid" aria-hidden>
          {[0, 1, 2, 3].map((k) => (
            <div key={k} className="velvet-search-skeleton-card" />
          ))}
        </div>
      ) : null}

      {data && !showSkeleton && sortedHits.length > 0 ? (
        <>
          <p className="velvet-search-a11y-live" aria-live="polite" aria-atomic="true">
            {sortedHits.length} saloni trovati. Pagina {resultsPage} di {totalResultsPages}.
            {sortByRating ? " Ordinati per valutazione." : ""}
            {nearFromUrl.nearActive ? ` Entro circa ${nearFromUrl.nearKm} km dalla posizione richiesta.` : ""}
            {businessTypesFromUrl.length > 0
              ? ` Tipologia: ${businessTypesFromUrl.map((bt) => SALON_BUSINESS_TYPE_SHORT_LABELS[bt]).join(", ")}.`
              : ""}
            {isFetching ? " Aggiornamento in corso." : ""}
          </p>
          <div ref={resultsAnchorRef} className="velvet-search-results-anchor" />
          <div
            className={
              "velvet-search-results-head" +
              (resultsRefreshing && sortedHits.length === 0 ? " velvet-search-results-head--fetching" : "")
            }
          >
            <div className="velvet-search-results-head__text">
              <h2 className="velvet-search-results-title">Risultati</h2>
              <p className="velvet-search-results-count">
                <strong className="velvet-search-results-count__num">{sortedHits.length}</strong> saloni
                {urlQ.trim() ? (
                  <>
                    {" "}
                    per «<strong>{urlQ.trim()}</strong>»
                  </>
                ) : null}
                {totalResultsPages > 1 ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="velvet-search-results-count__page-hint">
                      {SEARCH_RESULTS_PAGE_SIZE} per pagina
                    </span>
                  </>
                ) : null}
                {sortByRating ? (
                  <>
                    {" "}
                    · <span className="velvet-search-results-count__page-hint">ordinati per stelle</span>
                  </>
                ) : null}
                {nearFromUrl.nearActive ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="velvet-search-results-count__page-hint">
                      entro ~{nearFromUrl.nearKm} km dalla tua posizione
                    </span>
                  </>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              className="velvet-search-results-refresh"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-busy={isFetching}
              title="Scarica di nuovo l’elenco dal server"
            >
              <span className={isFetching ? "velvet-search-results-refresh__icon is-spinning" : "velvet-search-results-refresh__icon"} aria-hidden>
                ↻
              </span>
              <span className="velvet-search-results-refresh__label">Aggiorna</span>
            </button>
          </div>
          <ul
            key={resultsPage}
            className={
              "velvet-search-grid velvet-search-grid--paged" +
              (resultsRefreshing ? " velvet-search-grid--refreshing" : "")
            }
          >
            {pagedHits.map((o) => {
              const avg = o.averageRating;
              const reviewCaption = searchHitReviewCaption(o);
              const showReview =
                typeof avg === "number" && Number.isFinite(avg) && reviewCaption != null;
              const audienceLabel = formatSalonClientAudienceLabel(o.salonClientGenders);
              const businessTypeIds = normalizeSalonBusinessTypeIds(o.salonBusinessTypes);
              const pageToneClass =
                resultsPage === 1 ? " velvet-search-card--page-lead" : " velvet-search-card--page-following";
              return (
                <li key={o.id} className={"velvet-search-card" + pageToneClass}>
                  <Link
                    to={`/s/${encodeURIComponent(o.slug)}`}
                    replace
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
                      <h3 className="velvet-search-card-name">{highlightName(o.name, urlQ)}</h3>
                      {showReview ? (
                        <div className="velvet-search-card-rating">
                          <StarRatingDisplay rating={avg} caption={reviewCaption} />
                        </div>
                      ) : null}
                      {businessTypeIds.length > 0 ? (
                        <div className="velvet-search-card-types">
                          {businessTypeIds.map((bt) => (
                            <span key={bt} className="velvet-search-card-type">
                              {SALON_BUSINESS_TYPE_SHORT_LABELS[bt]}
                            </span>
                          ))}
                        </div>
                      ) : null}
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
          {totalResultsPages > 1 ? (
            <nav className="velvet-search-pagination" aria-label="Pagine risultati ricerca">
              <span className="velvet-search-pagination__status">
                Pagina <strong>{resultsPage}</strong> di {totalResultsPages}
              </span>
              <div className="velvet-search-pagination__bar">
                <button
                  type="button"
                  className="velvet-search-pagination__btn"
                  disabled={resultsPage <= 1}
                  onClick={() => setResultsPage((p) => Math.max(1, p - 1))}
                >
                  ← Precedente
                </button>
                <div className="velvet-search-pagination__pages">
                  {buildPaginationItems(totalResultsPages, resultsPage).map((n, idx) =>
                    n === null ? (
                      <span key={`gap-${idx}`} className="velvet-search-pagination__ellipsis" aria-hidden>
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        className={
                          "velvet-search-pagination__page" +
                          (n === resultsPage ? " velvet-search-pagination__page--active" : "")
                        }
                        onClick={() => setResultsPage(n)}
                        aria-current={n === resultsPage ? "page" : undefined}
                      >
                        {n}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  className="velvet-search-pagination__btn"
                  disabled={resultsPage >= totalResultsPages}
                  onClick={() => setResultsPage((p) => Math.min(totalResultsPages, p + 1))}
                >
                  Successiva →
                </button>
              </div>
            </nav>
          ) : null}
        </>
      ) : null}

      {showFilterEmpty ? (
        <SearchEmptyState
          variant="filter-no-match"
          queryLabel={urlQ.trim() || undefined}
          activeTypeLabels={activeTypeLabels}
          onClearTypeFilters={clearBusinessTypeFilters}
        />
      ) : null}

      {showSearchEmpty ? <SearchEmptyState variant="no-results" /> : null}
    </main>
  );
}
