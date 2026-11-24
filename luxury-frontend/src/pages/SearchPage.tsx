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
import "../styles/luxury-search-page.css";

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
        <mark key={i} className="luxury-search-hit-mark">
          {part}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
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

function SearchEmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function SearchEmptyState({
  hasTypeFilters = false,
  activeTypeLabels = [],
}: {
  hasTypeFilters?: boolean;
  activeTypeLabels?: string[];
}) {
  const titleId = "luxury-search-empty-title";
  const typesLine = activeTypeLabels.length > 0 ? activeTypeLabels.join(", ") : null;

  return (
    <section
      className="luxury-search-empty-state luxury-search-empty-state--docked"
      aria-labelledby={titleId}
      role="status"
    >
      <div className="luxury-search-empty-state__glow" aria-hidden />
      <div className="luxury-search-empty-state__icon" aria-hidden>
        <SearchEmptyIcon />
      </div>
      <h2 id={titleId} className="luxury-search-empty-title">
        Nessun salone trovato
      </h2>
      <p className="luxury-search-empty-lead">
        {hasTypeFilters ? (
          typesLine ? (
            <>
              Nessun risultato per <strong className="luxury-search-empty-hl">{typesLine}</strong>
              {activeTypeLabels.length > 1 ? " con i filtri selezionati" : ""}.
            </>
          ) : (
            <>Nessun risultato con i filtri attivi.</>
          )
        ) : (
          <>Prova un&apos;altra parola o un&apos;altra città, oppure torna alla home per ripartire.</>
        )}
      </p>
      <div className="luxury-search-empty-actions">
        <Link to="/" className="luxury-search-empty-btn luxury-search-empty-btn--primary">
          Torna alla home
        </Link>
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

  const [resultsPage, setResultsPage] = useState(1);
  const resultsAnchorRef = useRef<HTMLDivElement>(null);
  const skipResultsPageScrollRef = useRef(true);

  const { data, isFetching, isPending, isPlaceholderData, error } = useQuery<
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
    <main className="luxury-page-main luxury-search-page">
      <div className="luxury-search-back-row">
        <button
          type="button"
          className="luxury-search-back"
          aria-label="Torna indietro"
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
          Torna indietro
        </button>
      </div>
      <header className="luxury-search-hero">
        <div className="luxury-search-hero__glow" aria-hidden />
        <h1 className="luxury-page-title">
          <span className="luxury-search-hero__title-text">Cerca salone</span>
        </h1>
        {date ? (
          <p className="luxury-page-subtitle luxury-search-hero__subtitle">Data richiesta: {date}.</p>
        ) : null}
      </header>

      <div
        className="luxury-search-typefilter"
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
                "luxury-header-cta-pill",
                "luxury-search-typechip",
                active ? "luxury-search-typechip--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={active}
              onClick={() => toggleBusinessType(opt.id)}
            >
              <span className="luxury-header-partner-label">{SALON_BUSINESS_TYPE_SHORT_LABELS[opt.id]}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="luxury-alert luxury-alert--error" role="alert">
          {error instanceof Error ? error.message : "Errore"}
        </p>
      )}

      <div className="luxury-search-stage">
      {showSkeleton ? (
        <div className="luxury-search-skeleton-grid" aria-hidden>
          {[0, 1, 2, 3].map((k) => (
            <div key={k} className="luxury-search-skeleton-card" />
          ))}
        </div>
      ) : null}

      {data && !showSkeleton && sortedHits.length > 0 ? (
        <>
          <p className="luxury-search-a11y-live" aria-live="polite" aria-atomic="true">
            {sortedHits.length} saloni trovati. Pagina {resultsPage} di {totalResultsPages}.
            {sortByRating ? " Ordinati per valutazione." : ""}
            {nearFromUrl.nearActive ? ` Entro circa ${nearFromUrl.nearKm} km dalla posizione richiesta.` : ""}
            {businessTypesFromUrl.length > 0
              ? ` Tipologia: ${businessTypesFromUrl.map((bt) => SALON_BUSINESS_TYPE_SHORT_LABELS[bt]).join(", ")}.`
              : ""}
            {isFetching ? " Aggiornamento in corso." : ""}
          </p>
          <div ref={resultsAnchorRef} className="luxury-search-results-anchor" />
          <ul
            key={resultsPage}
            className={
              "luxury-search-grid luxury-search-grid--paged" +
              (resultsRefreshing ? " luxury-search-grid--refreshing" : "")
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
                resultsPage === 1 ? " luxury-search-card--page-lead" : " luxury-search-card--page-following";
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
                      <h3 className="luxury-search-card-name">{highlightName(o.name, urlQ)}</h3>
                      {showReview ? (
                        <div className="luxury-search-card-rating">
                          <StarRatingDisplay rating={avg} caption={reviewCaption} />
                        </div>
                      ) : null}
                      {businessTypeIds.length > 0 ? (
                        <div className="luxury-search-card-types">
                          {businessTypeIds.map((bt) => (
                            <span key={bt} className="luxury-search-card-type">
                              {SALON_BUSINESS_TYPE_SHORT_LABELS[bt]}
                            </span>
                          ))}
                        </div>
                      ) : null}
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
          {totalResultsPages > 1 ? (
            <nav className="luxury-search-pagination" aria-label="Pagine risultati ricerca">
              <span className="luxury-search-pagination__status">
                Pagina <strong>{resultsPage}</strong> di {totalResultsPages}
              </span>
              <div className="luxury-search-pagination__bar">
                <button
                  type="button"
                  className="luxury-search-pagination__btn"
                  disabled={resultsPage <= 1}
                  onClick={() => setResultsPage((p) => Math.max(1, p - 1))}
                >
                  ← Precedente
                </button>
                <div className="luxury-search-pagination__pages">
                  {buildPaginationItems(totalResultsPages, resultsPage).map((n, idx) =>
                    n === null ? (
                      <span key={`gap-${idx}`} className="luxury-search-pagination__ellipsis" aria-hidden>
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        className={
                          "luxury-search-pagination__page" +
                          (n === resultsPage ? " luxury-search-pagination__page--active" : "")
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
                  className="luxury-search-pagination__btn"
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
        <SearchEmptyState hasTypeFilters activeTypeLabels={activeTypeLabels} />
      ) : null}

      {showSearchEmpty ? <SearchEmptyState /> : null}
      </div>
    </main>
  );
}
