/** Lingue UI supportate (v1). Altri paesi mappano qui via `countryToLocale`. */
export const UI_LOCALES = ["it", "en", "fr", "de", "es", "pt"] as const;

export type UiLocale = (typeof UI_LOCALES)[number];

export const DEFAULT_UI_LOCALE: UiLocale = "it";

export const UI_LOCALE_STORAGE_KEY = "luxury_ui_locale";
export const SEARCH_COUNTRY_STORAGE_KEY = "luxury_search_country";

export function isUiLocale(value: string): value is UiLocale {
  return (UI_LOCALES as readonly string[]).includes(value);
}
