import type { UiLocale } from "./locales";

const BCP47: Record<UiLocale, string> = {
  it: "it-IT",
  en: "en-GB",
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES",
  pt: "pt-PT",
};

export function intlLocaleForUi(locale: UiLocale): string {
  return BCP47[locale];
}
