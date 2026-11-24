import { locateByNetwork } from "../api/locate";
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

/** WebView Flutter: bridge in `luxury_geolocation_web_bridge.dart` (geo nativa anche su HTTP LAN). */
function hasNativeGeolocationBridge(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as Window & { __luxuryNativeGeolocationInstalled?: boolean })
      .__luxuryNativeGeolocationInstalled,
  );
}

/** Attende il bridge JS (installato in onPageFinished) prima di chiamare getCurrentPosition. */
async function waitForNativeGeolocationBridge(timeoutMs = 2500): Promise<void> {
  if (!isLuxuryNativeAppShell() || hasNativeGeolocationBridge()) return;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (hasNativeGeolocationBridge()) return;
    await new Promise((r) => setTimeout(r, 40));
  }
}

/** PC: niente GPS. La posizione di rete (Wi‑Fi) risponde; l’alta precisione va in timeout. */
const DESKTOP_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 12_000,
  maximumAge: 300_000,
};

const MOBILE_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 18_000,
  maximumAge: 120_000,
};

const NETWORK_POSITION_UNAVAILABLE = "Posizione del dispositivo non disponibile.";

function prefersDesktopNetworkGeolocation(): boolean {
  if (isLuxuryNativeAppShell() || hasNativeGeolocationBridge()) return false;
  if (typeof navigator === "undefined") return true;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (typeof uaData?.mobile === "boolean") return !uaData.mobile;
  return !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    navigator.userAgent || "",
  );
}

function readBrowserPosition(options: PositionOptions): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      options,
    );
  });
}

function isPermissionDenied(err: unknown): boolean {
  return (err as GeolocationPositionError)?.code === 1;
}

/** Posizione approssimata della connessione, quando il browser non può dare il GPS. */
async function locateFromNetworkOrThrow(): Promise<{ lat: number; lng: number }> {
  try {
    const coords = await locateByNetwork();
    if (!coords) throw new Error(NETWORK_POSITION_UNAVAILABLE);
    return coords;
  } catch (err) {
    if (err instanceof Error && err.message === NETWORK_POSITION_UNAVAILABLE) throw err;
    throw new Error(NETWORK_POSITION_UNAVAILABLE);
  }
}

export function checkGeolocationEnvironment(): GeolocationEnvCheck {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return {
      ok: false,
      message: "Il browser non supporta la geolocalizzazione.",
    };
  }
  // Browser su HTTP non-localhost: API geo bloccata. Nell'app nativa il bridge Flutter
  // sostituisce getCurrentPosition → posizione dispositivo anche su http://192.168.x.x.
  if (
    typeof window !== "undefined" &&
    !window.isSecureContext &&
    !isLuxuryNativeAppShell() &&
    !hasNativeGeolocationBridge()
  ) {
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
  // Su iPhone getCurrentPosition vale solo nello stesso turno del tap.
  // Un await prima (anche già risolto) fa scadere il gesto e la richiesta non parte.
  if (isLuxuryNativeAppShell() && !hasNativeGeolocationBridge()) {
    return waitForNativeGeolocationBridge().then(() => requestGeolocationCoords(options));
  }

  grantMapsConsentForExplicitGeolocation();

  const env = checkGeolocationEnvironment();
  const native = isLuxuryNativeAppShell() || hasNativeGeolocationBridge();
  // Browser su http://192.168.x.x (PC in LAN): l’API GPS è disabilitata. Si usa l’IP pubblico.
  if (!env.ok) {
    if (!native) {
      return locateFromNetworkOrThrow().catch(() => {
        throw new Error(env.message);
      });
    }
    return Promise.reject(new Error(env.message));
  }

  const desktop = prefersDesktopNetworkGeolocation();
  const primary = options ?? (desktop ? DESKTOP_GEO_OPTIONS : MOBILE_GEO_OPTIONS);
  const firstFix = readBrowserPosition(primary);
  return firstFix.catch(async (err) => {
    if (isPermissionDenied(err)) throw err;
    if (primary.enableHighAccuracy) {
      try {
        return await readBrowserPosition(DESKTOP_GEO_OPTIONS);
      } catch (retryErr) {
        if (isPermissionDenied(retryErr) || native) throw retryErr;
        try {
          return await locateFromNetworkOrThrow();
        } catch {
          throw retryErr;
        }
      }
    }
    if (!native) {
      try {
        return await locateFromNetworkOrThrow();
      } catch {
        throw err;
      }
    }
    throw err;
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
