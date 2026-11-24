import type { UiLocale } from "./locales";

/** Nome paese localizzato (Intl.DisplayNames) — es. FR + locale `fr` → «France». */
export function localizedCountryName(countryCode: string, locale: UiLocale, fallback: string): string {
  const cc = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return fallback;
  try {
    const dn = new Intl.DisplayNames([locale], { type: "region" });
    return dn.of(cc) ?? fallback;
  } catch {
    return fallback;
  }
}
