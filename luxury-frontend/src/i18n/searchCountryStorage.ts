import { SEARCH_COUNTRY_STORAGE_KEY } from "./locales";

export function readStoredSearchCountry(): string | null {
  try {
    const raw = localStorage.getItem(SEARCH_COUNTRY_STORAGE_KEY);
    if (raw && /^[A-Z]{2}$/.test(raw)) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function persistSearchCountry(countryCode: string): void {
  const cc = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return;
  try {
    localStorage.setItem(SEARCH_COUNTRY_STORAGE_KEY, cc);
  } catch {
    /* ignore */
  }
}
