import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiJson } from "../api/client";
import type { OrganizationSummary } from "../api/types";
import { locateByPlace, locateByPostal, locateByPostalSuggestions, reverseLocate } from "../api/locate";
import {
  COUNTRIES,
  countryFlagEmoji,
  getStaticCityEntries,
  type CountryCode,
  expectedCapLength,
  isFreeformPostalCountry,
  isPostalComplete,
  isSearchCountryCode,
  italianLocalitiesByCapPrefix,
  minPostalResolveLength,
  normalizePostalInput,
  resolveItalianCityForCap,
} from "../data/searchLocations";
import { trendIdeaGroupsForHome } from "../data/trendingIdeas";
import { SPONSORED_SALONS_FEATURED_CARD, TOP_OPERATORS_FEATURED_CARD } from "../data/topOperatorsFeatured";
import { NationsCupTrophyIcon } from "../components/NationsCupTrophyIcon";
import { useLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";
import { mergeQuickSuggestGroups, type QuickSuggestAvailability } from "../data/quickSuggestGroups";
import { PartnerSignupLink } from "../components/PartnerSignupLink";
import { SearchHitLogoAvatar } from "../components/SearchHitLogoAvatar";
import { formatSalonCityForDisplay } from "../lib/formatSalonCityForDisplay";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useEditorialCookieAllowed, useMapsCookieAllowed } from "../hooks/useCookieConsent";
import { editorialBackgroundImage } from "../lib/editorialMedia";
import { geolocationErrorMessage, requestGeolocationCoords } from "../lib/geolocationRequest";
import { prefetchSalonPublicPage } from "../lib/prefetchSalonPublicPage";
import type { SalonOrgNavState } from "../lib/publicOrganizationDetail";
import type { SalonClientGenderId } from "../data/salonClientGenders";
import { SALON_BUSINESS_TYPE_OPTIONS, type SalonBusinessTypeId } from "../data/salonBusinessTypes";
import { useLuxuryLocale } from "../i18n/useLuxuryLocale";
import { localizedCountryName } from "../i18n/localizedCountryName";
import { persistSearchCountry, readStoredSearchCountry } from "../i18n/searchCountryStorage";
import { storySlidesForHome, type StorySlide } from "../i18n/homeCarouselContent";
import { localizedTrendGroupHeading, localizedTrendText } from "../i18n/homeTrendTranslations";
import { localizeQuickSuggestGroups } from "../i18n/homeQuickTranslations";
import "../styles/luxury-home.css";
import "../styles/top-operators-page.css";
import "../styles/nations-cup-page.css";

/** Raggio (km) per i tag «Oppure un tocco»: saloni con coordinate entro questo raggio dalla posizione GPS. */
const QUICK_NEAR_RADIUS_KM = 25;

type CityPlaceSuggestionRow = {
  key: string;
  label: string;
  /** Se presente (lista statica), valorizziamo anche il CAP al click. */
  cap?: string;
  detail?: string;
};

function HeroStoryCarousel({ nativeApp = false, editorialAllowed = false }: { nativeApp?: boolean; editorialAllowed?: boolean }) {
  const { t } = useLuxuryLocale();
  const slides = useMemo(() => storySlidesForHome(t, nativeApp), [t, nativeApp]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  const autoplayMs = nativeApp ? 5000 : 6500;

  useEffect(() => {
    setIndex(0);
  }, [nativeApp, slides]);

  useEffect(() => {
    if (paused && !nativeApp) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % n);
    }, autoplayMs);
    return () => window.clearInterval(timer);
  }, [paused, n, nativeApp, autoplayMs]);

  const go = (delta: number) => {
    setIndex((i) => (i + delta + n) % n);
  };

  const textBlock = (slide: StorySlide) => {
    if (slide.kind === "brand") {
      return (
        <>
          <p
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              margin: "0 0 0.75rem",
              color: "var(--luxury-orange)",
            }}
          >
            {t("home.carousel.brand.eyebrow")}
          </p>
          <h2
            style={{
              fontSize: "clamp(1.45rem, 3.2vw, 2.1rem)",
              fontWeight: 700,
              lineHeight: 1.18,
              margin: 0,
              letterSpacing: "-0.03em",
              color: "var(--luxury-surface)",
            }}
          >
            {t("home.carousel.brand.titleLine1")}
            <br />
            <span style={{ color: "var(--luxury-orange)" }}>{t("home.carousel.brand.titleHighlight")}</span>
            {t("home.carousel.brand.titleLine2")}
          </h2>
          <p
            style={{
              margin: "1rem 0 0",
              fontSize: "1rem",
              lineHeight: 1.55,
              opacity: 0.9,
              maxWidth: 400,
              color: "var(--luxury-surface)",
            }}
          >
            {t("home.carousel.brand.body")}
          </p>
        </>
      );
    }
    return (
      <>
        <p
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            margin: "0 0 0.75rem",
            color: "var(--luxury-orange)",
          }}
        >
          {slide.eyebrow}
        </p>
        <h2
          style={{
            fontSize: "clamp(1.45rem, 3.2vw, 2.1rem)",
            fontWeight: 700,
            lineHeight: 1.18,
            margin: 0,
            letterSpacing: "-0.03em",
            color: "var(--luxury-surface)",
          }}
        >
          {slide.titleBefore}
          <span style={{ color: "var(--luxury-orange)" }}>{slide.titleHighlight}</span>
          {slide.titleAfter}
        </h2>
        <p
          style={{
            margin: "1rem 0 0",
            fontSize: "1rem",
            lineHeight: 1.55,
            opacity: 0.92,
            maxWidth: 420,
            color: "var(--luxury-surface)",
          }}
        >
          {slide.body}
        </p>
      </>
    );
  };

  return (
    <div
      className={
        nativeApp ? "luxury-hero-carousel luxury-hero-carousel--native-app" : "luxury-hero-carousel"
      }
      role="region"
      aria-roledescription="carousel"
      aria-label={t("home.featuredAria")}
      onMouseEnter={
        nativeApp
          ? undefined
          : () => {
              if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) setPaused(true);
            }
      }
      onMouseLeave={
        nativeApp
          ? undefined
          : () => {
              if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) setPaused(false);
            }
      }
      style={
        nativeApp
          ? undefined
          : {
              marginTop: "clamp(2.25rem, 5vw, 3.5rem)",
              maxWidth: 1120,
              marginLeft: "auto",
              marginRight: "auto",
              position: "relative",
            }
      }
    >
      <div className="luxury-hero-carousel-viewport">
        <div
          className="luxury-hero-carousel-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, slideIndex) => (
            <div
              key={slide.id}
              className="luxury-hero-carousel-slide"
              style={
                nativeApp
                  ? undefined
                  : { flex: "0 0 100%", width: "100%", minWidth: 0, maxWidth: "100%" }
              }
              aria-hidden={slideIndex !== index}
            >
              {slide.kind === "brand" ? (
                <div
                  className="luxury-hero-story"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.25fr) minmax(200px, 0.75fr)",
                    alignItems: "stretch",
                    gap: 0,
                    background:
                      "linear-gradient(125deg, #7c2d12 0%, #9a3412 28%, #c2410c 52%, #ea580c 78%, #fdba74 120%)",
                    minHeight: "clamp(220px, 36vw, 320px)",
                  }}
                >
                  <div
                    style={{
                      padding: "clamp(1.75rem, 4vw, 2.75rem) clamp(1.5rem, 4vw, 2.5rem)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    {textBlock(slide)}
                  </div>
                  <div
                    className="luxury-hero-story-accent"
                    aria-hidden
                    style={{
                      minHeight: 140,
                      background:
                        "radial-gradient(ellipse 90% 80% at 80% 30%, #ffedd5 0%, rgba(251,146,60,0.5) 45%, rgba(194,65,12,0.35) 100%), linear-gradient(160deg, rgba(124,45,18,0.5), rgba(249,115,22,0.35))",
                    }}
                  />
                </div>
              ) : (
                <div
                  className="luxury-hero-slide-photo"
                  style={
                    nativeApp
                      ? {
                          backgroundImage: editorialBackgroundImage(
                            "linear-gradient(105deg, rgba(124,45,18,0.88) 0%, rgba(194,65,12,0.5) 42%, rgba(251,146,60,0.2) 100%)",
                            slide.image,
                            editorialAllowed,
                          ),
                        }
                      : {
                          position: "relative",
                          minHeight: "clamp(240px, 42vw, 360px)",
                          backgroundImage: editorialBackgroundImage(
                            "linear-gradient(105deg, rgba(124,45,18,0.88) 0%, rgba(194,65,12,0.5) 42%, rgba(251,146,60,0.2) 100%)",
                            slide.image,
                            editorialAllowed,
                          ),
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          padding: "clamp(1.75rem, 4vw, 2.75rem) clamp(1.5rem, 4vw, 2.5rem)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                        }
                  }
                >
                  <div
                    className={nativeApp ? "luxury-hero-slide-photo__copy" : undefined}
                    style={nativeApp ? undefined : { maxWidth: 520 }}
                    role="group"
                    aria-label={slide.imageAlt}
                  >
                    {textBlock(slide)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {!nativeApp ? (
          <>
            <button
              type="button"
              className="luxury-hero-carousel-nav luxury-carousel-prev"
              onClick={() => go(-1)}
              aria-label={t("home.slidePrev")}
            >
              <span aria-hidden>‹</span>
            </button>
            <button
              type="button"
              className="luxury-hero-carousel-nav luxury-carousel-next"
              onClick={() => go(1)}
              aria-label={t("home.slideNext")}
            >
              <span aria-hidden>›</span>
            </button>

            <div className="luxury-carousel-dots-wrap" role="tablist" aria-label={t("home.slideSelect")}>
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={t("home.slideOf", { current: i + 1, total: n })}
                  onClick={() => setIndex(i)}
                  className={i === index ? "luxury-carousel-dot is-active" : "luxury-carousel-dot"}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function trendCardBg(image: string): string {
  return `linear-gradient(165deg, rgba(45, 16, 6, 0.2) 0%, rgba(67, 20, 7, 0.55) 45%, rgba(30, 10, 4, 0.88) 100%), url(${image})`;
}

function HomeMegaSearchLensIcon() {
  return (
    <svg
      className="luxury-mega-submit__icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2.25" />
      <path
        d="M16 16l5 5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function HomePage() {
  const queryClient = useQueryClient();
  const nav = useNavigate();
  const isNativeApp = useLuxuryNativeAppShell();
  const editorialAllowed = useEditorialCookieAllowed();
  const mapsAllowed = useMapsCookieAllowed();
  const { locale, t, setLocaleFromCountry, profileLocaleLocked } = useLuxuryLocale();
  const businessTypeFilterLabels = useMemo(
    (): Record<SalonBusinessTypeId, string> => ({
      HAIR: t("home.type.hair"),
      BEAUTY: t("home.type.beauty"),
      MASSAGE: t("home.type.massage"),
    }),
    [t],
  );
  const trendingGroups = useMemo(() => {
    const raw = trendIdeaGroupsForHome({ nativeApp: isNativeApp });
    return raw.map((group) => ({
      ...group,
      heading: localizedTrendGroupHeading(locale, group.id, group.heading),
      items: group.items.map((idea) => {
        const text = localizedTrendText(locale, group.id, idea.id, {
          title: idea.title,
          alt: idea.imageAlt,
        });
        return { ...idea, title: text.title, imageAlt: text.alt };
      }),
    }));
  }, [isNativeApp, locale]);
  const trendingGridClass = isNativeApp
    ? "luxury-trending-grid luxury-trending-grid--native-four"
    : "luxury-trending-grid luxury-trending-grid--three";
  const [salonName, setSalonName] = useState("");
  const [country, setCountryState] = useState<CountryCode>(() => {
    const stored = readStoredSearchCountry();
    if (stored && COUNTRIES.some((c) => c.code === stored)) return stored;
    return "IT";
  });
  const applyCountry = useCallback(
    (code: CountryCode) => {
      setCountryState(code);
      persistSearchCountry(code);
      if (!profileLocaleLocked) {
        setLocaleFromCountry(code);
      }
    },
    [setLocaleFromCountry, profileLocaleLocked],
  );
  /** Città: testo libero, oppure valore `country|cap|city` se scelto dai suggerimenti. */
  const [cityInput, setCityInput] = useState("");
  const [capInput, setCapInput] = useState("");
  const [businessTypeFilter, setBusinessTypeFilter] = useState<SalonBusinessTypeId | "">("");
  const [quickSuggestionsOpen, setQuickSuggestionsOpen] = useState(false);
  const lastGeoCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const [quickAvailability, setQuickAvailability] = useState<QuickSuggestAvailability | null>(null);
  const [quickAvailabilityStatus, setQuickAvailabilityStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [formHint, setFormHint] = useState<string | null>(null);

  const quickSuggestGroups = useMemo(
    () =>
      localizeQuickSuggestGroups(
        locale,
        mergeQuickSuggestGroups(quickAvailabilityStatus === "ready" ? quickAvailability : null),
      ),
    [quickAvailability, quickAvailabilityStatus, locale],
  );

  const loadQuickSuggestNear = useCallback(async () => {
    setQuickAvailabilityStatus("loading");
    setFormHint(null);
    try {
      const { lat, lng } = await requestGeolocationCoords();
      lastGeoCoordsRef.current = { lat, lng };
      const p = new URLSearchParams({
        nearLat: String(lat),
        nearLng: String(lng),
        nearKm: String(QUICK_NEAR_RADIUS_KM),
      });
      const data = await apiJson<QuickSuggestAvailability>(
        `/api/v1/public/organizations/quick-suggest-availability?${p.toString()}`,
      );
      setQuickAvailability({
        curatedQueries: data.curatedQueries ?? [],
        extras: data.extras ?? [],
      });
      setQuickAvailabilityStatus("ready");
    } catch (err) {
      setFormHint(geolocationErrorMessage(err));
      setQuickAvailability(null);
      setQuickAvailabilityStatus("error");
    }
  }, []);

  const openQuickSuggestions = useCallback(() => {
    setQuickSuggestionsOpen(true);
    void loadQuickSuggestNear();
  }, [loadQuickSuggestNear]);
  const [capPreview, setCapPreview] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ok"; city: string; displayName: string }
    | { status: "not_found" }
    | { status: "error" }
  >({ status: "idle" });
  const [capLookupSubmitting, setCapLookupSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [megaFocused, setMegaFocused] = useState(false);
  /** Lista suggerimenti CAP: si nasconde al click fuori dal campo (o si riapre con focus / nuovo testo). */
  const capFieldRef = useRef<HTMLDivElement>(null);
  const [capSuggestDismissed, setCapSuggestDismissed] = useState(false);
  const cityFieldRef = useRef<HTMLDivElement>(null);
  const [citySuggestDismissed, setCitySuggestDismissed] = useState(false);

  useEffect(() => {
    setCapSuggestDismissed(false);
  }, [capInput, country]);

  useEffect(() => {
    setCitySuggestDismissed(false);
  }, [cityInput, country]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const capRoot = capFieldRef.current;
      const cityRoot = cityFieldRef.current;
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (capRoot?.contains(t)) return;
      if (cityRoot?.contains(t)) return;
      setCapSuggestDismissed(true);
      setCitySuggestDismissed(true);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  const debouncedSalonName = useDebouncedValue(salonName, 260);
  const debouncedCityInput = useDebouncedValue(cityInput, 240);
  const liveSalonPreview = useQuery({
    queryKey: ["orgs", "hero-live", debouncedSalonName],
    queryFn: () => {
      const p = new URLSearchParams();
      const t = debouncedSalonName.trim();
      if (t) p.set("query", t);
      return apiJson<OrganizationSummary[]>(`/api/v1/public/organizations?${p.toString()}`);
    },
    enabled: megaFocused && debouncedSalonName.trim().length >= 1,
    staleTime: 12_000,
  });

  const capNormalized = useMemo(() => normalizePostalInput(capInput, country), [capInput, country]);
  const capLen = expectedCapLength(country);
  const capFreeform = isFreeformPostalCountry(country);
  const capComplete = isPostalComplete(capNormalized, country);
  const capResolveMin = minPostalResolveLength(country);
  const staticCitySuggestions = getStaticCityEntries(country);

  const dynamicPlaceSuggestionsQ = useQuery({
    queryKey: ["locate", "place-suggestions", country, debouncedCityInput],
    queryFn: () => locateByPlace(debouncedCityInput.trim(), country, 10),
    enabled: mapsAllowed && debouncedCityInput.trim().length >= 2,
    staleTime: 30_000,
    retry: false,
  });

  const cityPlaceSuggestionRows = useMemo((): CityPlaceSuggestionRow[] => {
    const query = cityInput.trim().toLowerCase();
    if (!query) return [];
    const out: CityPlaceSuggestionRow[] = [];
    const dedupeLabels = new Set<string>();

    const push = (row: CityPlaceSuggestionRow) => {
      const lk = row.label.trim().toLowerCase();
      if (!lk || dedupeLabels.has(lk)) return;
      dedupeLabels.add(lk);
      out.push(row);
    };

    for (const p of dynamicPlaceSuggestionsQ.data ?? []) {
      const label = p.name.trim();
      if (!label.toLowerCase().includes(query)) continue;
      const dn = p.displayName?.trim();
      let detail: string | undefined;
      if (dn && dn.toLowerCase() !== label.toLowerCase()) {
        detail = dn.length > 72 ? `${dn.slice(0, 69)}…` : dn;
      } else if (p.countryName) {
        detail = p.countryName;
      }
      push({
        key: `dyn-${country}-${label}-${detail ?? ""}`,
        label,
        detail,
      });
      if (out.length >= 15) return out;
    }

    for (const c of staticCitySuggestions) {
      const name = c.city.trim();
      if (!name.toLowerCase().includes(query)) continue;
      const capNorm = normalizePostalInput(c.cap, country);
      const detail = [capNorm || c.cap, c.province].filter(Boolean).join(" · ");
      push({
        key: `st-${country}-${capNorm || c.cap}-${name}`,
        label: name,
        cap: capNorm || undefined,
        detail: detail || undefined,
      });
      if (out.length >= 15) break;
    }
    return out;
  }, [cityInput, country, dynamicPlaceSuggestionsQ.data, staticCitySuggestions]);

  const citySuggestOpen =
    cityInput.trim().length >= 1 && cityPlaceSuggestionRows.length > 0 && !citySuggestDismissed;

  const capSuggestionQ = useQuery({
    queryKey: ["locate", "postal-suggestions", country, capNormalized],
    queryFn: () => locateByPostalSuggestions(capNormalized, country, 100),
    enabled: mapsAllowed && country !== "IT" && capNormalized.length >= 2,
    staleTime: 30_000,
    retry: false,
  });

  const capCitySuggestions = useMemo(() => {
    if (capNormalized.length === 0) return [];
    const out: { cap: string; city: string }[] = [];
    const dedupe = new Set<string>();

    if (country === "IT") {
      for (const row of italianLocalitiesByCapPrefix(capNormalized)) {
        const key = `${row.city.toLowerCase()}|${row.cap}`;
        if (dedupe.has(key)) continue;
        dedupe.add(key);
        out.push(row);
      }
      return out;
    }

    for (const item of capSuggestionQ.data ?? []) {
      const city = item.name.trim();
      if (!city) continue;
      const key = city.toLowerCase();
      if (dedupe.has(key)) continue;
      dedupe.add(key);
      out.push({ cap: capNormalized, city });
    }
    for (const c of staticCitySuggestions) {
      const normalizedCap = normalizePostalInput(c.cap, country);
      if (!normalizedCap) continue;
      if (!normalizedCap.startsWith(capNormalized)) continue;
      const city = c.city.trim();
      const key = city.toLowerCase();
      if (dedupe.has(key)) continue;
      dedupe.add(key);
      out.push({ cap: normalizedCap, city });
    }
    return out;
  }, [capNormalized, country, capSuggestionQ.data, staticCitySuggestions]);

  const goSearch = (
    q: string,
    c?: string,
    opts?: {
      near?: { lat: number; lng: number; km: number };
      sortRating?: boolean;
      salonClientGenders?: SalonClientGenderId[];
      salonBusinessTypes?: SalonBusinessTypeId[];
    },
  ) => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (opts?.near) {
      p.set("nearLat", String(opts.near.lat));
      p.set("nearLng", String(opts.near.lng));
      p.set("nearKm", String(opts.near.km));
    } else if (c?.trim()) {
      p.set("city", c.trim());
    }
    if (opts?.salonClientGenders) {
      for (const gender of opts.salonClientGenders) {
        p.append("salonClientGender", gender);
      }
    }
    if (opts?.salonBusinessTypes) {
      for (const bt of opts.salonBusinessTypes) {
        p.append("businessType", bt);
      }
    }
    if (opts?.sortRating) p.set("sort", "rating");
    const qs = p.toString();
    nav(qs ? `/search?${qs}` : "/search");
  };

  type HomeSearchOpts = {
    near?: { lat: number; lng: number; km: number };
    sortRating?: boolean;
    salonClientGenders?: SalonClientGenderId[];
    salonBusinessTypes?: SalonBusinessTypeId[];
  };

  const withBusinessTypeFilter = (opts?: HomeSearchOpts): HomeSearchOpts | undefined => {
    if (!businessTypeFilter) return opts;
    return { ...opts, salonBusinessTypes: [businessTypeFilter] };
  };

  const buildNearSearchOptions = (): { near: { lat: number; lng: number; km: number } } | undefined => {
    const coords = lastGeoCoordsRef.current;
    if (!coords) return undefined;
    return { near: { lat: coords.lat, lng: coords.lng, km: QUICK_NEAR_RADIUS_KM } };
  };

  const resolveCityFromCap = useCallback(async () => {
    if (!capComplete) return { city: null as string | null, notFound: false as const };
    if (country === "IT" && !mapsAllowed) {
      const localCity = resolveItalianCityForCap(capNormalized);
      if (!localCity) return { city: null, notFound: true as const };
      return { city: localCity, notFound: false as const };
    }
    if (!mapsAllowed) return { city: null, notFound: true as const };
    const r = await locateByPostal(capNormalized, country);
    if (!r) return { city: null, notFound: true as const };
    return { city: r.city, notFound: false as const };
  }, [capComplete, capNormalized, country, mapsAllowed]);

  const resolveSearchCity = useCallback(async (): Promise<{ city: string; error: string | null }> => {
    const raw = cityInput.trim();
    if (raw) return { city: raw, error: null };
    if (capNormalized.length === 0) return { city: "", error: null };
    if (!capComplete) {
      const countryName =
        localizedCountryName(country, locale, COUNTRIES.find((c) => c.code === country)?.name ?? country);
      if (capFreeform) {
        return {
          city: "",
          error: t("home.postcodeIncomplete", { min: capResolveMin, country: countryName }),
        };
      }
      return {
        city: "",
        error: t("home.capIncomplete", { len: capLen, country: countryName }),
      };
    }
    if (!mapsAllowed && country !== "IT") {
      return {
        city: "",
        error: t("home.capNeedMapsShort"),
      };
    }
    try {
      const { city: c, notFound } = await resolveCityFromCap();
      if (notFound || !c) {
        return {
          city: "",
          error: t("home.capResolveFail"),
        };
      }
      return { city: c, error: null };
    } catch {
      return { city: "", error: t("home.capResolveError") };
    }
  }, [
    cityInput,
    capNormalized,
    capComplete,
    capFreeform,
    capResolveMin,
    capLen,
    country,
    mapsAllowed,
    resolveCityFromCap,
    locale,
    t,
  ]);

  useEffect(() => {
    setFormHint(null);
    if (cityInput.trim()) {
      setCapPreview({ status: "idle" });
      return;
    }
    if (!capComplete) {
      setCapPreview({ status: "idle" });
      return;
    }
    if (!mapsAllowed && country !== "IT") {
      setCapPreview({ status: "idle" });
      return;
    }
    let cancelled = false;
    setCapPreview({ status: "loading" });
    const t = setTimeout(() => {
      void (async () => {
        try {
          if (country === "IT" && !mapsAllowed) {
            const localCity = resolveItalianCityForCap(capNormalized);
            if (cancelled) return;
            if (localCity) {
              setCapPreview({ status: "ok", city: localCity, displayName: localCity });
            } else {
              setCapPreview({ status: "not_found" });
            }
            return;
          }
          const r = await locateByPostal(capNormalized, country);
          if (cancelled) return;
          if (r) {
            setCapPreview({ status: "ok", city: r.city, displayName: r.displayName });
          } else {
            setCapPreview({ status: "not_found" });
          }
        } catch {
          if (!cancelled) setCapPreview({ status: "error" });
        }
      })();
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [capNormalized, capComplete, country, cityInput, mapsAllowed]);

  const runGeoLocateForFilters = useCallback(async (): Promise<{ city: string | null; error: string | null }> => {
    setGeoLoading(true);
    setFormHint(null);
    try {
      const { lat, lng } = await requestGeolocationCoords();
      lastGeoCoordsRef.current = { lat, lng };
      let r: Awaited<ReturnType<typeof reverseLocate>>;
      try {
        r = await reverseLocate(lat, lng);
      } catch {
        const msg = t("home.geoServiceDown");
        setFormHint(msg);
        return { city: null, error: msg };
      }
      if (!r || !r.city.trim()) {
        const msg = t("home.geoNoPlace");
        setFormHint(msg);
        return { city: null, error: msg };
      }
      const nextCountry = isSearchCountryCode(r.countryCode) ? (r.countryCode as CountryCode) : null;
      if (nextCountry) {
        applyCountry(nextCountry);
      } else if (r.countryCode && !profileLocaleLocked) {
        setLocaleFromCountry(r.countryCode);
      }
      const effectiveCountry: CountryCode = nextCountry ?? country;
      const resolvedCity = r.city.trim();
      setCityInput(resolvedCity);
      let pc = "";
      if (r.postalCode) {
        pc = normalizePostalInput(r.postalCode, effectiveCountry);
        const len = expectedCapLength(effectiveCountry);
        if (len > 0 && pc.length > len) pc = pc.slice(0, len);
      }
      setCapInput(pc);
      setCapSuggestDismissed(true);
      setCitySuggestDismissed(true);
      return { city: resolvedCity, error: null };
    } catch (err) {
      const msg = geolocationErrorMessage(err);
      setFormHint(msg);
      return { city: null, error: msg };
    } finally {
      setGeoLoading(false);
    }
  }, [country, applyCountry, profileLocaleLocked, setLocaleFromCountry, t]);

  const handleGeoLocateForFilters = useCallback(() => {
    void runGeoLocateForFilters();
  }, [runGeoLocateForFilters]);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormHint(null);
    setCapLookupSubmitting(true);
    try {
      const { city, error } = await resolveSearchCity();
      if (error) {
        setFormHint(error);
        return;
      }
      goSearch(salonName, city, withBusinessTypeFilter(buildNearSearchOptions()));
    } finally {
      setCapLookupSubmitting(false);
    }
  };

  return (
    <>
      <section className="luxury-hero-wrap">
        <Link
          to="/nations-cup"
          className="luxury-nations-cup-floater"
          aria-label={`${t("home.nationsCup.title")}. ${t("home.nationsCup.subtitle")}`}
        >
          <NationsCupTrophyIcon className="luxury-nations-cup-floater__cup" />
          <span className="luxury-nations-cup-floater__title">{t("home.nationsCup.title")}</span>
          <span className="luxury-nations-cup-floater__badge">{t("home.nationsCup.badge")}</span>
        </Link>
        <div className="luxury-home-inner">
          <h1 className="luxury-home-title">
            <span className="luxury-home-title__text">{t("home.title")}</span>
          </h1>
          <p className="luxury-home-lead luxury-home-lead--epigraph">
            <span className="luxury-home-lead__quote" aria-hidden="true">
              «
            </span>
            <span className="luxury-home-lead__text">{t("home.lead")}</span>
            <span className="luxury-home-lead__quote luxury-home-lead__quote--end" aria-hidden="true">
              »
            </span>
          </p>

          <form onSubmit={onSearch} className="luxury-home-form">
            <label htmlFor="luxury-mega-q" className="visually-hidden">
              {t("home.searchLabel")}
            </label>
            <div
              className="luxury-mega-search-wrap"
              onFocusCapture={() => setMegaFocused(true)}
              onBlurCapture={(e) => {
                const next = e.relatedTarget as Node | null;
                if (next && e.currentTarget.contains(next)) return;
                window.setTimeout(() => setMegaFocused(false), 200);
              }}
            >
              <div
                className={
                  isNativeApp
                    ? "luxury-mega-search luxury-mega-search--native-app"
                    : "luxury-mega-search"
                }
              >
                <input
                  id="luxury-mega-q"
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  placeholder={t("home.searchPlaceholder")}
                  className="luxury-mega-input"
                  autoComplete="organization"
                  enterKeyHint="search"
                />
                <button
                  type="submit"
                  className={
                    isNativeApp
                      ? "luxury-mega-submit luxury-mega-submit--icon-only"
                      : "luxury-mega-submit"
                  }
                  disabled={capLookupSubmitting}
                  aria-label={t("home.searchAria")}
                >
                  {capLookupSubmitting ? (
                    <span className="luxury-mega-submit__loading" aria-hidden>
                      …
                    </span>
                  ) : isNativeApp ? (
                    <HomeMegaSearchLensIcon />
                  ) : (
                    t("common.search")
                  )}
                </button>
              </div>
              {megaFocused && debouncedSalonName.trim().length >= 1 ? (
                <div className="luxury-mega-live-sheet" role="listbox" aria-label={t("home.suggestionsAria")}>
                  {liveSalonPreview.isFetching ? (
                    <div className="luxury-mega-live-loading" aria-live="polite">
                      <span className="luxury-mega-live-dot" />
                      {t("home.searching")}
                    </div>
                  ) : null}
                  {!liveSalonPreview.isFetching && liveSalonPreview.data && liveSalonPreview.data.length === 0 ? (
                    <div className="luxury-mega-live-empty-state" role="status">
                      <p className="luxury-mega-live-empty-state__title">{t("home.noSalonTitle")}</p>
                      <p className="luxury-mega-live-empty-state__lead">
                        {t("home.noSalonLead", { query: debouncedSalonName.trim() })}
                      </p>
                    </div>
                  ) : null}
                  {liveSalonPreview.data && liveSalonPreview.data.length > 0 ? (
                    <ul className="luxury-mega-live-list">
                      {liveSalonPreview.data.slice(0, 8).map((o) => (
                        <li key={o.id} className="luxury-mega-live-item">
                          <Link
                            to={`/s/${encodeURIComponent(o.slug)}`}
                            state={{ orgPreview: o } satisfies SalonOrgNavState}
                            onMouseEnter={() => prefetchSalonPublicPage(queryClient, o.slug)}
                            onFocus={() => prefetchSalonPublicPage(queryClient, o.slug)}
                            className="luxury-mega-live-hit"
                            role="option"
                          >
                            <SearchHitLogoAvatar
                              slug={o.slug}
                              name={o.name}
                              avatarClass="luxury-mega-live-avatar"
                              logoExtraClass="luxury-mega-live-avatar--logo"
                            />
                            <span className="luxury-mega-live-hit-text">
                              <span className="luxury-mega-live-name">{o.name}</span>
                              {o.city ? (
                                <span className="luxury-mega-live-city">{formatSalonCityForDisplay(o.city) ?? o.city}</span>
                              ) : null}
                            </span>
                            <span className="luxury-mega-live-arrow" aria-hidden>
                              →
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {liveSalonPreview.data && liveSalonPreview.data.length > 0 ? (
                    <div className="luxury-mega-live-footer">
                      <button
                        type="button"
                        className="luxury-mega-live-seeall"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          const query = debouncedSalonName.trim();
                          if (!query) return;
                          setFormHint(null);
                          goSearch(query, undefined, withBusinessTypeFilter());
                        }}
                      >
                        {t("common.seeAll")}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {formHint && (
              <p className="luxury-cap-hint" role="alert" style={{ margin: "0.5rem 0 0" }}>
                {formHint}
              </p>
            )}

            <div className="luxury-search-filters">
              <div className="luxury-search-filters-panel">
                <p className="luxury-search-filters-head">{t("home.filtersHead")}</p>
                <div className="luxury-search-filters-grid">
                  <div className="luxury-filter-field">
                    <label htmlFor="luxury-country" className="luxury-filter-label">
                      {t("home.nations")}
                    </label>
                    <div className="luxury-country-select">
                      <span className="luxury-country-select__flag" aria-hidden>
                        {countryFlagEmoji(country)}
                      </span>
                      <span className="luxury-country-select__name" aria-hidden>
                        {localizedCountryName(
                          country,
                          locale,
                          COUNTRIES.find((c) => c.code === country)?.name ?? country,
                        )}
                      </span>
                      <select
                        id="luxury-country"
                        value={country}
                        onChange={(e) => {
                          applyCountry(e.target.value as CountryCode);
                          setCityInput("");
                          setCapInput("");
                        }}
                        className="luxury-soft-select luxury-soft-select--with-flag"
                        aria-label={t("home.nationAria", {
                          name: localizedCountryName(
                            country,
                            locale,
                            COUNTRIES.find((c) => c.code === country)?.name ?? country,
                          ),
                        })}
                      >
                        {COUNTRIES.map((co) => (
                          <option key={co.code} value={co.code}>
                            {countryFlagEmoji(co.code)}{" "}
                            {localizedCountryName(co.code, locale, co.name)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div
                    ref={cityFieldRef}
                    className={`luxury-filter-field luxury-cap-field${citySuggestOpen ? " luxury-cap-field--suggest-open" : ""}`}
                  >
                    <label htmlFor="luxury-city" className="luxury-filter-label">
                      {t("home.cityLabel")}
                    </label>
                    <div className="luxury-cap-input-wrap">
                      <input
                        id="luxury-city"
                        type="text"
                        value={cityInput}
                        onFocus={() => {
                          setCitySuggestDismissed(false);
                          setCapSuggestDismissed(true);
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCityInput(v);
                          if (!v) {
                            setCapInput("");
                          }
                        }}
                        placeholder={t("home.cityPlaceholder")}
                        className="luxury-cap-text-input"
                        autoComplete="off"
                      />
                    </div>
                    {citySuggestOpen ? (
                      <ul className="luxury-cap-suggestions" aria-label={t("home.citySuggestionsAria")}>
                        {cityPlaceSuggestionRows.map((row) => (
                          <li key={row.key}>
                            <button
                              type="button"
                              className="luxury-cap-suggestion-btn"
                              onMouseDown={(ev) => ev.preventDefault()}
                              onClick={() => {
                                setCityInput(row.label);
                                setCapInput(row.cap ?? "");
                                setCitySuggestDismissed(true);
                              }}
                            >
                              <span>{row.label}</span>
                              {row.detail ? <small>{row.detail}</small> : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div
                    ref={capFieldRef}
                    className={`luxury-filter-field luxury-cap-field${capCitySuggestions.length > 0 && !capSuggestDismissed ? " luxury-cap-field--suggest-open" : ""}`}
                  >
                    <label htmlFor="luxury-cap" className="luxury-filter-label">
                      {capFreeform ? t("home.postcodeLabel") : t("home.capLabel")}
                    </label>
                    <div className="luxury-cap-input-row">
                      <div className="luxury-cap-input-wrap">
                        <input
                          id="luxury-cap"
                          type="text"
                          inputMode={capFreeform ? "text" : "numeric"}
                          autoComplete="postal-code"
                          placeholder={capFreeform ? t("home.postcodePlaceholder") : t("home.capPlaceholder")}
                          value={capInput}
                          onFocus={() => {
                            setCapSuggestDismissed(false);
                            setCitySuggestDismissed(true);
                          }}
                          onChange={(e) => {
                            setCapInput(e.target.value);
                            if (cityInput.trim()) setCityInput("");
                          }}
                          className="luxury-cap-text-input"
                          aria-describedby={!cityInput.trim() && capNormalized.length > 0 ? "luxury-cap-status" : undefined}
                        />
                      </div>
                      <button
                        type="button"
                        className="luxury-cap-geo-btn"
                        disabled={geoLoading}
                        aria-busy={geoLoading}
                        title={t("home.geoTitle")}
                        aria-label={t("home.geoAria")}
                        onClick={handleGeoLocateForFilters}
                      >
                        {geoLoading ? (
                          <span className="luxury-cap-geo-btn__spinner" aria-hidden />
                        ) : (
                          <svg
                            className="luxury-cap-geo-btn__icon"
                            viewBox="0 0 24 24"
                            width={22}
                            height={22}
                            aria-hidden
                            fill="currentColor"
                          >
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {capCitySuggestions.length > 0 && !capSuggestDismissed && (
                      <ul className="luxury-cap-suggestions" aria-label={t("home.capSuggestionsAria")}>
                        {capCitySuggestions.map((item) => (
                          <li key={`${country}-${item.cap}-${item.city}`}>
                            <button
                              type="button"
                              className="luxury-cap-suggestion-btn"
                              onClick={() => {
                                setCapInput(item.cap);
                                setCityInput(item.city);
                                setCapSuggestDismissed(true);
                              }}
                            >
                              <span>{item.city}</span>
                              <small>{item.cap}</small>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {!cityInput.trim() && capNormalized.length > 0 && (
                      <p id="luxury-cap-status" className="luxury-cap-hint" role="status">
                        {!mapsAllowed && country !== "IT"
                          ? t("home.capNeedMaps")
                          : !capComplete && capFreeform
                            ? t("home.capFreeformHint", { min: capResolveMin })
                            : !capComplete && capLen > 0
                              ? t("home.capDigitsHint", {
                                  current: capNormalized.length,
                                  total: capLen,
                                })
                              : capComplete && capPreview.status === "loading"
                                ? t("home.capLooking")
                                : capComplete && capPreview.status === "ok"
                                  ? t("home.capFound", { city: capPreview.city })
                                  : capComplete && capPreview.status === "not_found"
                                    ? t("home.capNotFound")
                                    : capComplete && capPreview.status === "error"
                                      ? t("home.capError")
                                      : null}
                      </p>
                    )}
                  </div>
                  <div className="luxury-filter-field">
                    <label htmlFor="luxury-business-type" className="luxury-filter-label">
                      {t("home.typology")}
                    </label>
                    <select
                      id="luxury-business-type"
                      value={businessTypeFilter}
                      onChange={(e) => setBusinessTypeFilter(e.target.value as SalonBusinessTypeId | "")}
                      className="luxury-soft-select"
                    >
                      <option value="">{t("home.allTypologies")}</option>
                      {SALON_BUSINESS_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {businessTypeFilterLabels[opt.id]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="luxury-quick-tags-section">
              <button
                type="button"
                className="luxury-quick-tags-toggle"
                id="luxury-quick-tags-trigger"
                aria-expanded={quickSuggestionsOpen}
                aria-controls="luxury-quick-tags-panel"
                onClick={() => {
                  if (quickSuggestionsOpen) {
                    setQuickSuggestionsOpen(false);
                    return;
                  }
                  openQuickSuggestions();
                }}
              >
                {t("home.quickTouch")}
                <span className="luxury-quick-tags-chevron" aria-hidden>
                  ▾
                </span>
              </button>
              {quickSuggestionsOpen && (
                <div
                  className="luxury-quick-tags-panel"
                  id="luxury-quick-tags-panel"
                  role="region"
                  aria-labelledby="luxury-quick-tags-trigger"
                >
                  <p className="luxury-quick-tags-near-title">
                    <span className="luxury-quick-tags-near-title__label">{t("home.quick.nearLabel")}</span>
                    <span className="luxury-quick-tags-near-title__radius">
                      {t("home.quick.nearRadius", { km: QUICK_NEAR_RADIUS_KM })}
                    </span>
                  </p>
                  {quickAvailabilityStatus === "loading" ? (
                    <p className="luxury-quick-tags-near-hint" role="status">
                      {t("home.quick.loading")}
                    </p>
                  ) : null}
                  {quickAvailabilityStatus === "error" ? (
                    <div className="luxury-quick-tags-near-error" role="alert">
                      <p className="luxury-quick-tags-near-hint">
                        {formHint?.trim() || t("home.quick.needLocation")}
                      </p>
                      <button
                        type="button"
                        className="luxury-quick-tags-retry"
                        onClick={() => void loadQuickSuggestNear()}
                      >
                        {t("home.quick.retry")}
                      </button>
                    </div>
                  ) : null}
                  {quickAvailabilityStatus === "ready" && quickSuggestGroups.length === 0 ? (
                    <p className="luxury-quick-tags-near-hint" role="status">
                      {t("home.quick.empty")}
                    </p>
                  ) : null}
                  {quickAvailabilityStatus === "ready"
                    ? quickSuggestGroups.map((group) => (
                    <div key={group.id} className="luxury-quick-tags-group">
                      <p className="luxury-quick-tags-group-label">{group.label}</p>
                      <div className="luxury-quick-tags-row">
                        {group.tags.map((tag) => (
                          <button
                            key={`${group.id}-${tag.q}`}
                            type="button"
                            className="luxury-quick-tag"
                            onClick={() => {
                              void (async () => {
                                setFormHint(null);
                                setCapLookupSubmitting(true);
                                try {
                                  let lat = lastGeoCoordsRef.current?.lat;
                                  let lng = lastGeoCoordsRef.current?.lng;
                                  if (lat == null || lng == null) {
                                    try {
                                      const coords = await requestGeolocationCoords();
                                      lat = coords.lat;
                                      lng = coords.lng;
                                      lastGeoCoordsRef.current = coords;
                                    } catch (err) {
                                      setFormHint(geolocationErrorMessage(err));
                                      return;
                                    }
                                  }
                                  goSearch(tag.q, undefined, {
                                    near: { lat, lng, km: QUICK_NEAR_RADIUS_KM },
                                    sortRating: true,
                                    salonClientGenders: tag.clientGenders,
                                  });
                                  setQuickSuggestionsOpen(false);
                                } finally {
                                  setCapLookupSubmitting(false);
                                }
                              })();
                            }}
                          >
                            {tag.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                    : null}
                </div>
              )}
            </div>
          </form>
        </div>

        <HeroStoryCarousel nativeApp={isNativeApp} editorialAllowed={editorialAllowed} />
      </section>

      <section className="luxury-trending-section">
        <h2 className="luxury-trending-title">{t("home.trending.title")}</h2>

        <div className="luxury-trending-groups">
          {trendingGroups.map((group) => (
            <div key={group.id} className="luxury-trending-group">
              <h3 className="luxury-trending-subtitle">{group.heading}</h3>
              <div className={trendingGridClass}>
                {group.items.map((idea) => (
                  <Link
                    key={idea.id}
                    to={`/idee/${group.id}/${idea.id}`}
                    className="luxury-trend-card luxury-trend-card--photo"
                    style={{ backgroundImage: trendCardBg(idea.image) }}
                    aria-label={`${idea.title}. ${idea.imageAlt}`}
                  >
                    <span className="luxury-trend-card-label" aria-hidden="true">
                      {idea.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="luxury-trending-featured">
          <h3 className="luxury-trending-subtitle">{t("home.trending.featured")}</h3>
          <div className="luxury-trending-grid luxury-trending-grid--pair">
            <Link
              to="/operatori/migliori"
              className="luxury-trend-card luxury-trend-card--operators luxury-trend-card--photo"
              style={{ backgroundImage: trendCardBg(TOP_OPERATORS_FEATURED_CARD.image) }}
              aria-label={`${t("home.topOperators.title")}. ${t("home.topOperators.alt")}`}
            >
              <span className="luxury-trend-card-label" aria-hidden="true">
                {t("home.topOperators.title")}
              </span>
              <span className="luxury-trend-card-sublabel" aria-hidden="true">
                {t("home.topOperators.subtitle")}
              </span>
            </Link>
            <Link
              to="/saloni/sponsorizzati"
              className="luxury-trend-card luxury-trend-card--sponsored luxury-trend-card--photo"
              style={{ backgroundImage: trendCardBg(SPONSORED_SALONS_FEATURED_CARD.image) }}
              aria-label={`${t("home.sponsoredSalons.title")}. ${t("home.sponsoredSalons.alt")}`}
            >
              <span className="luxury-trend-card-label" aria-hidden="true">
                {t("home.sponsoredSalons.title")}
              </span>
              <span className="luxury-trend-card-sublabel" aria-hidden="true">
                {t("home.sponsoredSalons.subtitle")}
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="luxury-partner-strip" aria-labelledby="luxury-partner-heading">
        <div className="luxury-partner-wave" aria-hidden />
        <div className="luxury-partner-inner">
          <div className="luxury-partner-copy">
            <h2 id="luxury-partner-heading" className="luxury-partner-title">
              {t("home.partner.title")}
            </h2>
            <p className="luxury-partner-lead">{t("home.partner.lead")}</p>
            <div className="luxury-partner-cta-row">
              <Link to="/registrati" className="luxury-partner-cta">
                {t("home.partner.ctaClient")}
              </Link>
              <PartnerSignupLink className="luxury-partner-cta luxury-partner-cta--plans">
                {t("home.partner.ctaSalon")}
              </PartnerSignupLink>
            </div>
          </div>
          <div className="luxury-partner-visual" aria-hidden>
            <div className="luxury-partner-device luxury-partner-device--tablet">
              <div className="luxury-partner-cal-bar" />
              <div className="luxury-partner-cal-cells">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span key={i} className={`luxury-partner-slot luxury-partner-slot--${(i % 4) + 1}`} />
                ))}
              </div>
            </div>
            <div className="luxury-partner-device luxury-partner-device--phone">
              <div className="luxury-partner-toast">
                <span className="luxury-partner-toast-dot" />
                {t("home.partner.toastTitle")}
                <span className="luxury-partner-toast-meta">{t("home.partner.toastMeta")}</span>
              </div>
              <div className="luxury-partner-phone-body">
                <div className="luxury-partner-cal-bar luxury-partner-cal-bar--sm" />
                <div className="luxury-partner-cal-cells luxury-partner-cal-cells--sm">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} className={`luxury-partner-slot luxury-partner-slot--${(i % 3) + 1}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
