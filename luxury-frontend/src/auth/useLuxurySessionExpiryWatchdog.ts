import { useEffect } from "react";
import { isLuxuryAccessTokenExpired, readJwtExpirationEpochMs } from "../lib/luxuryAccessTokenExpiry";

/** Rimuove token scaduto e richiama `onExpired` al momento della scadenza (o al ritorno sul tab). */
export function useLuxurySessionExpiryWatchdog(
  accessToken: string | undefined,
  onExpired: () => void,
): void {
  useEffect(() => {
    if (!accessToken) return;

    const runCheck = (): boolean => {
      if (isLuxuryAccessTokenExpired(accessToken)) {
        onExpired();
        return true;
      }
      return false;
    };

    if (runCheck()) return;

    const expMs = readJwtExpirationEpochMs(accessToken);
    if (expMs == null) return;

    const delay = Math.max(0, expMs - Date.now() + 50);
    const timer = window.setTimeout(runCheck, delay);

    const onResume = () => {
      runCheck();
    };
    window.addEventListener("focus", onResume);
    document.addEventListener("visibilitychange", onResume);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", onResume);
      document.removeEventListener("visibilitychange", onResume);
    };
  }, [accessToken, onExpired]);
}
