import { createContext, useContext } from "react";
import type { UiLocale } from "./locales";
import type { MessageKey } from "./messages";

export type LuxuryLocaleContextValue = {
  locale: UiLocale;
  /** True quando la sessione account impone `preferredLocale` dal profilo. */
  profileLocaleLocked: boolean;
  setLocale: (locale: UiLocale) => void;
  /** Imposta lingua UI in base al paese ISO (menu Nazioni / geolocalizzazione). Ignorato se il profilo è bloccato. */
  setLocaleFromCountry: (countryCode: string) => void;
  /** Come `setLocaleFromCountry` ma sempre attivo (form registrazione prima del login). */
  setLocaleFromCountryForRegistration: (countryCode: string) => void;
  lockProfileLocale: (locale: UiLocale) => void;
  unlockProfileLocale: () => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

export const LuxuryLocaleContext = createContext<LuxuryLocaleContextValue | null>(null);

export function useLuxuryLocale(): LuxuryLocaleContextValue {
  const ctx = useContext(LuxuryLocaleContext);
  if (!ctx) {
    throw new Error("useLuxuryLocale must be used within LuxuryLocaleProvider");
  }
  return ctx;
}

/** Traduzione: stesso contesto, nome corto per i componenti. */
export function useLuxuryT(): LuxuryLocaleContextValue["t"] {
  return useLuxuryLocale().t;
}
