import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { localeFromCountryCode } from "./countryToLocale";
import {
  DEFAULT_UI_LOCALE,
  isUiLocale,
  UI_LOCALE_STORAGE_KEY,
  type UiLocale,
} from "./locales";
import { translateMessage, type MessageKey } from "./messages";
import { LuxuryLocaleContext } from "./useLuxuryLocale";

function readStoredLocale(): UiLocale {
  try {
    const raw = localStorage.getItem(UI_LOCALE_STORAGE_KEY);
    if (raw && isUiLocale(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_UI_LOCALE;
}

function persistLocale(locale: UiLocale): void {
  try {
    localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

function applyDocumentLang(locale: UiLocale): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
}

export function LuxuryLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<UiLocale>(() => readStoredLocale());
  const [profileLocaleLocked, setProfileLocaleLocked] = useState(false);
  const profileLocaleLockedRef = useRef(false);

  useEffect(() => {
    applyDocumentLang(locale);
  }, [locale]);

  const setLocale = useCallback((next: UiLocale) => {
    if (profileLocaleLockedRef.current) return;
    setLocaleState(next);
    persistLocale(next);
    applyDocumentLang(next);
  }, []);

  const setLocaleFromCountry = useCallback(
    (countryCode: string) => {
      if (profileLocaleLockedRef.current) return;
      setLocale(localeFromCountryCode(countryCode));
    },
    [setLocale],
  );

  const lockProfileLocale = useCallback((next: UiLocale) => {
    profileLocaleLockedRef.current = true;
    setProfileLocaleLocked(true);
    setLocaleState(next);
    persistLocale(next);
    applyDocumentLang(next);
  }, []);

  const unlockProfileLocale = useCallback(() => {
    profileLocaleLockedRef.current = false;
    setProfileLocaleLocked(false);
  }, []);

  const setLocaleFromCountryForRegistration = useCallback((countryCode: string) => {
    const next = localeFromCountryCode(countryCode);
    setLocaleState(next);
    persistLocale(next);
    applyDocumentLang(next);
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translateMessage(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      profileLocaleLocked,
      setLocale,
      setLocaleFromCountry,
      setLocaleFromCountryForRegistration,
      lockProfileLocale,
      unlockProfileLocale,
      t,
    }),
    [
      locale,
      profileLocaleLocked,
      setLocale,
      setLocaleFromCountry,
      setLocaleFromCountryForRegistration,
      lockProfileLocale,
      unlockProfileLocale,
      t,
    ],
  );

  return <LuxuryLocaleContext.Provider value={value}>{children}</LuxuryLocaleContext.Provider>;
}
