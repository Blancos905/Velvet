/** Preferenze cookie / tecnologie simili (Linee guida Garante 2021). */

export const COOKIE_CONSENT_STORAGE_KEY = "velvet.cookie-consent.v2";

export type CookieConsentCategory = "necessary" | "maps" | "editorial";

export type CookieConsentPreferences = {
  version: 2;
  /** ISO timestamp della scelta. */
  decidedAt: string;
  necessary: true;
  maps: boolean;
  editorial: boolean;
};

export function defaultCookieConsent(): CookieConsentPreferences {
  return {
    version: 2,
    decidedAt: new Date().toISOString(),
    necessary: true,
    maps: false,
    editorial: false,
  };
}

export function acceptAllCookieConsent(): CookieConsentPreferences {
  return {
    version: 2,
    decidedAt: new Date().toISOString(),
    necessary: true,
    maps: true,
    editorial: true,
  };
}

export function readCookieConsent(): CookieConsentPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsentPreferences>;
    if (parsed.version !== 2) return null;
    return {
      version: 2,
      decidedAt: typeof parsed.decidedAt === "string" ? parsed.decidedAt : new Date().toISOString(),
      necessary: true,
      maps: Boolean(parsed.maps),
      editorial: Boolean(parsed.editorial),
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(prefs: CookieConsentPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("velvet:cookie-consent", { detail: prefs }));
  } catch {
    /* ignore quota / private mode */
  }
}

export function hasCookieConsentDecision(): boolean {
  return readCookieConsent() != null;
}

export function isCookieCategoryAllowed(category: Exclude<CookieConsentCategory, "necessary">): boolean {
  const prefs = readCookieConsent();
  if (!prefs) return false;
  return prefs[category];
}
