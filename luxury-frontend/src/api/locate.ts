import { apiFetch } from "./client";

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

/** Risultato geocoding inverso (coordinate → comune, CAP se presente, paese). */
export type ReverseLocateResult = {
  city: string;
  postalCode: string | null;
  countryCode: string;
  displayName: string;
};

/**
 * Posizione approssimata della connessione (IP pubblico).
 * Usata dal PC quando il browser non espone il GPS (HTTP non sicuro, oppure posizione di rete assente).
 * 404 → null.
 */
export async function locateByNetwork(): Promise<{ lat: number; lng: number } | null> {
  const r = await apiFetch("/api/v1/public/locate-by-network");
  if (r.status === 404) return null;
  const text = await r.text();
  if (!r.ok) {
    throw new Error(text || r.statusText);
  }
  const data = (text ? JSON.parse(text) : {}) as { lat?: unknown; lng?: unknown };
  if (typeof data.lat !== "number" || typeof data.lng !== "number") return null;
  if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) return null;
  return { lat: data.lat, lng: data.lng };
}

/** Backend reverse: lat/lon → indirizzo strutturato. */
export async function reverseLocate(lat: number, lon: number): Promise<ReverseLocateResult | null> {
  const p = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  const r = await apiFetch(`/api/v1/public/locate-by-coordinates?${p.toString()}`);
  if (r.status === 404) return null;
  const text = await r.text();
  if (!r.ok) {
    throw new Error(text || r.statusText);
  }
  return JSON.parse(text) as ReverseLocateResult;
}

/** Suggerimenti città/comune/paese per nazione selezionata (backend → Nominatim). */
export async function locateByPlace(
  query: string,
  countryCode: string,
  limit = 8,
): Promise<PlaceLocateSuggestion[]> {
  const p = new URLSearchParams({ query, countryCode, limit: String(limit) });
  const r = await apiFetch(`/api/v1/public/locate-by-place?${p.toString()}`);
  const text = await r.text();
  if (!r.ok) {
    throw new Error(text || r.statusText);
  }
  return text ? (JSON.parse(text) as PlaceLocateSuggestion[]) : [];
}

export async function locateByPostalSuggestions(
  postalCode: string,
  countryCode: string,
  limit = 8,
): Promise<PlaceLocateSuggestion[]> {
  const p = new URLSearchParams({ postalCode, countryCode, limit: String(limit) });
  const r = await apiFetch(`/api/v1/public/locate-by-postal-suggestions?${p.toString()}`);
  const text = await r.text();
  if (!r.ok) {
    throw new Error(text || r.statusText);
  }
  return text ? (JSON.parse(text) as PlaceLocateSuggestion[]) : [];
}
