import { isLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";
import {
  readCookieConsent,
  writeCookieConsent,
} from "./cookieConsent";

export type GeolocationEnvCheck =
  | { ok: true }
  | { ok: false; message: string };

/** Consenso «Mappe e geocodifica» al click esplicito su geolocalizza (azione informativa). */
export function grantMapsConsentForExplicitGeolocation(): void {
  if (isLuxuryNativeAppShell()) return;
  const existing = readCookieConsent();
  if (existing?.maps) return;
  writeCookieConsent(
    {
      version: 2,
      decidedAt: new Date().toISOString(),
      necessary: true,
      maps: true,
      editorial: existing?.editorial ?? false,
    },
    "custom",
  );
}

export function checkGeolocationEnvironment(): GeolocationEnvCheck {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return {
      ok: false,
      message: "Il browser non supporta la geolocalizzazione.",
    };
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return {
      ok: false,
      message:
        "La geolocalizzazione richiede una connessione sicura (HTTPS o localhost). Apri saloniluxury.it o usa localhost in sviluppo.",
    };
  }
  return { ok: true };
}

export function requestGeolocationCoords(
  options?: PositionOptions,
): Promise<{ lat: number; lng: number }> {
  const env = checkGeolocationEnvironment();
  if (!env.ok) {
    return Promise.reject(new Error(env.message));
  }

  grantMapsConsentForExplicitGeolocation();

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      options ?? { enableHighAccuracy: true, timeout: 18_000, maximumAge: 120_000 },
    );
  });
}

export function geolocationErrorMessage(err: unknown): string {
  const code = (err as GeolocationPositionError)?.code;
  if (code === 1) {
    return "Permesso posizione negato. Abilita la posizione per questo sito e riprova.";
  }
  if (code === 2) {
    return "Posizione del dispositivo non disponibile.";
  }
  if (code === 3) {
    return "Richiesta posizione in timeout. Riprova.";
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return "Impossibile ottenere la posizione.";
}
