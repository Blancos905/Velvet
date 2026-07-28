import { isLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";

/** Header opzionale: allinea i link email al origin della WebView app (dev LAN). */
export function registrationApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined" && isLuxuryNativeAppShell()) {
    headers["X-Luxury-Frontend-Origin"] = window.location.origin;
  }
  return headers;
}
