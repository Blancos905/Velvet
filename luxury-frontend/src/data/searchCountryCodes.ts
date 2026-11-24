/**
 * Paesi nel menu «Nazioni» (home / Affina la zona): set essenziale (~15).
 * Non è l'elenco ISO completo (`countries.json` → `ALL_COUNTRIES`).
 */
export const SEARCH_COUNTRY_CODES: readonly string[] = [
  // Italia e area immediata
  "IT",
  "SM",
  "CH",
  // Europa occidentale
  "FR",
  "DE",
  "AT",
  "ES",
  "PT",
  "GB",
  "NL",
  "BE",
  // Principali mercati extra-UE
  "US",
  "CA",
  "BR",
  "AU",
  "AE",
] as const;

export type SearchCountryCode = (typeof SEARCH_COUNTRY_CODES)[number];

const SEARCH_COUNTRY_CODE_SET = new Set<string>(SEARCH_COUNTRY_CODES);

export function isSearchCountryCode(code: string): boolean {
  return SEARCH_COUNTRY_CODE_SET.has(code.trim().toUpperCase());
}
