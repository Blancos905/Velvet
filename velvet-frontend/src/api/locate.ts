import { apiFetch } from "./client";
import { apiBaseUrl } from "../config/env";

export type PostalLocateResponse = {
  city: string;
  countryCode: string;
  countryName: string | null;
  displayName: string;
};

export type PlaceLocateSuggestion = {
  name: string;
  displayName: string;
  countryCode: string;
  countryName: string | null;
};

let placeEndpointAvailable: boolean | null = null;

/** Risolve CAP + paese in comune (backend → Nominatim). 404 → null. */
export async function locateByPostal(
  postalCode: string,
  countryCode: string,
): Promise<PostalLocateResponse | null> {
  const p = new URLSearchParams({ postalCode, countryCode });
  const r = await apiFetch(`/api/v1/public/locate-by-postal?${p.toString()}`);
  if (r.status === 404) return null;
  const text = await r.text();
  if (!r.ok) {
    throw new Error(text || r.statusText);
  }
  return JSON.parse(text) as PostalLocateResponse;
}

function nominatimSearchUrl(searchParams: URLSearchParams): string {
  const qs = searchParams.toString();
  // Dev con path relativi (proxy Vite): stesso origin → niente CORS. In build con API assoluta → solo backend.
  if (import.meta.env.DEV && !apiBaseUrl) {
    return `/nominatim/search?${qs}`;
  }
  return `https://nominatim.openstreetmap.org/search?${qs}`;
}

function nominatimReverseUrl(searchParams: URLSearchParams): string {
  const qs = searchParams.toString();
  if (import.meta.env.DEV && !apiBaseUrl) {
    return `/nominatim/reverse?${qs}`;
  }
  return `https://nominatim.openstreetmap.org/reverse?${qs}`;
}

/** Risultato geocoding inverso (coordinate → comune, CAP se presente, paese). */
export type ReverseLocateResult = {
  city: string;
  postalCode: string | null;
  countryCode: string;
  displayName: string;
};

/** Nominatim reverse: lat/lon → indirizzo strutturato (dev via proxy Vite). */
export async function reverseLocate(lat: number, lon: number): Promise<ReverseLocateResult | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "json",
    addressdetails: "1",
    zoom: "18",
  });
  const res = await fetch(nominatimReverseUrl(params), { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const hit = (await res.json()) as {
    display_name?: string;
    address?: Record<string, string | undefined>;
  };
  const a = hit.address ?? {};
  const pickCity =
    a.city ??
    a.town ??
    a.village ??
    a.municipality ??
    a.hamlet ??
    a.suburb ??
    a.county ??
    a.state;
  let city = typeof pickCity === "string" ? pickCity.trim() : "";
  if (!city && typeof hit.display_name === "string" && hit.display_name.trim()) {
    const dn = hit.display_name.trim();
    const comma = dn.indexOf(",");
    city = comma > 0 ? dn.slice(0, comma).trim() : dn;
  }
  if (!city) return null;
  const rawPost = typeof a.postcode === "string" ? a.postcode.trim() : "";
  const postalCode = rawPost || null;
  const countryCode = (typeof a.country_code === "string" ? a.country_code : "").trim().toUpperCase();
  return {
    city,
    postalCode,
    countryCode,
    displayName: typeof hit.display_name === "string" && hit.display_name.trim() ? hit.display_name.trim() : city,
  };
}

/** Chiamata Nominatim lato browser (solo dev con proxy, o se CORS consente). */
async function fetchNominatimPlaceSuggestions(
  query: string,
  countryCode: string,
  limit: number,
): Promise<PlaceLocateSuggestion[]> {
  const nominatimParams = new URLSearchParams({
    q: query.trim(),
    countrycodes: countryCode.trim().toLowerCase(),
    format: "json",
    addressdetails: "1",
    limit: String(limit),
  });
  const nominatimRes = await fetch(nominatimSearchUrl(nominatimParams), {
    headers: { Accept: "application/json" },
  });
  if (!nominatimRes.ok) {
    return [];
  }
  const raw = (await nominatimRes.json()) as Array<{
    name?: string;
    display_name?: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      hamlet?: string;
      suburb?: string;
      county?: string;
      state?: string;
      country?: string;
      country_code?: string;
    };
  }>;
  const out: PlaceLocateSuggestion[] = [];
  const dedupe = new Set<string>();
  for (const hit of raw) {
    const a = hit.address ?? {};
    let name =
      a.city ??
      a.town ??
      a.village ??
      a.municipality ??
      a.hamlet ??
      a.suburb ??
      a.county ??
      a.state ??
      a.country;
    if (!name && typeof hit.name === "string" && hit.name.trim()) {
      name = hit.name.trim();
    }
    if (!name && typeof hit.display_name === "string" && hit.display_name.trim()) {
      const dn = hit.display_name.trim();
      const comma = dn.indexOf(",");
      name = comma > 0 ? dn.slice(0, comma).trim() : dn;
    }
    if (!name) continue;
    const key = name.trim().toLowerCase();
    if (!key || dedupe.has(key)) continue;
    dedupe.add(key);
    out.push({
      name: name.trim(),
      displayName: hit.display_name ?? name.trim(),
      countryCode: (a.country_code ?? countryCode).toUpperCase(),
      countryName: a.country ?? null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

async function fetchNominatimPostalSuggestions(
  postalCode: string,
  countryCode: string,
  limit: number,
): Promise<PlaceLocateSuggestion[]> {
  const extractSuggestions = (
    raw: Array<{
      name?: string;
      display_name?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        hamlet?: string;
        suburb?: string;
        county?: string;
        state?: string;
        country?: string;
        country_code?: string;
      };
    }>,
    out: PlaceLocateSuggestion[],
    dedupe: Set<string>,
  ) => {
    for (const hit of raw) {
      const a = hit.address ?? {};
      const name =
        a.city ??
        a.town ??
        a.village ??
        a.municipality ??
        a.hamlet ??
        a.suburb ??
        a.county ??
        (typeof hit.name === "string" ? hit.name : undefined);
      if (!name) continue;
      const key = name.trim().toLowerCase();
      if (!key || dedupe.has(key)) continue;
      dedupe.add(key);
      out.push({
        name: name.trim(),
        displayName: hit.display_name ?? name.trim(),
        countryCode: (a.country_code ?? countryCode).toUpperCase(),
        countryName: a.country ?? null,
      });
      if (out.length >= limit) break;
    }
  };

  const runSearch = async (params: URLSearchParams) => {
    const res = await fetch(nominatimSearchUrl(params), { headers: { Accept: "application/json" } });
    if (!res.ok) return [] as Array<{
      name?: string;
      display_name?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        hamlet?: string;
        suburb?: string;
        county?: string;
        state?: string;
        country?: string;
        country_code?: string;
      };
    }>;
    return (await res.json()) as Array<{
    name?: string;
    display_name?: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      hamlet?: string;
      suburb?: string;
      county?: string;
      state?: string;
      country?: string;
      country_code?: string;
    };
    }>;
  };

  // 1) Ricerca specifica per CAP
  const byPostal = await runSearch(
    new URLSearchParams({
      postalcode: postalCode.trim(),
      countrycodes: countryCode.trim().toLowerCase(),
      format: "json",
      addressdetails: "1",
      limit: String(limit),
    }),
  );
  const out: PlaceLocateSuggestion[] = [];
  const dedupe = new Set<string>();
  extractSuggestions(byPostal, out, dedupe);

  // 2) Fallback aggiuntivo per CAP condivisi: query testuale "CAP + paese"
  if (out.length < limit) {
    const byText = await runSearch(
      new URLSearchParams({
        q: `${postalCode.trim()} ${countryCode.trim().toUpperCase()}`,
        countrycodes: countryCode.trim().toLowerCase(),
        format: "json",
        addressdetails: "1",
        limit: String(limit),
      }),
    );
    extractSuggestions(byText, out, dedupe);
  }

  return out;
}

/** Suggerimenti città/comune/paese per nazione selezionata (backend → Nominatim). */
export async function locateByPlace(
  query: string,
  countryCode: string,
  limit = 8,
): Promise<PlaceLocateSuggestion[]> {
  const p = new URLSearchParams({ query, countryCode, limit: String(limit) });
  if (placeEndpointAvailable === false) {
    return fetchNominatimPlaceSuggestions(query, countryCode, limit);
  }
  const r = await apiFetch(`/api/v1/public/locate-by-place?${p.toString()}`);

  let fromBackend: PlaceLocateSuggestion[] = [];
  if (r.ok) {
    placeEndpointAvailable = true;
    const text = await r.text();
    fromBackend = text ? (JSON.parse(text) as PlaceLocateSuggestion[]) : [];
  } else if (r.status !== 404) {
    const text = await r.text();
    throw new Error(text || r.statusText);
  } else {
    placeEndpointAvailable = false;
  }

  if (fromBackend.length > 0) {
    return fromBackend.slice(0, limit);
  }

  // Backend assente (404), vuoto, o parsing troppo stretto: integrazione Nominatim (in dev via proxy Vite).
  const fromNom = await fetchNominatimPlaceSuggestions(query, countryCode, limit);
  return fromNom.slice(0, limit);
}

export async function locateByPostalSuggestions(
  postalCode: string,
  countryCode: string,
  limit = 8,
): Promise<PlaceLocateSuggestion[]> {
  // Per evitare spam 404 quando il backend non espone ancora l'endpoint dedicato,
  // usiamo direttamente Nominatim per i suggerimenti CAP.
  return fetchNominatimPostalSuggestions(postalCode, countryCode, limit);
}
