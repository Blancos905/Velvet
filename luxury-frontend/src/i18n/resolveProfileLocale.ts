import { localeFromCountryCode } from "./countryToLocale";
import { DEFAULT_UI_LOCALE, isUiLocale, type UiLocale } from "./locales";

/** Lingua account da profilo JWT — `preferredLocale` ha priorità su `country`. */
export function resolveProfileLocale(
  preferredLocale: string | null | undefined,
  countryCode: string | null | undefined,
): UiLocale {
  const raw = preferredLocale?.trim().toLowerCase();
  if (raw && isUiLocale(raw)) return raw;
  if (countryCode?.trim()) return localeFromCountryCode(countryCode);
  return DEFAULT_UI_LOCALE;
}
