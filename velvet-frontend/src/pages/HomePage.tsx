import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import { apiJson } from "../api/client";
import type { OrganizationSummary } from "../api/types";
import { locateByPlace, locateByPostal, locateByPostalSuggestions, reverseLocate } from "../api/locate";
import {
  COUNTRIES,
  getStaticCityEntries,
  type CountryCode,
  expectedCapLength,
  italianLocalitiesByCapPrefix,
  normalizeCapInput,
  resolveItalianCityForCap,
} from "../data/searchLocations";
import { TRENDING_GROUPS, trendIdeaGroupsForNativeApp } from "../data/trendingIdeas";
import { useVelvetNativeAppShell } from "../hooks/useVelvetNativeAppShell";
import { QUICK_SUGGEST_GROUPS } from "../data/quickSuggestGroups";
import { PartnerSignupLink } from "../components/PartnerSignupLink";
import { SearchHitLogoAvatar } from "../components/SearchHitLogoAvatar";
import { formatSalonCityForDisplay } from "../lib/formatSalonCityForDisplay";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useEditorialCookieAllowed, useMapsCookieAllowed } from "../hooks/useCookieConsent";
import { editorialBackgroundImage } from "../lib/editorialMedia";
import { prefetchSalonPublicPage } from "../lib/prefetchSalonPublicPage";
import type { SalonOrgNavState } from "../lib/publicOrganizationDetail";
import type { SalonClientGenderId } from "../data/salonClientGenders";
import "../styles/velvet-home.css";

/** Raggio (km) per i tag «Oppure un tocco»: saloni con coordinate entro questo raggio dalla posizione GPS. */
const QUICK_NEAR_RADIUS_KM = 25;

function requestGeolocationCoords(options?: PositionOptions): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocalizzazione non disponibile"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      options ?? { enableHighAccuracy: true, timeout: 18_000, maximumAge: 120_000 },
    );
  });
}

type CityPlaceSuggestionRow = {
  key: string;
  label: string;
  /** Se presente (lista statica), valorizziamo anche il CAP al click. */
  cap?: string;
  detail?: string;
};

type StorySlide =
  | { kind: "brand"; id: string }
  | {
      kind: "image";
      id: string;
      eyebrow: string;
      titleBefore: string;
      titleHighlight: string;
      titleAfter: string;
      body: string;
      image: string;
      imageAlt: string;
    };

const STORY_SLIDES: StorySlide[] = [
  { kind: "brand", id: "brand" },
  {
    kind: "image",
    id: "hair",
    eyebrow: "Parrucchieri & barber",
    titleBefore: "Stile che ti ",
    titleHighlight: "ispira",
    titleAfter: ".",
    body: "Taglio, colore e barba: professionisti vicino a te, prenotazione chiara e veloce.",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Salone parrucchiere",
  },
  {
    kind: "image",
    id: "beauty",
    eyebrow: "Estetica & skincare",
    titleBefore: "Cura che si ",
    titleHighlight: "vede",
    titleAfter: ".",
    body: "Trattamenti viso, unghie e rituali di bellezza: scegli la sede e il momento giusto.",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Trattamento estetico viso",
  },
  {
    kind: "image",
    id: "wellness",
    eyebrow: "Benessere & massaggi",
    titleBefore: "Corpo e mente in ",
    titleHighlight: "equilibrio",
    titleAfter: ".",
    body: "Massaggi e terapie olistiche: ritagliati una pausa e prenota con pochi click.",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Massaggio terapeutico",
  },
];

/** Carousel home — solo app mobile: 5 foto, autoplay, senza frecce né pallini. */
const STORY_SLIDES_NATIVE_APP: StorySlide[] = [
  {
    kind: "image",
    id: "saloni",
    eyebrow: "Saloni",
    titleBefore: "Trova il ",
    titleHighlight: "salone",
    titleAfter: " per te.",
    body: "Hair, beauty e benessere: scopri le sedi vicino a te e prenota in pochi tap.",
    image:
      "https://images.unsplash.com/photo-1633681926022-84c23e8cb04d?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Interno di un salone accogliente",
  },
  {
    kind: "image",
    id: "hair",
    eyebrow: "Parrucchieri",
    titleBefore: "Taglio e colore che ",
    titleHighlight: "ispirano",
    titleAfter: ".",
    body: "Piega, barba e styling: professionisti pronti per la tua prossima visita.",
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Parrucchiere al lavoro in salone",
  },
  {
    kind: "image",
    id: "beauty",
    eyebrow: "Estetisti",
    titleBefore: "Bellezza che si ",
    titleHighlight: "vede",
    titleAfter: ".",
    body: "Viso, unghie e trucco: rituali di cura per sentirti al meglio ogni giorno.",
    image:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Trattamento viso in istituto estetico",
  },
  {
    kind: "image",
    id: "massaggi",
    eyebrow: "Massaggiatori",
    titleBefore: "Relax e ",
    titleHighlight: "benessere",
    titleAfter: ".",
    body: "Massaggi rilassanti e trattamenti decontratturanti: ritagliati la pausa che meriti.",
    image:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Massaggio rilassante in studio benessere",
  },
  {
    kind: "image",
    id: "unghie",
    eyebrow: "Estetica & nail",
    titleBefore: "Dettagli che fanno la ",
    titleHighlight: "differenza",
    titleAfter: ".",
    body: "Manicure, nail art e piccoli gesti di cura per un look curato in ogni occasione.",
    image:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Manicure e nail art",
  },
];

function HeroStoryCarousel({ nativeApp = false, editorialAllowed = false }: { nativeApp?: boolean; editorialAllowed?: boolean }) {
  const slides = nativeApp ? STORY_SLIDES_NATIVE_APP : STORY_SLIDES;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  const autoplayMs = nativeApp ? 5000 : 6500;

  useEffect(() => {
    setIndex(0);
  }, [nativeApp]);

  useEffect(() => {
    if (paused && !nativeApp) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % n);
    }, autoplayMs);
    return () => window.clearInterval(t);
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
              color: "var(--velvet-orange)",
            }}
          >
            SaloniLuxury
          </p>
          <h2
            style={{
              fontSize: "clamp(1.45rem, 3.2vw, 2.1rem)",
              fontWeight: 700,
              lineHeight: 1.18,
              margin: 0,
              letterSpacing: "-0.03em",
              color: "var(--velvet-surface)",
            }}
          >
            Rompi la routine.
            <br />
            <span style={{ color: "var(--velvet-orange)" }}>Prenota</span> il tuo momento di relax.
          </h2>
          <p
            style={{
              margin: "1rem 0 0",
              fontSize: "1rem",
              lineHeight: 1.55,
              opacity: 0.9,
              maxWidth: 400,
              color: "var(--velvet-surface)",
            }}
          >
            Parrucchieri, estetica e benessere: trova il salone giusto e prenota in sicurezza.
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
            color: "var(--velvet-orange)",
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
            color: "var(--velvet-surface)",
          }}
        >
          {slide.titleBefore}
          <span style={{ color: "var(--velvet-orange)" }}>{slide.titleHighlight}</span>
          {slide.titleAfter}
        </h2>
        <p
          style={{
            margin: "1rem 0 0",
            fontSize: "1rem",
            lineHeight: 1.55,
            opacity: 0.92,
            maxWidth: 420,
            color: "var(--velvet-surface)",
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
        nativeApp ? "velvet-hero-carousel velvet-hero-carousel--native-app" : "velvet-hero-carousel"
      }
      role="region"
      aria-roledescription="carousel"
      aria-label="In evidenza SaloniLuxury"
      onMouseEnter={nativeApp ? undefined : () => setPaused(true)}
      onMouseLeave={nativeApp ? undefined : () => setPaused(false)}
      style={{
        marginTop: "clamp(2.25rem, 5vw, 3.5rem)",
        maxWidth: 1120,
        marginLeft: "auto",
        marginRight: "auto",
        position: "relative",
      }}
    >
      <div className="velvet-hero-carousel-viewport">
        <div
          className="velvet-hero-carousel-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, slideIndex) => (
            <div
              key={slide.id}
              className="velvet-hero-carousel-slide"
              style={{ minWidth: "100%", flexShrink: 0 }}
              aria-hidden={slideIndex !== index}
            >
              {slide.kind === "brand" ? (
                <div
                  className="velvet-hero-story"
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
                    className="velvet-hero-story-accent"
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
                  className="velvet-hero-slide-photo"
                  style={{
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
                  }}
                >
                  <div style={{ maxWidth: 520 }} role="group" aria-label={slide.imageAlt}>
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
              className="velvet-hero-carousel-nav velvet-carousel-prev"
              onClick={() => go(-1)}
              aria-label="Slide precedente"
            >
              <span aria-hidden>‹</span>
            </button>
            <button
              type="button"
              className="velvet-hero-carousel-nav velvet-carousel-next"
              onClick={() => go(1)}
              aria-label="Slide successiva"
            >
              <span aria-hidden>›</span>
            </button>

            <div className="velvet-carousel-dots-wrap" role="tablist" aria-label="Seleziona slide">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Slide ${i + 1} di ${n}`}
                  onClick={() => setIndex(i)}
                  className={i === index ? "velvet-carousel-dot is-active" : "velvet-carousel-dot"}
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
      className="velvet-mega-submit__icon"
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
  const isNativeApp = useVelvetNativeAppShell();
  const editorialAllowed = useEditorialCookieAllowed();
  const mapsAllowed = useMapsCookieAllowed();
  const trendingGroups = isNativeApp ? trendIdeaGroupsForNativeApp() : TRENDING_GROUPS;
  const trendingGridClass = isNativeApp
    ? "velvet-trending-grid velvet-trending-grid--native-four"
    : "velvet-trending-grid velvet-trending-grid--three";
  const { isAuthenticated, realmRoles } = useVelvetAuth();
  /** Suggerimenti rapidi legati a geolocalizzazione: solo account cliente (JWT con ruolo CLIENT). */
  const canUseQuickGeolocationTags = isAuthenticated && realmRoles.includes("CLIENT");
  const [salonName, setSalonName] = useState("");
  const [country, setCountry] = useState<CountryCode>("IT");
  /** Città: testo libero, oppure valore `country|cap|city` se scelto dai suggerimenti. */
  const [cityInput, setCityInput] = useState("");
  const [capInput, setCapInput] = useState("");
  const [quickSuggestionsOpen, setQuickSuggestionsOpen] = useState(false);
  const lastGeoCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!canUseQuickGeolocationTags) setQuickSuggestionsOpen(false);
  }, [canUseQuickGeolocationTags]);
  const [formHint, setFormHint] = useState<string | null>(null);
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

  const capDigits = useMemo(() => normalizeCapInput(capInput), [capInput]);
  const capLen = expectedCapLength(country);
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
      const capNorm = normalizeCapInput(c.cap);
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
    queryKey: ["locate", "postal-suggestions", country, capDigits],
    queryFn: () => locateByPostalSuggestions(capDigits, country, 100),
    enabled: mapsAllowed && country !== "IT" && capLen > 0 && capDigits.length >= 2,
    staleTime: 30_000,
    retry: false,
  });

  const capCitySuggestions = useMemo(() => {
    if (capLen === 0 || capDigits.length === 0) return [];
    const out: { cap: string; city: string }[] = [];
    const dedupe = new Set<string>();

    if (country === "IT") {
      for (const row of italianLocalitiesByCapPrefix(capDigits)) {
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
      out.push({ cap: capDigits, city });
    }
    for (const c of staticCitySuggestions) {
      const normalizedCap = normalizeCapInput(c.cap);
      if (!normalizedCap) continue;
      if (!normalizedCap.startsWith(capDigits)) continue;
      const city = c.city.trim();
      const key = city.toLowerCase();
      if (dedupe.has(key)) continue;
      dedupe.add(key);
      out.push({ cap: normalizedCap, city });
    }
    return out;
  }, [capDigits, capLen, country, capSuggestionQ.data, staticCitySuggestions]);

  const goSearch = (
    q: string,
    c?: string,
    opts?: {
      near?: { lat: number; lng: number; km: number };
      sortRating?: boolean;
      salonClientGenders?: SalonClientGenderId[];
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
    if (opts?.sortRating) p.set("sort", "rating");
    const qs = p.toString();
    nav(qs ? `/search?${qs}` : "/search");
  };

  const buildNearSearchOptions = (): { near: { lat: number; lng: number; km: number } } | undefined => {
    const coords = lastGeoCoordsRef.current;
    if (!coords) return undefined;
    return { near: { lat: coords.lat, lng: coords.lng, km: QUICK_NEAR_RADIUS_KM } };
  };

  const resolveCityFromCap = useCallback(async () => {
    if (capLen === 0) return { city: null as string | null, notFound: false as const };
    if (capDigits.length !== capLen) return { city: null as string | null, notFound: false as const };
    if (country === "IT" && !mapsAllowed) {
      const localCity = resolveItalianCityForCap(capDigits);
      if (!localCity) return { city: null, notFound: true as const };
      return { city: localCity, notFound: false as const };
    }
    if (!mapsAllowed) return { city: null, notFound: true as const };
    const r = await locateByPostal(capDigits, country);
    if (!r) return { city: null, notFound: true as const };
    return { city: r.city, notFound: false as const };
  }, [capDigits, capLen, country, mapsAllowed]);

  const resolveSearchCity = useCallback(async (): Promise<{ city: string; error: string | null }> => {
    const raw = cityInput.trim();
    if (raw) return { city: raw, error: null };
    if (capDigits.length === 0) return { city: "", error: null };
    if (capLen === 0) return { city: "", error: null };
    if (capDigits.length < capLen) {
      const countryName = COUNTRIES.find((c) => c.code === country)?.name ?? "la nazione selezionata";
      return {
        city: "",
        error: `Inserisci il CAP completo (${capLen} cifre per ${countryName}) oppure svuota il campo.`,
      };
    }
    try {
      const { city: c, notFound } = await resolveCityFromCap();
      if (notFound || !c) {
        return {
          city: "",
          error: "CAP non trovato per il paese selezionato. Controlla il CAP, scrivi il comune o scegli un suggerimento.",
        };
      }
      return { city: c, error: null };
    } catch {
      return { city: "", error: "Impossibile verificare il CAP in questo momento. Riprova tra poco." };
    }
  }, [cityInput, capDigits, capLen, country, resolveCityFromCap]);

  useEffect(() => {
    setFormHint(null);
    if (capLen === 0) {
      setCapPreview({ status: "idle" });
      return;
    }
    if (cityInput.trim()) {
      setCapPreview({ status: "idle" });
      return;
    }
    if (capDigits.length !== capLen) {
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
            const localCity = resolveItalianCityForCap(capDigits);
            if (cancelled) return;
            if (localCity) {
              setCapPreview({ status: "ok", city: localCity, displayName: localCity });
            } else {
              setCapPreview({ status: "not_found" });
            }
            return;
          }
          const r = await locateByPostal(capDigits, country);
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
  }, [capDigits, capLen, country, cityInput, mapsAllowed]);

  const runGeoLocateForFilters = useCallback(async (): Promise<{ city: string | null; error: string | null }> => {
    if (!mapsAllowed) {
      const msg =
        "Per usare posizione e geocodifica attiva le preferenze «Mappe e geocodifica» in Scelte privacy.";
      setFormHint(msg);
      return { city: null, error: msg };
    }
    if (!navigator.geolocation) {
      const msg = "Il browser non supporta la geolocalizzazione.";
      setFormHint(msg);
      return { city: null, error: msg };
    }
    setGeoLoading(true);
    setFormHint(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            lastGeoCoordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            const r = await reverseLocate(pos.coords.latitude, pos.coords.longitude);
            if (!r || !r.city.trim()) {
              const msg = "Non abbiamo ricavato comune o CAP da questa posizione. Inserisci i dati a mano.";
              setFormHint(msg);
              resolve({ city: null, error: msg });
              return;
            }
            const nextCountry = COUNTRIES.some((c) => c.code === r.countryCode) ? (r.countryCode as CountryCode) : null;
            if (nextCountry) setCountry(nextCountry);
            const effectiveCountry: CountryCode = nextCountry ?? country;
            const resolvedCity = r.city.trim();
            setCityInput(resolvedCity);
            let pc = "";
            if (r.postalCode) {
              pc = normalizeCapInput(r.postalCode);
              const len = expectedCapLength(effectiveCountry);
              if (len > 0 && pc.length > len) pc = pc.slice(0, len);
            }
            setCapInput(pc);
            setCapSuggestDismissed(true);
            setCitySuggestDismissed(true);
            resolve({ city: resolvedCity, error: null });
          } catch {
            const msg = "Servizio indirizzo non disponibile. Riprova tra poco.";
            setFormHint(msg);
            resolve({ city: null, error: msg });
          } finally {
            setGeoLoading(false);
          }
        },
        (err) => {
          const code = (err as GeolocationPositionError)?.code;
          const msg =
            code === 1
              ? "Permesso posizione negato. Abilita la posizione per questo sito e riprova."
              : code === 2
                ? "Posizione del dispositivo non disponibile."
                : code === 3
                  ? "Richiesta posizione in timeout. Riprova."
                  : "Impossibile ottenere la posizione.";
          setFormHint(msg);
          setGeoLoading(false);
          resolve({ city: null, error: msg });
        },
        { enableHighAccuracy: true, timeout: 18_000, maximumAge: 120_000 },
      );
    });
  }, [country, mapsAllowed]);

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
      goSearch(salonName, city, buildNearSearchOptions());
    } finally {
      setCapLookupSubmitting(false);
    }
  };

  return (
    <>
      <section className="velvet-hero-wrap">
        <div className="velvet-home-inner">
          <h1 className="velvet-home-title">
            <span className="velvet-home-title__text">Trova il tuo salone</span>
          </h1>
          <p className="velvet-home-lead velvet-home-lead--epigraph">
            <span className="velvet-home-lead__quote" aria-hidden="true">
              «
            </span>
            <span className="velvet-home-lead__text">Prendersi cura non è vanità: è ascolto.</span>
            <span className="velvet-home-lead__quote velvet-home-lead__quote--end" aria-hidden="true">
              »
            </span>
          </p>

          <form onSubmit={onSearch} className="velvet-home-form">
            <label htmlFor="velvet-mega-q" className="visually-hidden">
              Cerca
            </label>
            <div
              className="velvet-mega-search-wrap"
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
                    ? "velvet-mega-search velvet-mega-search--native-app"
                    : "velvet-mega-search"
                }
              >
                <input
                  id="velvet-mega-q"
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  placeholder="Cerca salone o servizio…"
                  className="velvet-mega-input"
                  autoComplete="organization"
                  enterKeyHint="search"
                />
                <button
                  type="submit"
                  className={
                    isNativeApp
                      ? "velvet-mega-submit velvet-mega-submit--icon-only"
                      : "velvet-mega-submit"
                  }
                  disabled={capLookupSubmitting}
                  aria-label="Cerca salone"
                >
                  {capLookupSubmitting ? (
                    <span className="velvet-mega-submit__loading" aria-hidden>
                      …
                    </span>
                  ) : isNativeApp ? (
                    <HomeMegaSearchLensIcon />
                  ) : (
                    "Cerca"
                  )}
                </button>
              </div>
              {megaFocused && debouncedSalonName.trim().length >= 1 ? (
                <div className="velvet-mega-live-sheet" role="listbox" aria-label="Suggerimenti saloni">
                  {liveSalonPreview.isFetching ? (
                    <div className="velvet-mega-live-loading" aria-live="polite">
                      <span className="velvet-mega-live-dot" />
                      Ricerca in corso…
                    </div>
                  ) : null}
                  {!liveSalonPreview.isFetching && liveSalonPreview.data && liveSalonPreview.data.length === 0 ? (
                    <div className="velvet-mega-live-empty-state" role="status">
                      <p className="velvet-mega-live-empty-state__title">Nessun salone trovato</p>
                      <p className="velvet-mega-live-empty-state__lead">
                        Per «{debouncedSalonName.trim()}». Prova altre parole o usa Cerca con CAP e comune.
                      </p>
                    </div>
                  ) : null}
                  {liveSalonPreview.data && liveSalonPreview.data.length > 0 ? (
                    <ul className="velvet-mega-live-list">
                      {liveSalonPreview.data.slice(0, 8).map((o) => (
                        <li key={o.id} className="velvet-mega-live-item">
                          <Link
                            to={`/s/${encodeURIComponent(o.slug)}`}
                            state={{ orgPreview: o } satisfies SalonOrgNavState}
                            onMouseEnter={() => prefetchSalonPublicPage(queryClient, o.slug)}
                            onFocus={() => prefetchSalonPublicPage(queryClient, o.slug)}
                            className="velvet-mega-live-hit"
                            role="option"
                          >
                            <SearchHitLogoAvatar
                              slug={o.slug}
                              name={o.name}
                              avatarClass="velvet-mega-live-avatar"
                              logoExtraClass="velvet-mega-live-avatar--logo"
                            />
                            <span className="velvet-mega-live-hit-text">
                              <span className="velvet-mega-live-name">{o.name}</span>
                              {o.city ? (
                                <span className="velvet-mega-live-city">{formatSalonCityForDisplay(o.city) ?? o.city}</span>
                              ) : null}
                            </span>
                            <span className="velvet-mega-live-arrow" aria-hidden>
                              →
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {liveSalonPreview.data && liveSalonPreview.data.length > 0 ? (
                    <div className="velvet-mega-live-footer">
                      <button
                        type="button"
                        className="velvet-mega-live-seeall"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          const query = debouncedSalonName.trim();
                          if (!query) return;
                          setFormHint(null);
                          goSearch(query);
                        }}
                      >
                        Vedi tutti
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {formHint && (
              <p className="velvet-cap-hint" role="alert" style={{ margin: "0.5rem 0 0" }}>
                {formHint}
              </p>
            )}

            <div className="velvet-search-filters">
              <div className="velvet-search-filters-panel">
                <p className="velvet-search-filters-head">Affina la zona</p>
                <div className="velvet-search-filters-grid">
                  <div className="velvet-filter-field">
                    <label htmlFor="velvet-country" className="velvet-filter-label">
                      Nazioni
                    </label>
                    <select
                      id="velvet-country"
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value as CountryCode);
                        setCityInput("");
                        setCapInput("");
                      }}
                      className="velvet-soft-select"
                    >
                      {COUNTRIES.map((co) => (
                        <option key={co.code} value={co.code}>
                          {co.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div
                    ref={cityFieldRef}
                    className={`velvet-filter-field velvet-cap-field${citySuggestOpen ? " velvet-cap-field--suggest-open" : ""}`}
                  >
                    <label htmlFor="velvet-city" className="velvet-filter-label">
                      Citta o comune
                    </label>
                    <div className="velvet-cap-input-wrap">
                      <input
                        id="velvet-city"
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
                        placeholder="Città o comune"
                        className="velvet-cap-text-input"
                        autoComplete="off"
                      />
                    </div>
                    {citySuggestOpen ? (
                      <ul className="velvet-cap-suggestions" aria-label="Suggerimenti citta e comuni">
                        {cityPlaceSuggestionRows.map((row) => (
                          <li key={row.key}>
                            <button
                              type="button"
                              className="velvet-cap-suggestion-btn"
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
                    className={`velvet-filter-field velvet-cap-field${capCitySuggestions.length > 0 && !capSuggestDismissed ? " velvet-cap-field--suggest-open" : ""}`}
                  >
                    <label htmlFor="velvet-cap" className="velvet-filter-label">
                      CAP
                    </label>
                    <div className="velvet-cap-input-row">
                      <div className="velvet-cap-input-wrap">
                        <input
                          id="velvet-cap"
                          type="text"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          placeholder="CAP"
                          value={capInput}
                          onFocus={() => {
                            setCapSuggestDismissed(false);
                            setCitySuggestDismissed(true);
                          }}
                          onChange={(e) => {
                            setCapInput(e.target.value);
                            if (cityInput.trim()) setCityInput("");
                          }}
                          className="velvet-cap-text-input"
                          aria-describedby={!cityInput.trim() && capDigits.length > 0 ? "velvet-cap-status" : undefined}
                        />
                      </div>
                      {canUseQuickGeolocationTags ? (
                        <button
                          type="button"
                          className="velvet-cap-geo-btn"
                          disabled={geoLoading}
                          aria-busy={geoLoading}
                          title="Compila CAP e comune dalla tua posizione"
                          aria-label="Geolocalizza: compila CAP e comune dalla posizione attuale"
                          onClick={handleGeoLocateForFilters}
                        >
                          {geoLoading ? (
                            <span className="velvet-cap-geo-btn__spinner" aria-hidden />
                          ) : (
                            <svg
                              className="velvet-cap-geo-btn__icon"
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
                      ) : null}
                    </div>
                    {capCitySuggestions.length > 0 && !capSuggestDismissed && (
                      <ul className="velvet-cap-suggestions" aria-label="Suggerimenti localita da CAP">
                        {capCitySuggestions.map((item) => (
                          <li key={`${country}-${item.cap}-${item.city}`}>
                            <button
                              type="button"
                              className="velvet-cap-suggestion-btn"
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
                    {capLen > 0 && !cityInput.trim() && capDigits.length > 0 && (
                      <p id="velvet-cap-status" className="velvet-cap-hint" role="status">
                        {capDigits.length < capLen && (
                          <>CAP: {capDigits.length}/{capLen} cifre — al completamento mostriamo il comune.</>
                        )}
                        {capDigits.length === capLen && capPreview.status === "loading" && <>Ricerca del comune…</>}
                        {capDigits.length === capLen && capPreview.status === "ok" && (
                          <>
                            Citta o comune: <strong>{capPreview.city}</strong>
                          </>
                        )}
                        {capDigits.length === capLen && capPreview.status === "not_found" && (
                          <>Nessun comune trovato per questo CAP e nazione — controlla i dati o scrivi il comune sopra.</>
                        )}
                        {capDigits.length === capLen && capPreview.status === "error" && (
                          <>Verifica del CAP non riuscita. Puoi riprovare o scrivere il comune sopra.</>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="velvet-quick-tags-section">
              <button
                type="button"
                className="velvet-quick-tags-toggle"
                id="velvet-quick-tags-trigger"
                aria-expanded={canUseQuickGeolocationTags ? quickSuggestionsOpen : false}
                aria-controls={canUseQuickGeolocationTags ? "velvet-quick-tags-panel" : undefined}
                disabled={!canUseQuickGeolocationTags}
                title={
                  canUseQuickGeolocationTags
                    ? undefined
                    : "Accedi per trovare il salone più vicino a te"
                }
                onClick={() => {
                  if (!canUseQuickGeolocationTags) return;
                  setQuickSuggestionsOpen((o) => !o);
                }}
              >
                Oppure un tocco
                <span className="velvet-quick-tags-chevron" aria-hidden>
                  ▾
                </span>
              </button>
              {!canUseQuickGeolocationTags ? (
                <p className="velvet-quick-tags-login-hint">
                  {isAuthenticated ? (
                    <>
                      Per trovare il salone più vicino a te serve un account{" "}
                      <strong>cliente</strong>.{" "}
                      <Link to="/registrati" className="velvet-link-inline">
                        Registrati come cliente
                      </Link>{" "}
                      oppure accedi con un profilo cliente.
                    </>
                  ) : (
                    <>
                      <Link to="/account" className="velvet-link-inline">
                        Accedi
                      </Link>{" "}
                      per trovare il salone più vicino a te.
                    </>
                  )}
                </p>
              ) : null}
              {quickSuggestionsOpen && canUseQuickGeolocationTags && (
                <div
                  className="velvet-quick-tags-panel"
                  id="velvet-quick-tags-panel"
                  role="region"
                  aria-labelledby="velvet-quick-tags-trigger"
                >
                  <p className="velvet-quick-tags-near-hint">
                    Con la tua posizione, cerchiamo saloni entro circa <strong>{QUICK_NEAR_RADIUS_KM} km</strong>.
                  </p>
                  {QUICK_SUGGEST_GROUPS.map((group) => (
                    <div key={group.id} className="velvet-quick-tags-group">
                      <p className="velvet-quick-tags-group-label">{group.label}</p>
                      <div className="velvet-quick-tags-row">
                        {group.tags.map((t) => (
                          <button
                            key={t.label}
                            type="button"
                            className="velvet-quick-tag"
                            onClick={() => {
                              void (async () => {
                                if (!mapsAllowed) {
                                  setFormHint(
                                    "Per cercare saloni vicino a te attiva le preferenze «Mappe e geocodifica» in Scelte privacy.",
                                  );
                                  return;
                                }
                                setFormHint(null);
                                setCapLookupSubmitting(true);
                                try {
                                  try {
                                    const { lat, lng } = await requestGeolocationCoords();
                                    lastGeoCoordsRef.current = { lat, lng };
                                    goSearch(t.q, undefined, {
                                      near: { lat, lng, km: QUICK_NEAR_RADIUS_KM },
                                      sortRating: true,
                                      salonClientGenders: t.clientGenders,
                                    });
                                    setQuickSuggestionsOpen(false);
                                    return;
                                  } catch {
                                    setFormHint(
                                      `Per cercare saloni entro circa ${QUICK_NEAR_RADIUS_KM} km serve la posizione del dispositivo. Abilita la geolocalizzazione per questo sito e riprova.`,
                                    );
                                    return;
                                  }
                                } finally {
                                  setCapLookupSubmitting(false);
                                }
                              })();
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        <HeroStoryCarousel nativeApp={isNativeApp} editorialAllowed={editorialAllowed} />
      </section>

      <section className="velvet-trending-section">
        <h2 className="velvet-trending-title">Idee per la tua prossima visita</h2>
        <div className="velvet-trending-groups">
          {trendingGroups.map((group) => (
            <div key={group.id} className="velvet-trending-group">
              <h3 className="velvet-trending-subtitle">{group.heading}</h3>
              <div className={trendingGridClass}>
                {group.items.map((t) => (
                  <Link
                    key={t.id}
                    to={`/idee/${group.id}/${t.id}`}
                    className={`velvet-trend-card${editorialAllowed ? " velvet-trend-card--photo" : ""}`}
                    style={
                      editorialAllowed
                        ? { backgroundImage: trendCardBg(t.image) }
                        : { background: "linear-gradient(165deg, #431407 0%, #7c2d12 55%, #1c0a06 100%)" }
                    }
                    aria-label={`${t.title}. ${t.imageAlt}`}
                  >
                    <span className="velvet-trend-card-label" aria-hidden="true">
                      {t.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="velvet-partner-strip" aria-labelledby="velvet-partner-heading">
        <div className="velvet-partner-wave" aria-hidden />
        <div className="velvet-partner-inner">
          <div className="velvet-partner-copy">
            <h2 id="velvet-partner-heading" className="velvet-partner-title">
              Hai un salone? Portalo tra i professionisti su Saloni Luxury.
            </h2>
            <p className="velvet-partner-lead">
              Aumenta la visibilità, gestisci gli appuntamenti e fatti prenotare online da clienti che cercano
              parrucchieri, centri benessere ed estetica nella loro zona — con un&apos;esperienza chiara per te e per chi
              entra in salone.
            </p>
            <div className="velvet-partner-cta-row">
              <Link to="/registrati" className="velvet-partner-cta">
                Registrati come cliente
              </Link>
              <PartnerSignupLink className="velvet-partner-cta velvet-partner-cta--plans">
                Diventa partner (salone)
              </PartnerSignupLink>
            </div>
          </div>
          <div className="velvet-partner-visual" aria-hidden>
            <div className="velvet-partner-device velvet-partner-device--tablet">
              <div className="velvet-partner-cal-bar" />
              <div className="velvet-partner-cal-cells">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span key={i} className={`velvet-partner-slot velvet-partner-slot--${(i % 4) + 1}`} />
                ))}
              </div>
            </div>
            <div className="velvet-partner-device velvet-partner-device--phone">
              <div className="velvet-partner-toast">
                <span className="velvet-partner-toast-dot" />
                Nuova prenotazione
                <span className="velvet-partner-toast-meta">Oggi · 15:00</span>
              </div>
              <div className="velvet-partner-phone-body">
                <div className="velvet-partner-cal-bar velvet-partner-cal-bar--sm" />
                <div className="velvet-partner-cal-cells velvet-partner-cal-cells--sm">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} className={`velvet-partner-slot velvet-partner-slot--${(i % 3) + 1}`} />
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
