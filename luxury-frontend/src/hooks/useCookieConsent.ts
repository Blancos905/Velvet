import { useEffect, useState } from "react";
import {
  hasCookieConsentDecision,
  isCookieCategoryAllowed,
  readCookieConsent,
  type CookieConsentPreferences,
} from "../lib/cookieConsent";
import { isLuxuryNativeAppShell } from "./useLuxuryNativeAppShell";

export function useCookieConsent(): CookieConsentPreferences | null {
  const [prefs, setPrefs] = useState<CookieConsentPreferences | null>(() => readCookieConsent());

  useEffect(() => {
    const sync = () => setPrefs(readCookieConsent());
    sync();
    window.addEventListener("luxury:cookie-consent", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("luxury:cookie-consent", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return prefs;
}

export function useMapsCookieAllowed(): boolean {
  // WebView app: anteprima mappa e ricerca geo sono funzioni core (iframe + geocodifica).
  if (isLuxuryNativeAppShell()) return true;
  const prefs = useCookieConsent();
  if (!prefs) return false;
  return isCookieCategoryAllowed("maps");
}

export function useEditorialCookieAllowed(): boolean {
  const prefs = useCookieConsent();
  if (!prefs) return false;
  return isCookieCategoryAllowed("editorial");
}

export function useNeedsCookieConsent(): boolean {
  const [needed, setNeeded] = useState(() => !hasCookieConsentDecision());

  useEffect(() => {
    const sync = () => setNeeded(!hasCookieConsentDecision());
    sync();
    window.addEventListener("luxury:cookie-consent", sync);
    return () => window.removeEventListener("luxury:cookie-consent", sync);
  }, []);

  return needed;
}
