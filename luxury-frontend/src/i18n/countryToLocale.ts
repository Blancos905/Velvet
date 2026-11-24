import { DEFAULT_UI_LOCALE, type UiLocale } from "./locales";

/**
 * Paese ISO alpha-2 → lingua UI.
 * Paesi plurilingue: default commerciale più usato (BE→fr, CH→de, CA→en).
 * Non mappati → inglese (mercato internazionale) tranne IT/SM → italiano.
 */
const EXPLICIT: Record<string, UiLocale> = {
  IT: "it",
  SM: "it",
  VA: "it",
  GB: "en",
  IE: "en",
  US: "en",
  AU: "en",
  NZ: "en",
  MT: "en",
  CA: "en",
  FR: "fr",
  BE: "fr",
  LU: "fr",
  MC: "fr",
  SN: "fr",
  CI: "fr",
  CM: "fr",
  MA: "fr",
  TN: "fr",
  DZ: "fr",
  RE: "fr",
  GP: "fr",
  MQ: "fr",
  GF: "fr",
  DE: "de",
  AT: "de",
  LI: "de",
  CH: "de",
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  UY: "es",
  VE: "es",
  EC: "es",
  BO: "es",
  PY: "es",
  CR: "es",
  PA: "es",
  GT: "es",
  HN: "es",
  SV: "es",
  NI: "es",
  DO: "es",
  CU: "es",
  PR: "es",
  PT: "pt",
  BR: "pt",
  AO: "pt",
  MZ: "pt",
  CV: "pt",
};

export function localeFromCountryCode(countryCode: string): UiLocale {
  const cc = countryCode.trim().toUpperCase();
  if (!cc) return DEFAULT_UI_LOCALE;
  return EXPLICIT[cc] ?? "en";
}
